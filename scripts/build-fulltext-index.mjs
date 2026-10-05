import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {build}=createRequire(import.meta.resolve('wrangler/package.json'))('esbuild');
const bundle=await build({entryPoints:['lib/retrieval-terms.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {tokens}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const langs=['ar','en','fr','es','zh','hi','fa','id','ur'];
const out=path.resolve('public/sources/search');await fs.mkdir(out,{recursive:true});
const report={createdAt:new Date().toISOString(),languages:{}};
for(const language of langs){
 const documents=[],terms=Object.create(null);let lengthSum=0;
 function add(id,title,body,explanation,extra={}){
  if(!body?.trim())return;
  const words=tokens(body+'\n'+(explanation??'')),titleWords=tokens(title??'');
  const frequencies=new Map();for(const word of words)frequencies.set(word,(frequencies.get(word)??0)+1);
  for(const word of titleWords)frequencies.set(word,(frequencies.get(word)??0)+3);
  const length=Math.max(1,words.length+titleWords.length),ordinal=documents.length;
  documents.push({id,length,...extra});lengthSum+=length;
  for(const [word,tf]of frequencies)(terms[word]??=[]).push(ordinal,Math.min(tf,255));
 }
 const dir=path.resolve('public/sources/hadith',language);
 for(const filename of (await fs.readdir(dir)).sort()){
  if(!/^\d+\.json$/.test(filename))continue;
  const data=JSON.parse(await fs.readFile(path.join(dir,filename),'utf8'));
  for(const raw of Object.values(data.records))add(String(raw.id),raw.title??raw.title_ar,raw.hadith_text??raw.hadith_text_ar,raw.explanation??raw.explanation_ar);
 }
 const collectionDir=path.resolve('public/sources/collections',language);
 for(const filename of await fs.readdir(collectionDir).catch(()=>[])){
  if(!filename.endsWith('.json'))continue;
  const data=JSON.parse(await fs.readFile(path.join(collectionDir,filename),'utf8'));
  for(const [key,source]of Object.entries(data.records))add(source.id,source.title,source.hadith,source.explanation,{key,path:`/sources/collections/${language}/${filename}`});
 }
 const value={version:1,language,averageLength:lengthSum/Math.max(1,documents.length),documents,terms};
 const text=JSON.stringify(value);await fs.writeFile(path.join(out,language+'.json'),text);
 report.languages[language]={documents:documents.length,terms:Object.keys(terms).length,bytes:Buffer.byteLength(text)};
 console.log(language,JSON.stringify(report.languages[language]));
}
await fs.writeFile('docs/fulltext-index-verification.json',JSON.stringify(report,null,2)+'\n');
