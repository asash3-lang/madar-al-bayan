import {readPublisher} from './publisher-http';
import {publisherAsset} from './publisher-assets';
import {normalize,searchTerms} from './source-search';
import type {Language} from './i18n';
import type {Evidence,SourceRecord} from './types';
type Index={terms:Record<string,string[]>;meta:{key:string;title:string;description:string;version:string};retrievedAt:string;count:number;scope?:string};
const cached=new Map<string,Index>();
async function getIndex(language:Language):Promise<Index>{
 const hit=cached.get(language);if(hit)return hit;
 const data=await publisherAsset(`/sources/quran/${language}/index.json`) as Index;
 if(!data.terms||!Number.isInteger(data.count)||data.count<0||data.count>6236||(data.count!==6236&&data.scope!=='local-starter'))throw Error('Invalid Quran index');
 if(cached.size>=3)cached.delete(cached.keys().next().value!);cached.set(language,data);return data;
}
export async function searchQuran(question:string,language:Language):Promise<Evidence[]>{
 if(!['ar','en','fr','es','zh','hi','fa','id','ur'].includes(language))return [];
 try{
  const index=await getIndex(language),arabic=language==='ar'?index:await getIndex('ar');
  const short=normalize(question).trim(),direct=short.match(/^(\d{1,3})\s*[:：]\s*(\d{1,3})$/);
  const query=searchTerms(question),scores=new Map<string,{score:number;groups:Set<number>}>();
  if(direct)scores.set(`${Number(direct[1])}:${Number(direct[2])}`,{score:100,groups:new Set([0])});
  else {
   const groups=short.length<=2&&query.every(group=>group.length<=1)?[[short]]:query;
   groups.forEach((group,n)=>{
    const best=new Map<string,number>();
    for(const term of group)for(const source of [index,arabic]){
     const variants=short.length<=2?Object.keys(source.terms).filter(t=>t.startsWith(term)):[term,'ال'+term,'و'+term,'وال'+term];
     for(const variant of variants){const ids=source.terms[variant]??[];const weight=Math.log(1+Math.max(index.count,1)/Math.max(ids.length,1));for(const id of ids)best.set(id,Math.max(best.get(id)??0,weight));}
    }
    for(const [id,score] of best){const value=scores.get(id)??{score:0,groups:new Set<number>()};value.score+=score;value.groups.add(n);scores.set(id,value);}
   });
  }
  const hits=[...scores].filter(([,s])=>direct||s.groups.size>=Math.max(1,Math.ceil(query.length/2))).sort((a,b)=>b[1].score-a[1].score).slice(0,2);
  const outcomes=await Promise.allSettled(hits.map(async([id,rank])=>{
   const [sura,aya]=id.split(':').map(Number);
   const data=await publisherAsset(`/sources/quran/${language}/${sura}.json`),row=data.records[id];if(!row||row.sura!==sura||row.aya!==aya)throw Error('Quran verse identity mismatch');
   const title=language==='ar'?`القرآن الكريم ${sura}:${aya}`:`Qur’an ${sura}:${aya}`;
   const source:SourceRecord={id:`quran:${id}`,sourceType:'quran',title,hadith:row.translation,explanation:row.footnotes,grade:'',attribution:'QuranEnc.com',references:[index.meta.title],canonicalUrl:`https://quranenc.com/${language}/browse/${language==='ar'?'english_rwwad':index.meta.key}/${sura}#${aya}`,apiUrl:`https://quranenc.com/api/v1/translation/aya/${language==='ar'?'english_rwwad':index.meta.key}/${sura}/${aya}`,publisher:'QuranEnc.com',language,retrievedAt:data.retrievedAt,contentVersion:index.meta.version,accessMode:'snapshot',originalArabic:row.arabic_text,publisherNotice:`${index.meta.title}\n${index.meta.description}\nVersion: ${index.meta.version}\nSource: QuranEnc.com`};
   source.verse={sura,aya};
   try{const [live,translations]=await Promise.all([readPublisher(source.apiUrl),readPublisher('https://quranenc.com/api/v1/translations/list',{ttl:3600000})]);const meta=translations.translations?.find((m:any)=>m.key===(language==='ar'?'english_rwwad':index.meta.key));const r=live.result;if(!meta?.version||Number(r?.sura)!==sura||Number(r?.aya)!==aya||typeof r.translation!=='string'||typeof r.arabic_text!=='string')throw Error('Invalid Quran identity or version');source.hadith=language==='ar'?r.arabic_text:r.translation;source.explanation=r.footnotes??'';source.originalArabic=r.arabic_text;source.contentVersion=String(meta.version);source.publisherNotice=`${meta.title}\n${meta.description??''}\nVersion: ${meta.version}\nSource: QuranEnc.com`;source.accessMode='live';source.retrievedAt=new Date().toISOString();}catch{/* Retain the official, versioned publisher snapshot. */}
   return {source,excerpt:source.hadith,kind:'hadith' as const,score:rank.score};
  }));
  return outcomes.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
 }catch(error){console.error('Quran source search unavailable',error instanceof Error?error.message:'Unknown');return [];}
}
