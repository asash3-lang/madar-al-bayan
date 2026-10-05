import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {build}=createRequire(import.meta.resolve('wrangler/package.json'))('esbuild');
globalThis.__recoveryEnv={ASSETS:{fetch:async request=>{
 const name=path.resolve('public','.'+new URL(request.url).pathname);
 assert(name.startsWith(path.resolve('public')+'/sources/'));
 try{return new Response(await fs.readFile(name),{headers:{'Content-Type':'application/json'}});}catch{return new Response('',{status:404});}
}}};
const buildResult=await build({stdin:{contents:"export {POST} from './app/api/ask/route';export {directTopic} from './lib/direct-topics';export {searchTerms,fetchIndexedSource} from './lib/source-search';export {parseTranslation} from './lib/multilingual-answer';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'runtime',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'runtime',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env=globalThis.__recoveryEnv'}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(buildResult.outputFiles[0].text).toString('base64'));
const calls=[],checks=[];
globalThis.fetch=async url=>{calls.push(String(url));return new Response('Controlled live-provider outage',{status:503});};
const ask=async(question,selected='en')=>{const response=await api.POST(new Request('https://example.test/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,language:selected})}));assert.equal(response.status,200,question);return response.json();};
for(const [q,language,id] of [
 ['islam','en','4563'],['What is Islam?','en','4563'],['الإسلام','ar','4563'],['ما هو الإسلام؟','ar','4563'],["Qu'est-ce que l'islam ?",'fr','4563'],['¿Qué es el islam?','es','4563'],['伊斯兰教','zh','4563'],['什么是伊斯兰教？','zh','4563'],['इस्लाम क्या है','hi','4563'],['اسلام چیست','fa','4563'],
 ['ramadan','en','4196'],['رمضان','ar','4196'],['斋月','zh','4196'],['रमजान','hi','4196'],['What is Ramadan?','en','quran:2:185'],['ما هو رمضان؟','ar','quran:2:185'],['什么是斋月？','zh','quran:2:185'],["Qu'est-ce que le ramadan ?",'fr','quran:2:185'],['¿Qué es el ramadán?','es','quran:2:185'],['रमजान क्या है','hi','quran:2:185'],['رمضان چیست','fa','quran:2:185'],
 ['何谓伊斯兰?','zh','4563'],['何謂伊斯蘭教？','zh','4563'],['伊斯兰教是什么意思？','zh','4563'],['نیت چیست؟','fa','4560'],['What is intention?','en','4560'],['ما معنى النية؟','ar','4560'],['Que signifie l’intention en islam ?','fr','4560'],['¿Qué es la intención?','es','4560'],['नीयत क्या है?','hi','4560'],['什么是信仰','zh','4563'],['伊斯兰五功是什么','zh','65000'],['什么是举意','zh','4560']
]){
 const before=calls.length,r=await ask(q);
 assert.equal(r.language,language,q);assert.equal(r.status,'found',q);assert(r.evidence.some(e=>e.source.id===id),q);assert.equal(r.dataMode,'snapshot');assert.equal(r.answer.length,0);
 for(const e of r.evidence){assert.equal(e.source.language,language);assert.equal(e.excerpt,e.source.hadith);assert(!('score' in e));assert(['HadeethEnc.com','QuranEnc.com'].includes(e.source.publisher));}
 assert(calls.slice(before).every(url=>/^https:\/\/(?:hadeethenc|quranenc)\.com\//.test(url)),q+' unnecessarily waited for another provider');
 checks.push({question:q,language,ids:r.evidence.map(e=>e.source.id),passed:true});
}
// Shared Latin spellings retain an explicitly selected language, while scripts override it.
for(const language of ['ar','en','fr','es','zh','hi','fa']){
 const r=await ask('ramadan',language);assert.equal(r.language,language);assert.equal(r.status,'found');assert(r.evidence.every(e=>e.source.language===language));checks.push({name:'Ambiguous topic respects selected language: '+language,passed:true});
}
assert.equal((await ask('什么是伊斯兰教？','fr')).language,'zh');
assert(api.searchTerms('伊斯兰教').length>0);assert(api.searchTerms('什么是伊斯兰教').length>0);checks.push({name:'Chinese concept is not removed as filler',passed:true});
for(const q of ['Can I skip Ramadan because I am ill?','Does Ramadan forgive every major sin?','When is Ramadan in 2027?','What is Islam and Christianity?','Is Islam false?','什么是伊斯兰教，如果我不礼拜可以吗？','何谓伊斯兰，如果我不礼拜可以吗？','نیت چیست و آیا کار من درست است؟','伊斯兰教和基督教有什么区别？','斋月生病可以不封斋吗？','斋月什么时候开始？','هل يجوز لي الإفطار في رمضان؟']){
 assert.equal(api.directTopic(q),undefined);const r=await ask(q);assert.equal(r.evidence.length,0,q);assert.equal(r.answer.length,0);checks.push({question:q,name:'No condition-dropping or unverified fallback',passed:true});
}
for(const lang of ['zh','hi','es']){const s=await api.fetchIndexedSource('7041',lang);assert.equal(s.explanation,'');assert(s.hadith.length>0);checks.push({name:'No Arabic explanation substituted for '+lang,passed:true});}
const live=api.parseTranslation({id:'4563',translations:['zh'],title:'中文标题',hadeeth:'中文文本',explanation:null,grade:'正确',attribution:'出处'},{id:'4563',explanation:'Arabic original'},'zh');assert.equal(live.explanation,'');checks.push({name:'Missing optional live explanation does not reject translated text',passed:true});
// Separate fresh module caches exercise the LIVE parser, whose publisher identity
// must be the same as the saved-record parser (the production-only regression).
const liveApi=await import('data:text/javascript;base64,'+Buffer.from(buildResult.outputFiles[0].text).toString('base64')+'#live');
const original=JSON.parse(await fs.readFile('lib/reference-snapshot.json','utf8')).find(r=>r.id==='4563').raw;
globalThis.fetch=async value=>{
 const url=new URL(value),id=url.searchParams.get('id'),lang=url.searchParams.get('language');assert.equal(url.hostname,'hadeethenc.com');assert.equal(id,'4563');
 if(lang==='ar')return Response.json(original);
 const raw=JSON.parse(await fs.readFile(`public/sources/hadith/${lang}/45.json`,'utf8')).records[id];
 return Response.json({id,translations:[lang],title:raw.title,hadeeth:raw.hadith_text,explanation:raw.explanation,grade:raw.grade,attribution:raw.takhrij});
};
for(const language of ['ar','en','fr','es','zh','hi','fa']){
 const response=await liveApi.POST(new Request('https://example.test/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'islam',language})}));const r=await response.json();
 assert.equal(r.status,'found',language);assert.equal(r.evidence[0].source.publisher,'HadeethEnc.com');assert.equal(r.evidence[0].source.language,language);assert.equal(r.evidence[0].source.accessMode,'live',language);checks.push({name:'Live parser preserves publisher identity: '+language,passed:true});
}
await fs.writeFile('docs/search-recovery-test-results.json',JSON.stringify({testedAt:new Date().toISOString(),scenario:'API route and real official snapshots; simulated live-provider outage. Not proof of live availability or general semantic-model activation.',checks},null,2)+'\n');
console.log(JSON.stringify({passed:true,checks:checks.length}));
