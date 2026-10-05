import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// Controlled request/response contracts only. No live model call or accuracy claim.
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild');
const temp=await mkdtemp(join(tmpdir(),'madar-context-model-'));
const originalFetch=globalThis.fetch,originalTimeout=AbortSignal.timeout,originalError=console.error;
const requests=[],timeouts=[],expectedErrors=[];
let reply,replyStatus=200,passed=0;
const source={id:'publisher-fixture',publisher:'ICADB.com',language:'zh',sourceType:'text',title:'Publisher fixture',hadith:'这是来源发布的原文。',explanation:'Published explanation.',grade:'',attribution:'ICADB.com',references:[],canonicalUrl:'https://icadb.com/',apiUrl:'https://icadb.com/',retrievedAt:'2026-10-04T00:00:00Z',contentVersion:'1',accessMode:'live'};
const evidence=[{source,excerpt:source.hadith,kind:'hadith',score:0}];
const row={id:source.id,relevance:96,directAnswer:true,allConstraints:true,quote:source.hadith,kind:'hadith'};
const completed=(items=[row],requiresReview=false)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({requiresReview,items})}]}]});
const test=async(name,run)=>{await run();passed++;console.log('PASS',name);};
try{
 const out=join(temp,'context.mjs');
 await build({stdin:{contents:"export * from './lib/context-ranking';",resolveDir:process.cwd()},outfile:out,bundle:true,platform:'node',format:'esm',plugins:[{name:'runtime',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'runtime',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env={};'}));}}]});
 const p=await import(pathToFileURL(out));
 AbortSignal.timeout=ms=>{timeouts.push(ms);return new AbortController().signal;};
 console.error=(...args)=>expectedErrors.push(args);
 globalThis.fetch=async(url,options)=>{requests.push({url:String(url),options,body:JSON.parse(options.body)});return new Response(JSON.stringify(reply),{status:replyStatus,headers:{'Content-Type':'application/json'}});};

 await test('Astra readiness does not activate or request a model without a key',async()=>{
  const before=requests.length,r=await p.rankByContext('Missing credential fixture',evidence,{});
  assert.deepEqual(r,{evidence:[],mode:'context-unavailable'});assert.equal(requests.length,before);
 });
 await test('Actual default request uses Astra high, strict JSON and bounded reasoning budget',async()=>{
  reply=completed();const r=await p.rankByContext('中文上下文测试样例',evidence,{key:'test-key-not-a-real-secret'}),request=requests.at(-1),body=request.body;
  assert.equal(request.url,'https://api.openai.com/v1/responses');assert.equal(request.options.method,'POST');assert.equal(request.options.redirect,'manual');
  assert.equal(body.model,'gpt-6-astra');assert.deepEqual(body.reasoning,{effort:'high'});assert.equal(body.max_output_tokens,25000);assert.equal(timeouts.at(-1),60000);assert.equal(body.store,false);
  assert.equal(body.text.format.type,'json_schema');assert.equal(body.text.format.strict,true);assert.equal(body.text.format.schema.additionalProperties,false);
  const scale=body.text.format.schema.properties.items.items.properties.relevance;
  assert.equal(scale.minimum,0);assert.equal(scale.maximum,100);assert.match(scale.description,/0–100/);assert.match(body.instructions,/85–100/);assert.match(body.instructions,/95–100/);
  for(const field of ['temperature','top_p','tools'])assert.equal(Object.hasOwn(body,field),false);
  const input=JSON.parse(body.input);assert.equal(input.documents[0].language,'zh');assert.equal(input.documents[0].hadith,source.hadith);
  assert.equal(r.mode,'semantic');assert.equal(r.evidence[0].excerpt,source.hadith);
 });
 await test('Legacy and chat overrides omit unsupported reasoning parameters',async()=>{
  for(const model of ['gpt-4.1-mini','gpt-4o-2024-08-06','gpt-5-chat-latest','custom-model']){
   reply=completed();await p.rankByContext(`Legacy fixture ${model}`,evidence,{key:'test-key',model});const body=requests.at(-1).body;
   assert.equal(body.model,model);assert.equal(Object.hasOwn(body,'reasoning'),false);assert.equal(body.max_output_tokens,4500);assert.equal(timeouts.at(-1),25000);
  }
 });
 await test('Explicit supported reasoning overrides retain their model and high effort',async()=>{
  for(const model of ['gpt-5.2','gpt-6.1-sol','o3-mini']){
   reply=completed();await p.rankByContext(`Reasoning fixture ${model}`,evidence,{key:'test-key',model});const body=requests.at(-1).body;
   assert.equal(body.model,model);assert.deepEqual(body.reasoning,{effort:'high'});assert.equal(body.max_output_tokens,25000);
  }
 });
 await test('Incomplete model output fails closed and is not cached as a valid judgment',async()=>{
  const question='Incomplete fixture',before=requests.length;reply={...completed(),status:'incomplete',incomplete_details:{reason:'max_output_tokens'}};
  assert.deepEqual(await p.rankByContext(question,evidence,{key:'test-key'}),{evidence:[],mode:'context-unavailable'});
  reply=completed();assert.equal((await p.rankByContext(question,evidence,{key:'test-key'})).mode,'semantic');assert.equal(requests.length,before+2);
 });
 await test('A model refusal cannot become publisher evidence',async()=>{
  reply={status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'Fixture refusal'}]}]};
  assert.deepEqual(await p.rankByContext('Refusal fixture',evidence,{key:'test-key'}),{evidence:[],mode:'context-unavailable'});
 });
 await test('Fabricated quotations and foreign source IDs fail closed on the real response path',async()=>{
  for(const [label,change] of [['quote',{quote:'Unpublished generated claim'}],['source',{id:'unprovided-source'}]]){
   reply=completed([{...row,...change}]);assert.deepEqual(await p.rankByContext(`Invalid ${label} fixture`,evidence,{key:'test-key'}),{evidence:[],mode:'context-unavailable'});
  }
 });
 await test('Partial, low relevance and review-required responses never pass',async()=>{
  for(const [label,items,review] of [['partial',[{...row,allConstraints:false}],false],['low',[{...row,relevance:84}],false],['review',[row],true]]){
   reply=completed(items,review);const r=await p.rankByContext(`Rejected ${label} fixture`,evidence,{key:'test-key'});assert.equal(r.evidence.length,0);assert.equal(r.mode,'semantic');
  }
 });
 await test('Literal validation requires the complete provided Quran verse',async()=>{
  const quran=[{...evidence[0],source:{...source,sourceType:'quran',hadith:'Complete verse text.'}}];
  assert.deepEqual(p.validateRanked({requiresReview:false,items:[{...row,quote:'Complete verse'}]},quran),[]);
  assert.equal(p.validateRanked({requiresReview:false,items:[{...row,quote:'Complete verse text.'}]},quran).length,1);
 });
 await test('Provider failures report safe metadata without credentials, questions or raw errors',async()=>{
  const secret='private-credential-fixture',question='Private query fixture';
  replyStatus=429;reply={error:{code:'insufficient_quota',type:'insufficient_quota',message:`Do not log ${secret} ${question}`}};
  assert.deepEqual(await p.rankByContext(question,evidence,{key:secret}),{evidence:[],mode:'context-unavailable'});
  const logged=expectedErrors.at(-1),meta=JSON.parse(logged[1]);
  assert.equal(meta.stage,'provider-http');assert.equal(meta.httpStatus,429);assert.equal(meta.providerCode,'insufficient_quota');
  assert.equal(JSON.stringify(logged).includes(secret),false);assert.equal(JSON.stringify(logged).includes(question),false);
  reply={error:{code:secret,type:question,message:'untrusted response'}};
  await p.rankByContext('Second private query fixture',evidence,{key:secret});
  const unknown=JSON.parse(expectedErrors.at(-1)[1]);assert.equal(unknown.providerCode,'other');assert.equal(unknown.providerType,'other');
  reply={error:{code:'credit_balance_exhausted',type:'billing_error',message:`Account ${secret} credit balance depleted`}};
  await p.rankByContext('Credit balance fixture',evidence,{key:secret});
  const balance=JSON.parse(expectedErrors.at(-1)[1]);assert.equal(balance.providerCode,'credit_balance_exhausted');assert.equal(balance.providerReason,'credit-balance');assert.equal(JSON.stringify(balance).includes(secret),false);
  reply={detail:`Rate limit reached for ${secret}`};await p.rankByContext('Unknown envelope fixture',evidence,{key:secret});
  const envelope=JSON.parse(expectedErrors.at(-1)[1]);assert.equal(envelope.providerReason,'request-rate');assert.equal(JSON.stringify(envelope).includes(secret),false);
  replyStatus=200;
 });
 console.log(`${passed} controlled context-model checks passed; no live API calls made.`);
}finally{
 globalThis.fetch=originalFetch;AbortSignal.timeout=originalTimeout;console.error=originalError;await rm(temp,{recursive:true,force:true});
}
