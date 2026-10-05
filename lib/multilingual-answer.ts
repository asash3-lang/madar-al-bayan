import {copy,type Language} from './i18n';
import {snapshotSources} from './sources';
import type {SearchResponse,SourceRecord} from './types';
import {searchSources,fetchIndexedSource} from './source-search';
import {classifyPilotQuestion} from './retrieval';

// Shortcuts for the existing introductory examples; all other questions use
// the publisher's multilingual title index, followed by live text retrieval.
const aliases:Record<string,readonly string[]> = {
 '4560':['apa itu niat','apa arti niat dalam islam','نیت کیا ہے','اسلام میں نیت کیا ہے','نیت چیست','معنی نیت چیست','نیت در اسلام چیست','intention','intentions','niyyah','what is intention','what are intentions','what is intention in islam','what does intention mean in islam','define intention','explain intention','intention en islam','les intentions','que signifie l intention en islam','qu est ce que l intention','intencion','intenciones','que es la intencion','que significa la intencion en el islam','举意','什么是举意','伊斯兰教中的举意是什么','नीयत','नियत','नीयत क्या है','इस्लाम में नीयत का क्या अर्थ है'],
 '4563':['apa itu iman','apa itu ihsan','apa saja rukun iman','ایمان کیا ہے','احسان کیا ہے','ایمان کے ارکان کیا ہیں','ihsan','iman','faith','what is ihsan','what does ihsan mean','explain ihsan','what is faith','what is iman','what are the pillars of faith','pillars of faith','les piliers de la foi','quels sont les piliers de la foi','qu est ce que l ihsan','qu est ce que la foi','ihsane','que es el ihsan','que es la fe','cuales son los pilares de la fe','伊赫桑','什么是伊赫桑','什么是信仰','信仰的六大要素是什么','इहसान','ईमान','इहसान क्या है','ईमान क्या है','ईमान के स्तंभ क्या हैं'],
 '65000':['apa saja rukun islam','rukun islam','اسلام کے ارکان کیا ہیں','pillars of islam','five pillars of islam','what are the pillars of islam','what are the five pillars of islam','les piliers de l islam','quels sont les piliers de l islam','quels sont les cinq piliers de l islam','cuales son los pilares del islam','cuales son los cinco pilares del islam','los pilares del islam','伊斯兰五功','伊斯兰教的五功是什么','伊斯兰五功是什么','इस्लाम के स्तंभ क्या हैं','इस्लाम के पांच स्तंभ क्या हैं','इस्लाम के पाँच स्तंभ क्या हैं'],
};
function normalizeQuery(q:string){return q.normalize('NFKC').toLowerCase().replace(/[áàâäãå]/g,'a').replace(/[éèêë]/g,'e').replace(/[íìîï]/g,'i').replace(/[óòôö]/g,'o').replace(/[úùûü]/g,'u').replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();}
export function translatedSourceId(q:string):string|undefined {
 const key=normalizeQuery(q);return Object.keys(aliases).find(id=>aliases[id].some(alias=>normalizeQuery(alias)===key));
}
const cache=new Map<string,{expires:number,source:SourceRecord}>();
export function parseTranslation(raw:unknown,original:SourceRecord,language:Language):SourceRecord{
 if(!raw||typeof raw!=='object')throw Error('Invalid translation');
 const obj=raw as Record<string,unknown>;
 if(String(obj.id)!==original.id||!Array.isArray(obj.translations)||!obj.translations.includes(language))throw Error('Translation identity mismatch');
 for(const field of ['title','hadeeth','grade','attribution'])if(typeof obj[field]!=='string'||!(obj[field] as string).trim())throw Error('Missing translation field');
 // Bibliography remains explicitly Arabic; the API does not translate it.
 return {...original,title:obj.title as string,hadith:obj.hadeeth as string,explanation:typeof obj.explanation==='string'?obj.explanation:'',grade:obj.grade as string,attribution:obj.attribution as string,language,
   canonicalUrl:`https://hadeethenc.com/${language}/browse/hadith/${original.id}`,apiUrl:`https://hadeethenc.com/api/v1/hadeeths/one/?language=${language}&id=${original.id}`,
   retrievedAt:new Date().toISOString(),contentVersion:typeof obj.version==='string'?obj.version:null,accessMode:'live'};
}
export async function translatedAnswer(question:string,language:Exclude<Language,'ar'>):Promise<SearchResponse>{
 const start=Date.now(),t=copy[language],id=translatedSourceId(question);
 const result:SearchResponse={question,language,status:'insufficient',message:t.insufficient,evidence:[],dataMode:'live',durationMs:0,generationEnabled:false,analysis:{topic:id??'source-search',stance:'question',level:'B',reason:'Related published source texts; not a religious verdict or a general classifier.',method:'pilot-rules'},answer:[],generationStatus:'disabled',generatedBy:null};
 if(question.trim().length>2&&classifyPilotQuestion(question)!=='search'){result.durationMs=Date.now()-start;return result;}
 if(id){try{
   const key=`${language}:${id}`,cached=cache.get(key);
   let source:SourceRecord;
   if(cached&&cached.expires>Date.now())source=cached.source;
   else{
    const original=snapshotSources().find(s=>s.id===id);if(!original)throw Error('Missing original');
    const response=await fetch(`https://hadeethenc.com/api/v1/hadeeths/one/?language=${language}&id=${id}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'manual'});
    if(!response.ok||Number(response.headers.get('content-length')??0)>200000)throw Error('Source unavailable');
    const text=await response.text();if(text.length>200000)throw Error('Source too large');
    source=parseTranslation(JSON.parse(text),original,language);cache.set(key,{source,expires:Date.now()+600000});
   }
   result.status='found';result.message='';result.evidence=[{source,excerpt:source.hadith,kind:'hadith',score:1}];
 }catch{result.message=t.unavailable;}}
 else {
  const found=await searchSources(question,language);
  result.evidence=found.evidence;
  if(found.evidence.length){result.status='found';result.message='';result.analysis.topic='Source title search';}
  else if(found.unavailable)result.message=t.unavailable;
 }
 if(id&&result.status!=='found'){try{const source=await fetchIndexedSource(id,language);result.evidence=[{source,excerpt:source.hadith,kind:'hadith',score:1}];result.status='found';result.message='';}catch{}}
 const modes=new Set(result.evidence.map(e=>e.source.accessMode));result.dataMode=modes.size>1?'mixed':modes.has('snapshot')?'snapshot':'live';
 result.durationMs=Date.now()-start;return result;
}
