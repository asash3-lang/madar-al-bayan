import rawIndex from './hadith-index.json';
import {parseSource} from './sources';
import type {Language} from './i18n';
import type {Evidence,SourceRecord} from './types';
import {hadithSnapshot,publisherAsset} from './publisher-assets';
const index=rawIndex as {publisher:string;retrievedAt:string;counts:Record<string,number>;records:{id:string;titles:Record<string,string>;translations:string[]}[]};

import {normalize,tokens,searchTerms} from './retrieval-terms';
export {normalize,searchTerms} from './retrieval-terms';
import {rankFullText,collectionSource,teachingCandidates,type IndexedHit} from './fulltext-search';
const substitutions:Record<string,string>={ramthan:'ramadan',ramadhan:'ramadan',ramazan:'ramadan',ramzan:'ramadan',ihsane:'ihsan'};
const documents=index.records.map(record=>({record,terms:new Set(Object.values(record.titles).flatMap(title=>tokens(title)))}));
const frequency=new Map<string,number>();
for(const doc of documents)for(const term of doc.terms)frequency.set(term,(frequency.get(term)??0)+1);
export const sourceIndexInfo={publisher:index.publisher,retrievedAt:index.retrievedAt,counts:index.counts,total:index.records.length};
export function exactSourceTitle(question:string,language:string){
 const key=normalize(question).replace(/[\p{P}\p{S}]/gu,'').replace(/\s+/g,' ').trim();
 if(key.length<4)return undefined;
 return index.records.find(r=>r.translations.includes(language)&&r.titles[language]&&normalize(r.titles[language]).replace(/[\p{P}\p{S}]/gu,'').replace(/\s+/g,' ').trim()===key)?.id;
}
export function rankSources(question:string,language:Language):{id:string;score:number}[]{
 const short=normalize(question).trim();
 if(/^[\p{L}\p{M}]{1,2}$/u.test(short))return documents.filter(d=>d.record.titles[language]&&[...d.terms].some(term=>term.startsWith(short))).slice(0,5).map(d=>({id:d.record.id,score:1}));
 const base=tokens(question).map(term=>substitutions[term]??term);
 if(!base.length)return [];
 const query=searchTerms(question).map(group=>new Set(group));
 return documents.filter(d=>d.record.titles[language]&&d.record.translations.includes(language)).map(d=>{
  let score=0,matched=0;
  for(const alternatives of query){
   let best=0;
   for(const term of alternatives)if(d.terms.has(term))best=Math.max(best,Math.log(1+documents.length/(frequency.get(term)??1)));
   if(best){matched++;score+=best;}
  }
  return {id:d.record.id,score:score/Math.sqrt(1+d.terms.size/100),coverage:matched/query.length};
 // Candidate recall is deliberately broader than answer eligibility. Natural
 // questions contain words absent from short titles; the context model still
 // must approve every returned answer against the complete original question.
 }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(({id,score})=>({id,score}));
}
const cache=new Map<string,{source:SourceRecord;expires:number}>();
const pending=new Map<string,Promise<SourceRecord>>();
async function json(id:string,language:Language):Promise<Record<string,unknown>>{
 const response=await fetch(`https://hadeethenc.com/api/v1/hadeeths/one/?language=${language}&id=${id}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000),redirect:'manual'});
 if(!response.ok||Number(response.headers.get('content-length')??0)>200000)throw Error('Source unavailable');
 const text=await response.text();if(text.length>200000)throw Error('Source too large');
 const raw=JSON.parse(text);if(!raw||String(raw.id)!==id)throw Error('Source identity mismatch');return raw;
}
export async function fetchIndexedSource(id:string,language:Language):Promise<SourceRecord>{
 if(!index.records.some(record=>record.id===id&&record.translations.includes(language)))throw Error('Unindexed source');
 const key=`${language}:${id}`,saved=cache.get(key);
 if(saved&&saved.expires>Date.now())return saved.source;
 const inflight=pending.get(key);if(inflight)return inflight;
 const operation=(async()=>{
  try {
  const [ar,translation]=await Promise.all([json(id,'ar'),language==='ar'?Promise.resolve(null):json(id,language)]);
  let source=parseSource(ar,id,'live',new Date().toISOString());
  if(translation){
   if(!Array.isArray(translation.translations)||!translation.translations.includes(language))throw Error('Translation unavailable');
   for(const field of ['title','hadeeth','grade','attribution'])if(typeof translation[field]!=='string'||!(translation[field] as string).trim())throw Error('Incomplete translation');
   source={...source,title:translation.title as string,hadith:translation.hadeeth as string,explanation:typeof translation.explanation==='string'?translation.explanation:'',grade:translation.grade as string,attribution:translation.attribution as string,language,canonicalUrl:`https://hadeethenc.com/${language}/browse/hadith/${id}`,apiUrl:`https://hadeethenc.com/api/v1/hadeeths/one/?language=${language}&id=${id}`};
  }
  if(cache.size>=128)cache.delete(cache.keys().next().value!);
  cache.set(key,{source,expires:Date.now()+600000});return source;
  } catch(error) {
   console.error('Publisher live fetch failed',language,id,error instanceof Error?error.message:'Unknown');
   const {raw,notice,version,retrievedAt}=await hadithSnapshot(id,language);
   if(language!=='ar'&&raw.lang!==language)throw Error('Snapshot language mismatch');
   const text=language==='ar'?(raw.hadith_text??raw.hadith_text_ar):raw.hadith_text;
   if(typeof text!=='string'||!text.trim())throw Error('Missing saved translation');
   const field=(name:string)=>typeof raw[name]==='string'?raw[name]:language==='ar'&&typeof raw[name+'_ar']==='string'?raw[name+'_ar']:'';
   const title=field('title');if(!title)throw Error('Missing translated title');
   const source:SourceRecord={id,title,hadith:text,explanation:field('explanation'),grade:field('grade'),attribution:field('takhrij'),references:[raw.takhrij_ar??raw.takhrij??''].filter(Boolean),language,publisher:'HadeethEnc.com',publisherNotice:notice,contentVersion:version,retrievedAt,accessMode:'snapshot',canonicalUrl:`https://hadeethenc.com/${language}/browse/hadith/${id}`,apiUrl:`https://hadeethenc.com/api/v1/hadeeths/one/?language=${language}&id=${id}`};
   cache.set(key,{source,expires:Date.now()+60000});return source;
  }
 })();
 pending.set(key,operation);try{return await operation;}finally{pending.delete(key);}
}
export async function searchSources(question:string,language:Language):Promise<{evidence:Evidence[];unavailable:boolean}>{
 let full:Awaited<ReturnType<typeof rankFullText>>=[];
 try{full=await rankFullText(question,language,9);}catch{/* The title index still supports a temporary asset failure. */}
 const teaching=teachingCandidates(question).filter(id=>index.records.some(r=>r.id===id&&r.translations.includes(language))).map(id=>({id,score:100}));
 const titles=rankSources(question,language).slice(0,3);
 const ranked:IndexedHit[]=[...new Map<string,IndexedHit>([...teaching,...full,...titles].map(hit=>[hit.id,hit])).values()].slice(0,12);
 const outcomes=await Promise.allSettled(ranked.map(async hit=>({source:hit.path?await collectionSource(hit,language):await fetchIndexedSource(hit.id,language),hit})));
 const evidence:Evidence[]=outcomes.flatMap(r=>r.status==='fulfilled'?[{source:r.value.source,excerpt:r.value.source.hadith,kind:'hadith' as const,score:r.value.hit.score}]:[]);
 return {evidence,unavailable:ranked.length>0&&evidence.length===0};
}
