import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.resolve('wrangler/package.json')),{build}=require('esbuild');
const built=await build({stdin:{contents:"export * from './lib/source-links';export * from './lib/catalog-presentation';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const checks=[];const pass=name=>checks.push(name);
const source={publisher:'ICADB.com',id:'icadb:3bd06ffb-4eb3-468f-aec9-68a92cf70f98:unversioned',hadith:'Publisher text',canonicalUrl:'https://icadb.com/',apiUrl:'https://icadb.com/books/api/books/relevant-examples/en/?query=intention&k=4'};
const before=structuredClone(source),link=api.sourceReferenceLink(source),url=new URL(link.url);
assert.equal(url.origin,'https://icadb.com');assert.notEqual(url.pathname,'/');assert.equal(url.search,new URL(source.apiUrl).search);assert(url.hash.includes(source.id.split(':')[1]));assert.equal(link.kind,'data');assert.deepEqual(source,before);pass('ICADB links to the original official response with the exact phrase ID; evidence and retrieval request remain unchanged');
const exact='https://hadeethenc.com/zh/browse/hadith/4560';assert.equal(api.sourceReferenceLink({...source,publisher:'HadeethEnc.com',canonicalUrl:exact}).url,exact);pass('Existing exact hadith reading links are preserved');
const quran='https://quranenc.com/en/browse/english_saheeh/2#185';assert.equal(api.sourceReferenceLink({...source,publisher:'QuranEnc.com',canonicalUrl:quran}).url,quran);pass('Verse anchors are preserved');
for(const invalid of ['javascript:alert(1)','https://icadb.com.evil.invalid/text','https://user:password@icadb.com/text','https://icadb.com:8443/text'])assert.equal(api.sourceReferenceLink({...source,publisher:'test',canonicalUrl:invalid,apiUrl:invalid}).kind,'unavailable');pass('Unapproved or credential-bearing navigation URLs are rejected');
const dorar=api.sourceReferenceLink({...source,publisher:'Dorar.net',canonicalUrl:'https://dorar.net/hadith/search?q=old'});assert.equal(new URL(dorar.url).searchParams.get('q'),source.hadith);assert.equal(dorar.kind,'search');pass('Dorar fallback refers to the complete selected narration, with its search limitation explicit');
const byenah={...source,publisher:'Byenah.com',id:'byenah:25154',canonicalUrl:'https://byenah.com/en/Api/single-content?id=25154',apiUrl:'https://byenah.com/en/Api/single-content?id=25154'};
const savedByenah=structuredClone(byenah);assert.equal(api.sourceReferenceLink(byenah).kind,'unavailable');assert.equal(api.sourceReferenceLink(byenah).url,'');assert.deepEqual(byenah,savedByenah);pass('Unavailable Byenah API navigation is omitted without removing or changing saved evidence');
assert.equal(api.sourceReferenceLink({...source,publisher:'Quranpedia.net',canonicalUrl:'https://api.quranpedia.net/v1/mushafs/1/1/1'}).kind,'data');pass('Official API records are identified as data, not reading pages');
const index=JSON.parse(await fs.readFile('lib/hadith-index.json','utf8'));
for(const l of api.currentLanguages){
 const ids=new Set(l.code==='fa'?JSON.parse(await fs.readFile('public/sources/titles/fa.json','utf8')).records.map(x=>String(x.id)):index.records.filter(x=>x.titles[l.code]).map(x=>String(x.id)));
 let texts=0,explanations=0;
 for(const file of await fs.readdir('public/sources/hadith/'+l.code)){
  const rows=JSON.parse(await fs.readFile('public/sources/hadith/'+l.code+'/'+file,'utf8')).records;
  for(const [id,row] of Object.entries(rows)){if(!ids.has(id))continue;if(String(row.hadith_text??'').trim())texts++;if(String(row.explanation??'').trim())explanations++;}
 }
 assert.equal(texts,l.hadith,l.code+' hadith count');assert.equal(explanations,l.explanations,l.code+' explanation count');
}
pass('All nine language counts match indexed, saved official texts and explanations');
for(const l of api.targetLanguages){const rows=JSON.parse(await fs.readFile('public/sources/titles/'+l.code+'.json','utf8')).records;assert.equal(rows.length,l.count,l.code);assert(l.count>=1000);assert(!api.currentLanguages.some(x=>x.code===l.code));}pass('Future language counts match title catalogs and are separate from activated full-text banks');
const allIds=[...api.connectedReferences,...api.plannedReferences].map(x=>x.id);assert.equal(new Set(allIds).size,allIds.length);assert.equal(allIds.length,34);assert(!allIds.includes(12));assert(!allIds.includes(36));pass('No source double counting: gateway and documentation excluded from independent source totals');
console.log(JSON.stringify({passed:true,checks},null,2));
