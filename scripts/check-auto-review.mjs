import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild'),{Miniflare}=require('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:{DB:'review-test'}});
const db=await mf.getD1Database('DB');
globalThis.__env={DB:db,ASSETS:{fetch:async r=>{try{return new Response(await fs.readFile(path.resolve('public','.'+new URL(r.url).pathname)))}catch{return new Response('',{status:404})}}}};
globalThis.__user=null;
const checks=[];
function pass(name){checks.push({name,passed:true});}
const request=body=>new Request('https://example.test/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
 for(const file of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await fs.readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(sql).run();
 const b=await build({stdin:{contents:"export {POST as ask} from './app/api/ask/route';export {GET as inbox,POST as approve} from './app/api/committee/route';export {POST as submit} from './app/api/referrals/route';export {detectLanguage} from './lib/detect-language';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'runtime',setup(b){b.onResolve({filter:/^(cloudflare:workers|@\/app\/chatgpt-auth)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='cloudflare:workers'?'export const env=globalThis.__env;':'export async function getChatGPTUser(){return globalThis.__user}',loader:'js'}));}}]});
 const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
 let emails=0;
 globalThis.fetch=async(url,options)=>{if(String(url)==='https://api.resend.com/emails'){emails++;const body=JSON.parse(options.body);assert.equal(body.to[0],'test@example.invalid');assert(options.headers['Idempotency-Key']);return Response.json({id:'test-email-id'});}return new Response('Source outage',{status:503});};
 for(const [question,expected] of [['斋月','zh'],['رمضان','ar'],['रमजान','hi'],['نیت چیست؟','fa'],['¿Qué es el islam?','es'],['Qu’est-ce que l’ihsan ?','fr'],['What is intention?','en']]){
  assert.equal(api.detectLanguage(question,'en').language,expected,question);
  const r=await api.ask(request({question,language:'en'}));assert.equal(r.status,200);const d=await r.json();assert.equal(d.language,expected);assert.equal(d.status,'found',question);assert(d.evidence.length);assert(d.evidence.every(e=>e.source.language===expected));assert.equal(d.answer.length,0);pass('Automatic language and published text: '+expected);
 }
 assert.equal(api.detectLanguage('islam','es').language,'es');assert.equal(api.detectLanguage('i','en').language,'en');pass('Ambiguous short words preserve selected language');
 let d=await (await api.ask(request({question:'斋月',language:'en',autoLanguage:false}))).json();assert.equal(d.language,'en');pass('Explicit language override');
 assert.equal((await api.inbox()).status,401);globalThis.__user={userId:'stranger',email:'stranger@example.invalid'};assert.equal((await api.inbox()).status,403);pass('Anonymous and unauthorized users cannot read inbox');
 const body={question:'Unanswered test question only',language:'en',email:'test@example.invalid',consent:true};
 assert.equal((await api.submit(request({...body,consent:false}))).status,400);assert.equal((await api.submit(request({...body,email:'bad'}))).status,400);pass('Consent and email validation');
 const sub=await api.submit(request(body));assert.equal(sub.status,201);d=await sub.json();const id=d.id;assert.equal(d.emailDeliveryEnabled,false);assert.equal(emails,0);pass('Public question saved without sending email');
 const decision={id,answer:'Reviewed test answer in English.',sources:['https://hadeethenc.com/en/browse/hadith/4560'],confirmed:true};
 assert.equal((await api.approve(request(decision))).status,403);pass('Unauthorized approval blocked');
 globalThis.__env.COMMITTEE_REVIEWER_IDS='reviewer';globalThis.__user={userId:'reviewer',email:'reviewer@example.invalid'};
 assert.equal((await api.approve(request({...decision,sources:['https://outside.example/']}))).status,400);pass('Outside source links rejected');
 assert.equal((await api.approve(request({...decision,confirmed:false}))).status,400);pass('Human review confirmation required');
 d=await (await api.approve(request(decision))).json();assert.equal(d.status,'approved');assert.equal(emails,0);pass('Approval stored when mail is not configured');
 globalThis.__env.RESEND_API_KEY='test-placeholder';globalThis.__env.MAIL_FROM='noreply@example.invalid';
 const responses=await Promise.all([api.approve(request(decision)),api.approve(request(decision))]);assert(responses.every(r=>r.status===200));assert.equal(emails,1);assert.equal((await db.prepare('SELECT status FROM referrals WHERE id=?').bind(id).first()).status,'sent');pass('Concurrent approvals send only once to stored recipient');
 await api.approve(request(decision));assert.equal(emails,1);pass('Repeated approval does not resend');
 for(let i=0;i<4;i++)assert.equal((await api.submit(request({...body,question:'Additional review question '+i}))).status,201);pass('Further questions remain available to the same requester');
 const rejected=await api.submit(new Request('https://example.test/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.example'},body:JSON.stringify(body)}));assert.equal(rejected.status,403);pass('Cross-origin submission blocked');
 const report={testedAt:new Date().toISOString(),checks,passed:true,email:'Mock provider only; no real emails sent',browserQA:false};await fs.writeFile('docs/auto-review-test-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(e){console.error(e.message);process.exitCode=1;}finally{await mf.dispose();}
