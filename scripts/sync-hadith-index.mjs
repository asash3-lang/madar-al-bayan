// Publisher metadata only. Full texts are fetched from the official API on demand.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
const run=promisify(execFile);
const languages=['ar','en','fr','es','zh','hi'];
async function get(url){const {stdout}=await run('curl',['-fsS','--retry','2','--max-time','60',url],{maxBuffer:12000000});return JSON.parse(stdout);}
const records=new Map(),counts={};
for(const language of languages){
 const roots=await get(`https://hadeethenc.com/api/v1/categories/roots/?language=${language}`);
 for(let offset=0;offset<roots.length;offset+=3){
  await Promise.all(roots.slice(offset,offset+3).map(async root=>{
   let last=1;
   for(let page=1;page<=last;page++){
    const data=await get(`https://hadeethenc.com/api/v1/hadeeths/list/?language=${language}&category_id=${root.id}&page=${page}&per_page=1000`);
    if(!Array.isArray(data.data)||!data.meta)throw Error('Invalid index response');
    last=Number(data.meta.last_page);if(last>20)throw Error('Unexpected pagination');
    for(const item of data.data){
     if(!/^\d+$/.test(String(item.id))||typeof item.title!=='string')throw Error('Invalid index entry');
     const record=records.get(String(item.id))??{id:String(item.id),titles:{},translations:[]};
     record.titles[language]=item.title;record.translations=item.translations;records.set(record.id,record);
    }
   }
  }));
 }
 counts[language]=[...records.values()].filter(r=>r.titles[language]).length;
 console.log(language,counts[language]);
}
const output={publisher:'HadeethEnc.com',api:'https://hadeethenc.com/api/v1',retrievedAt:new Date().toISOString(),counts,records:[...records.values()].sort((a,b)=>Number(a.id)-Number(b.id))};
await fs.writeFile('lib/hadith-index.json',JSON.stringify(output));
console.log('Indexed',output.records.length,'distinct records');
