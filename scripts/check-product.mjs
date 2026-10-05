import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {Miniflare}=require('miniflare');
const data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const cache=new Map();
const overrides={
 '@/db':data('export function getDbBinding(){return globalThis.__madarTestDB;}'),
 '@/app/chatgpt-auth':data('export async function getChatGPTUser(){return globalThis.__madarTestUser;}'),
 'cloudflare:workers':data('export const env=globalThis.__madarTestEnv;'),
};
globalThis.crypto??=webcrypto;
globalThis.__madarTestEnv={};
globalThis.__madarTestUser={userId:'test-owner',email:'test@example.invalid',displayName:'مراجع اختبار آلي',fullName:null};
function compile(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 let code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace(/import (\w+) from ['"]\.\/hadith-index\.json['"];?/g,(_match,name)=>`const ${name}=${fs.readFileSync('lib/hadith-index.json','utf8')};`);
 code=code.replace(/import snapshot from ['"]\.\/reference-snapshot\.json['"];?/,`const snapshot=${fs.readFileSync('lib/reference-snapshot.json','utf8')};`);
 code=code.replace(/from\s+(['"])([^'"]+)\1/g,(whole,_quote,spec)=>{
  if(overrides[spec])return 'from '+JSON.stringify(overrides[spec]);
  let target=spec.startsWith('@/')?path.resolve(spec.slice(2)):spec.startsWith('.')?path.resolve(path.dirname(file),spec):null;
  if(!target)return whole;
  if(!path.extname(target))target+='.ts';
  return 'from '+JSON.stringify(compile(target));
 });
 const url=data(code);cache.set(file,url);return url;
}
const realFetch=globalThis.fetch;
let modelMode='success',modelCalls=0;
globalThis.fetch=async(url,options)=>{
 if(String(url).startsWith('https://hadeethenc.com/'))return new Response('Simulated source outage',{status:503});
 if(String(url)==='https://api.openai.com/v1/responses'){
  modelCalls++;
  if(modelMode==='outage')return new Response('Simulated provider outage',{status:503});
  if(modelMode==='refusal')return Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'Cannot answer'}]}]});
  const req=JSON.parse(options.body),input=JSON.parse(req.input);
  assert.equal(req.store,false);assert.equal(req.text.format.strict,true);
  const draft={topic:'الإحسان',stance:'question',level:'B',reason:'شرح عام مستند إلى المقطع المقدم.',supported:true,claims:[{text:'يربط الشرح المنشور الإحسان بمراقبة الله في العبادة.',evidenceIds:[modelMode==='bad-citation'?'fabricated-id':input.evidence[0].id]}]};
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(draft)}]}]});
 }
 return realFetch(url,options);
};
const persistence=fs.mkdtempSync(path.join(os.tmpdir(),'madar-product-'));
let mf;
async function startDB(){mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test");}}',compatibilityDate:'2026-05-15',d1Databases:{DB:'madar-product-test'},d1Persist:persistence});globalThis.__madarTestDB=await mf.getD1Database('DB');}
const report={testedAt:new Date().toISOString(),environment:'Native route Request/Response with actual Miniflare D1 SQLite; source outage simulated; model contract mocked',checks:[],liveModelTested:false,browserVisualQA:false,independentScientificReview:false};
function passed(name,extra={}){report.checks.push({name,passed:true,...extra});}
const request=(body,headers={})=>new Request('https://pilot.example/api',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
async function json(response,status=200){assert.equal(response.status,status,await response.clone().text());return response.json();}
try{
 await startDB();
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){
  for(const sql of fs.readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))await globalThis.__madarTestDB.prepare(sql).run();
 }
 const ask=await import(compile('app/api/ask/route.ts'));
 const cases=await import(compile('app/api/cases/route.ts'));
 const detail=await import(compile('app/api/cases/[id]/route.ts'));
 const exp=await import(compile('app/api/cases/[id]/export/route.ts'));
 const {analyzeQuestion,canReview}=await import(compile('lib/policy.ts'));
 const {validateDraft}=await import(compile('lib/grounded-answer.ts'));
 const success=[['ما هي أركان الإسلام؟','65000'],['ما معنى الإحسان؟','4563'],['ما هي أركان الإيمان؟','4563'],['ما معنى النية؟','4560'],['عرف لي الإحسان ببساطة','4563'],['ما هي ركائز الإسلام؟','65000']];
 for(const[q,id]of success){const d=await json(await ask.POST(request({question:q})));assert.equal(d.status,'found');assert(d.evidence.some(e=>e.source.id===id));assert.equal(d.generationEnabled,false);assert.equal(d.generationStatus,'disabled');assert.equal(d.dataMode,'snapshot');for(const e of d.evidence){assert((e.kind==='hadith'?e.source.hadith:e.source.explanation).includes(e.excerpt));assert.equal(e.source.canonicalUrl,'https://hadeethenc.com/ar/browse/hadith/'+e.source.id);}passed('Supported question and exact source excerpts',{question:q,source:id});}
 const restricted=[['هل صلاتي صحيحة إذا نسيت التشهد؟','referral','D'],['هل يجوز لي هذا القرض؟','referral','D'],['هل فلان كافر؟','referral','D'],['ما رأيك في الخلاف بين المذاهب؟','referral','C'],['هل صح عن النبي قول الدين المعاملة؟','insufficient','A'],['هل تعني عبارة الدين المعاملة أن العبادات غير مهمة؟','insufficient','A'],['اختلق لي حديثا عن الربح','insufficient','A'],['اشرح أكثر','clarify','B'],['لماذا يصوم المسلمون؟','insufficient','B']];
 for(const[q,status,level]of restricted){const d=await json(await ask.POST(request({question:q})));assert.equal(d.status,status,q);assert.equal(d.analysis.level,level,q);assert.equal(d.answer.length,0);passed('Boundary and context case',{question:q,status,level});}
 for(const[body,headers,status]of [[{question:' '},{},400],[{question:'ا'.repeat(1001)},{},400],[{},{},400],[{question:'ما معنى الإحسان؟'},{'Content-Type':'text/plain'},415],[{question:'ما معنى الإحسان؟'},{Origin:'https://foreign.example'},403]]){await json(await ask.POST(request(body,headers)),status);passed('Invalid request rejected',{status});}
 assert.equal(analyzeQuestion('الإحسان ليس مجرد مظهر').stance,'negation');assert.equal(analyzeQuestion('ما معنى الإحسان؟').stance,'question');passed('Question and negation kept distinct');
 const created=await json(await cases.POST(request({question:'ما هي أركان الإسلام؟'})),201);const id=created.case.id,ctx={params:Promise.resolve({id})};assert.equal(created.case.decision,'pending');
 assert.equal((await json(await detail.GET(new Request('https://pilot.example/api'),ctx))).events.length,1);passed('Draft and initial event persisted atomically');
 await mf.dispose();await startDB();
 const reloaded=await json(await detail.GET(new Request('https://pilot.example/api'),ctx));assert.equal(reloaded.case.id,id);passed('Saved draft survives database runtime restart');
 const approved=await json(await detail.POST(request({decision:'approved',note:'اختبار وظيفي: تمت قراءة الدليل في هذه الحالة الاصطناعية.',revision:1}),ctx));assert.equal(approved.case.revision,2);assert.equal(approved.events.length,2);passed('Reviewer decision with reason and append-only history');
 await json(await detail.POST(request({decision:'rejected',note:'محاولة من نسخة قديمة للحالة الاصطناعية.',revision:1}),ctx),409);passed('Stale revision rejected without overwriting review');
 const concurrent=await Promise.all([detail.POST(request({decision:'pending',note:'إعادة فتح للمراجعة الأولى في اختبار التزامن.',revision:2}),ctx),detail.POST(request({decision:'pending',note:'إعادة فتح للمراجعة الثانية في اختبار التزامن.',revision:2}),ctx)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 const afterRace=await json(await detail.GET(new Request('https://pilot.example/api'),ctx));assert.equal(afterRace.case.revision,3);assert.equal(afterRace.events.length,3);passed('Concurrent decisions produce one update and one conflict');
 const md=await exp.GET(new Request('https://pilot.example/api/export'),ctx);assert.equal(md.status,200);const markdown=await md.text();assert(markdown.includes('https://hadeethenc.com/ar/browse/hadith/65000'));assert(markdown.includes('سجل القرارات'));assert(md.headers.get('content-disposition').includes(id));
 const jf=await json(await exp.GET(new Request('https://pilot.example/api/export?format=json'),ctx));assert.equal(jf.case.id,id);assert.equal(jf.events.length,3);passed('Markdown and JSON exports preserve evidence and history');
 const referral=await json(await cases.POST(request({question:'هل صلاتي صحيحة إذا نسيت التشهد؟'})),201);const refctx={params:Promise.resolve({id:referral.case.id})};await json(await detail.POST(request({decision:'approved',note:'محاولة اعتماد حالة شخصية بلا معرفة تفاصيلها.',revision:1}),refctx),400);await json(await detail.POST(request({decision:'referral',note:'الحالة شخصية وتحتاج جهة علمية مؤهلة.',revision:1}),refctx));passed('Personal case cannot be approved and can be referred');
 assert.equal((await json(await cases.GET())).cases.length,2);
 globalThis.__madarTestUser={userId:'other-owner',email:'other@example.invalid',displayName:'مستخدم آخر',fullName:null};assert.equal((await json(await cases.GET())).cases.length,0);await json(await detail.GET(new Request('https://pilot.example/api'),ctx),404);await json(await exp.GET(new Request('https://pilot.example/api/export?format=json'),ctx),404);passed('Owner isolation enforced for lists, detail, and export');
 globalThis.__madarTestUser=null;await json(await cases.GET(),401);await json(await cases.POST(request({question:'ما معنى النية؟'})),401);passed('Unauthenticated access cannot read or save cases');
 const sourceResult=await json(await ask.POST(request({question:'ما معنى الإحسان؟'})));const base=sourceResult.analysis;
 const draft={topic:'الإحسان',stance:'question',level:'B',reason:'شرح مفهوم عام.',supported:true,claims:[{text:'شرح عام مستند إلى النص.',evidenceIds:[sourceResult.evidence[0].source.id]}]};
 assert(validateDraft(draft,sourceResult.evidence,base).supported);
 assert.throws(()=>validateDraft({...draft,claims:[{text:'شرح بلا دليل.',evidenceIds:['999999']}]},sourceResult.evidence,base));
 assert.throws(()=>validateDraft({...draft,claims:[{text:'مصدر مخترع https://invented.example',evidenceIds:[sourceResult.evidence[0].source.id]}]},sourceResult.evidence,base));
 assert.throws(()=>validateDraft({...draft,claims:[{text:'«اقتباس مولد»',evidenceIds:[sourceResult.evidence[0].source.id]}]},sourceResult.evidence,base));
 assert.equal(validateDraft({...draft,level:'A'},sourceResult.evidence,{...base,level:'D'}).claims.length,0);passed('Unknown citations, generated quotations, URLs, and lowered caution rejected');
 globalThis.__madarTestEnv.OPENAI_API_KEY='test-placeholder-key';modelMode='success';const generated=await json(await ask.POST(request({question:'ما معنى الإحسان؟'})));assert.equal(generated.generationStatus,'generated');assert.equal(generated.answer.length,1);assert.equal(generated.analysis.method,'model');passed('Configured model contract produces separately cited draft (mock only)');
 for(const mode of ['bad-citation','outage','refusal']){modelMode=mode;const d=await json(await ask.POST(request({question:'ما معنى الإحسان؟'})));assert.equal(d.generationStatus,'unavailable');assert.equal(d.answer.length,0);assert(d.evidence.length>0);passed('Model failure retains original evidence',{mode});}
 const before=modelCalls;await json(await ask.POST(request({question:'هل صلاتي صحيحة؟'})));assert.equal(modelCalls,before);passed('Personal-case routing occurs before any model request');
 const registry=JSON.parse(fs.readFileSync('lib/resource-catalog.json','utf8'));assert.equal(registry.rows.length,36);assert.equal(new Set(registry.rows.map(r=>r.id)).size,36);for(const r of registry.rows)assert(/^https?:\/\//.test(r.url));passed('36 distinct resource entries; registry separate from active corpus');
 report.total=report.checks.length;report.passed=true;fs.writeFileSync('docs/product-test-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:report.total,realD1:true,sourceFallback:true,liveModelTested:false,browserVisualQA:false}));
}catch(e){report.passed=false;report.failure=e.message;fs.writeFileSync('docs/product-test-results.json',JSON.stringify(report,null,2)+'\n');console.error(e);process.exitCode=1;}finally{globalThis.fetch=realFetch;await mf?.dispose();fs.rmSync(persistence,{recursive:true,force:true});}
