import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
const run=promisify(execFile);
const {build}=createRequire(import.meta.resolve('wrangler/package.json'))('esbuild');
try{
 const bundle=await build({stdin:{contents:"export * from './lib/source-search'; export {POST} from './app/api/ask/route';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'runtime-test',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'runtime',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env={};',loader:'js'}));}}]});
 const {rankSources,searchSources,fetchIndexedSource,sourceIndexInfo,POST}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const checks=[];const check=(name)=>checks.push({name,passed:true});
 assert(sourceIndexInfo.total>1000);check('Real publisher index exceeds the three-record pilot');
 for(const lang of ['ar','en','fr','es','zh','hi']){assert(sourceIndexInfo.counts[lang]>100);assert(rankSources('رمضان',lang).length);check('Arabic query resolves translated source IDs: '+lang);}
 assert.deepEqual(rankSources('ramthan','en'),rankSources('ramadan','en'));check('Reported spelling ramthan resolves Ramadan');
 for(const [q,lang] of [['صيام','ar'],['prayer','en'],['charité','fr'],['ayuno','es'],['斋月','zh'],['रमजान','hi']]){assert(rankSources(q,lang).length,q);check('Free keyword search: '+lang);}
 assert.equal(rankSources('quantum superconductivity xyzabc','en').length,0);check('Unrelated query has no false match');
 const realFetch=globalThis.fetch,fixtures=new Map();
 globalThis.fetch=async url=>{
  const {stdout}=await run('curl',['-fsS','--max-time','25',String(url)],{maxBuffer:250000});
  const raw=JSON.parse(stdout);fixtures.set(String(url),raw);return Response.json(raw);
 };
 // Real selected texts, all six output languages, including Arabic typed in English UI.
 for(const lang of ['ar','en','fr','es','zh','hi']){
  const result=await searchSources(lang==='en'?'ramthan':'رمضان',lang);
  assert(result.evidence.length>0,lang+' did not retrieve live evidence');
  for(const e of result.evidence){assert.equal(e.source.language,lang);assert.equal(e.excerpt,fixtures.get(e.source.apiUrl).hadeeth);assert(e.source.references.length);assert(e.source.canonicalUrl.includes('/'+lang+'/'));}
  check('Live API evidence, exact text and source link: '+lang);
 }
 for(const question of ['رمضان','ramthan']){
  const response=await POST(new Request('https://example.test/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,language:'en'})}));
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.status,'found');assert(data.evidence.every(e=>e.source.language==='en'));check('Reported query passes real ask route: '+question);
 }
 await assert.rejects(()=>fetchIndexedSource('not-an-id','en'));check('Unindexed IDs rejected');
 globalThis.fetch=async()=>new Response('outage',{status:503});
 const outage=await searchSources('charity','fr');assert.equal(outage.evidence.length,0);assert.equal(outage.unavailable,true);check('Outage is distinguished from no match');
 globalThis.fetch=realFetch;
 const report={testedAt:new Date().toISOString(),passed:true,index:sourceIndexInfo,checks,liveApiResponses:fixtures.size,liveModelTested:false,browserVisualQA:false};
 await fs.writeFile('docs/source-search-test-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(e){console.error('Source integration failed:',String(e?.message??e).slice(0,500));process.exitCode=1;}
