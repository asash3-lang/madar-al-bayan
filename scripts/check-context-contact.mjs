import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.resolve('wrangler/package.json')),{build}=require('esbuild'),{Miniflare}=require('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:{DB:'context-contact'}}),db=await mf.getD1Database('DB');
globalThis.__env={DB:db,ASSETS:{fetch:async r=>{try{return new Response(await fs.readFile(path.resolve('public','.'+new URL(r.url).pathname)))}catch{return new Response('',{status:404})}}}};globalThis.__user=null;
const checks=[],pass=name=>checks.push({name,passed:true});
const req=body=>new Request('https://example.test/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
 for(const f of (await fs.readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())for(const sql of (await fs.readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint').filter(x=>x.trim()))await db.prepare(sql).run();
 const b=await build({stdin:{contents:"export {POST as ask} from './app/api/ask/route';export {GET as inbox,POST as contact} from './app/api/contact/route';export {rankByContext,validateRanked} from './lib/context-ranking';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'mocks',setup(b){b.onResolve({filter:/^(cloudflare:workers|@\/app\/chatgpt-auth)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='cloudflare:workers'?'export const env=globalThis.__env':'export async function getChatGPTUser(){return globalThis.__user}',loader:'js'}));}}]});
 const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
 globalThis.fetch=async()=>new Response('Simulated outage',{status:503});
 for(const [q,lang,id] of [['الأركان الخمسة','ar','65000'],['ما هي أركان الإسلام؟','ar','65000'],['什么是信仰','zh','4563'],['नीयत क्या है','hi','4560'],['What is intention?','en','4560']]){
  const response=await api.ask(req({question:q,language:'fr',autoLanguage:false}));assert.equal(response.status,200);const d=await response.json();assert.equal(d.language,lang);assert.equal(d.status,'found',q);assert.equal(d.evidence[0].source.id,id);assert(d.evidence.every(e=>e.source.language===lang&&!('score' in e)));if(q==='الأركان الخمسة'){assert.equal(d.suggestion,undefined);assert(!d.evidence.some(e=>e.source.sourceType==='quran'));}pass('Exact contextual source and automatic language: '+q);
 }
 for(const q of ['هل الأركان الخمسة تعني خمس شهادات؟','What is the relationship between fasting and astronomy?','ر']){const d=await (await api.ask(req({question:q,language:'en'}))).json();assert.equal(d.evidence.length,0);assert.equal(d.answer.length,0);pass('No unverified keyword fallback: '+q);}
 const source={title:'Test source',hadith:'A complete original source excerpt.',explanation:'Another original explanatory passage.',language:'en',publisher:'HadeethEnc.com',canonicalUrl:'https://hadeethenc.com/en/browse/hadith/4560'};
 const candidates=[{source:{...source,id:'a'},excerpt:source.hadith,kind:'hadith',score:1},{source:{...source,id:'b'},excerpt:source.hadith,kind:'hadith',score:2},{source:{...source,id:'q',sourceType:'quran'},excerpt:source.hadith,kind:'hadith',score:999}];
 const row=(id,relevance)=>({id,relevance,directAnswer:true,allConstraints:true,quote:source.hadith,kind:'hadith'});
 let ranked=api.validateRanked({requiresReview:false,items:[row('a',87),row('q',94),row('b',96)]},candidates);assert.deepEqual(ranked.map(e=>e.source.id),['b','a']);pass('Contextual order and stricter Quran threshold');
 assert.equal(api.validateRanked({requiresReview:false,items:[{...row('a',99),allConstraints:false}]},candidates).length,0);pass('Incomplete context rejected despite high score');
 assert.equal(api.validateRanked({requiresReview:true,items:[row('a',99)]},candidates).length,0);pass('Review-required response hidden');
 assert.throws(()=>api.validateRanked({requiresReview:false,items:[row('outside',99)]},candidates));assert.throws(()=>api.validateRanked({requiresReview:false,items:[{...row('a',99),quote:'Invented quotation'}]},candidates));pass('Invented IDs and quotation edits rejected');
 assert.equal(api.validateRanked({requiresReview:false,items:[{...row('q',99),quote:'original source excerpt.'}]},candidates).length,0);pass('Truncated Quran text rejected');
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');const payload=JSON.parse(options.body);assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({requiresReview:false,items:[row('b',96),row('a',87)]})}]}]});};
 ranked=await api.rankByContext('Evaluate this test query.',candidates,{key:'test-only'});assert.equal(ranked.mode,'semantic');assert.deepEqual(ranked.evidence.map(e=>e.source.id),['b','a']);pass('Structured semantic adapter with source-only output (mock)');
 globalThis.fetch=async()=>new Response('',{status:503});ranked=await api.rankByContext('A different test query.',candidates,{key:'test-only'});assert.equal(ranked.evidence.length,0);pass('Semantic provider outage fails closed');
 assert.equal((await api.contact(req({contact:''}))).status,400);assert.equal((await api.contact(req({contact:'invalid'}))).status,400);pass('Contact detail required and validated');
 assert.equal((await api.contact(req({contact:'test@example.invalid'}))).status,201);assert.equal((await api.contact(req({contact:'+966 50 123 4567'}))).status,201);pass('Either email or phone sufficient; all other fields optional');
 assert.equal((await api.inbox()).status,401);globalThis.__user={userId:'unauthorized',email:'x@example.invalid'};assert.equal((await api.inbox()).status,403);pass('Contact messages private');
 globalThis.__user={userId:'reviewer',email:'reviewer@example.invalid'};globalThis.__env.COMMITTEE_REVIEWER_IDS='reviewer';const messages=await (await api.inbox()).json();assert.equal(messages.items.length,2);pass('Authorized inbox reads durable messages');
 await api.contact(req({contact:'test@example.invalid'}));await api.contact(req({contact:'test@example.invalid'}));assert.equal((await api.contact(req({contact:'test@example.invalid'}))).status,429);pass('Contact submission limit');
 await fs.writeFile('docs/context-contact-test-results.json',JSON.stringify({testedAt:new Date().toISOString(),checks,passed:true,model:'Mock only: runtime API key absent',browserQA:false},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(e){console.error(e.message);process.exitCode=1;}finally{await mf.dispose();}
