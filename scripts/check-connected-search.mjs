import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {build}=createRequire(import.meta.resolve('wrangler/package.json'))('esbuild');
globalThis.__madarAssets={fetch:async request=>{
 const filename=path.resolve('public','.'+new URL(request.url).pathname);
 assert(filename.startsWith(path.resolve('public')+'/sources/'));
 try{return new Response(await fs.readFile(filename),{headers:{'Content-Type':'application/json'}});}catch{return new Response('Not found',{status:404});}
}};
const checks=[];
try{
 const bundle=await build({stdin:{contents:"export {POST} from './app/api/ask/route';export {suggestQuery} from './lib/search-suggestions';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'runtime',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'runtime',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={ASSETS:globalThis.__madarAssets};',loader:'js'}));}}]});
 const {POST,suggestQuery}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 globalThis.fetch=async()=>new Response('Simulated publisher outage',{status:503});
 for(const [question,language] of [['ر','ar'],['رب','ar'],['i','en'],['islam','en'],['ramadan','en'],['رمضان','en'],['ramthan','en'],['isalm','en'],['ramadan','fr'],['ramadan','es'],['斋月','zh'],['रमजान','hi'],['2:185','en']]){
  const response=await POST(new Request('https://example.test/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,language,autoLanguage:false})}));
  assert.equal(response.status,200,question);const result=await response.json();
  if(!['isalm'].includes(question)){assert.equal(result.status,'found',question);assert(result.evidence.length,question);assert(result.evidence.every(e=>e.source.language===language));assert.equal(result.dataMode,'snapshot');}
  if(['ramthan','isalm'].includes(question)){assert(result.suggestion);assert.equal(result.suggestion.language,'en');}
  if(['islam','ramadan','2:185'].includes(question))assert(result.evidence.some(e=>e.source.sourceType==='quran'),question+' missing Quran');
  for(const e of result.evidence){assert.equal(e.excerpt,e.source.hadith);assert(e.source.canonicalUrl.startsWith('https://'));assert(e.source.publisherNotice||e.source.publisher);}
  checks.push({question,language,status:result.status,sources:result.evidence.map(e=>({id:e.source.id,type:e.source.sourceType??'hadith',mode:e.source.accessMode})),passed:true});
 }
 for(const [q,lang,expected] of [['ramdan','en','ramadan'],['isalm','en','islam'],['رمظان','ar','رمضان']])assert.equal(suggestQuery(q,lang)?.text,expected);
 assert.equal(suggestQuery('islam','en'),undefined);assert.equal(suggestQuery('a','en'),undefined);
 const report={testedAt:new Date().toISOString(),passed:true,scenario:'Official publisher snapshots served through ASSETS with all external fetches unavailable',checks};
 await fs.writeFile('docs/connected-search-test-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length+5}));
}catch(e){console.error('Connected search failed:',e.message);process.exitCode=1;}
