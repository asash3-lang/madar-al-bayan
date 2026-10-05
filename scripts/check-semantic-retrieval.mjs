import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {build}=createRequire(import.meta.resolve('wrangler/package.json'))('esbuild');
// Real official snapshots, controlled live-provider outage and model judgments.
// This verifies candidate recall and fail-closed behavior, not model accuracy.
globalThis.__semanticRetrievalEnv={ASSETS:{fetch:async request=>{
 const file=path.resolve('public','.'+new URL(request.url).pathname);
 assert(file.startsWith(path.resolve('public')+'/sources/'));
 try{return new Response(await fs.readFile(file));}catch{return new Response('',{status:404});}
}}};
const bundle=await build({stdin:{contents:"export {answerFromSources} from './lib/federated-search';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'runtime',setup(b){
 b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'runtime',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env=globalThis.__semanticRetrievalEnv'}));
}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let captured,accept=false,checks=0;
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')return new Response('',{status:503});
 const body=JSON.parse(options.body),input=JSON.parse(body.input);
 if(body.text.format.name==='question_search_plan')return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({intent:input.question,queries:[input.question],requiresReview:false})}]}]});
 captured=input;
 const source=captured.documents.find(d=>d.id==='4560');
 const items=accept&&source?[{id:source.id,relevance:96,directAnswer:true,allConstraints:true,quote:source.hadith,kind:'hadith'}]:[];
 return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({requiresReview:false,items})}]}]});
};
for(const [language,question] of [
 ['hi','क्या कर्मों का फल नीयत पर निर्भर है?'],
 ['zh','一切行为全凭举意吗？'],
 ['fr','Les œuvres valent-elles par les intentions ?'],
 ['es','¿La recompensa de las obras depende de las intenciones?']
]){
 accept=true;captured=undefined;
 const result=await api.answerFromSources(question,language,{key:'controlled-fixture'});
 assert.equal(captured.question,question,'The complete original query must reach the model');
 assert(captured.documents.some(d=>d.id==='4560'&&d.language===language),`${language}: expected publisher candidate was lost`);
 assert.equal(result.contextMode,'semantic');assert.equal(result.evidence[0].source.language,language);assert.equal(result.evidence[0].excerpt,result.evidence[0].source.hadith);
 checks++;
}
accept=false;captured=undefined;
const rejected=await api.answerFromSources("What is Ramadan's bandwidth?",'en',{key:'controlled-fixture'});
assert(captured.documents.length>0,'Negative test must actually reach the context judge');
assert.equal(rejected.contextMode,'semantic');assert.equal(rejected.status,'insufficient');assert.equal(rejected.evidence.length,0);checks++;
console.log(JSON.stringify({passed:true,checks,scenario:'Controlled candidate recall; literal publisher snapshots; no live model accuracy claim.'}));
