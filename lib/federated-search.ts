import {understandQuestion} from './query-understanding';
import {analyzeQuestion} from './policy';
import {type ModelSettings} from './answer-service';
import {searchSources} from './source-search';
import {searchQuran} from './quran-search';
import {suggestQuery} from './search-suggestions';
import {classifyPilotQuestion} from './retrieval';
import {copy,type Language} from './i18n';
import type {SearchResponse} from './types';
import {rankByContext,exactIntent} from './context-ranking';
import {fetchIndexedSource,exactSourceTitle} from './source-search';
import {additionalPublisherEvidence,verseReference,tafsirReference} from './publisher-adapters';
import {directTopic} from './direct-topics';
import type {Evidence} from './types';
async function directAnswer(question:string,language:Language,settings:ModelSettings,start:number):Promise<SearchResponse|null>{
 const topic=directTopic(question),intent=exactIntent(question),titleId=exactSourceTitle(question,language),verse=verseReference(question),tafsir=tafsirReference(question);
 if(!topic&&!intent&&!titleId&&!verse&&!tafsir)return null;
 const ids=[...new Set(topic?.hadithIds??[intent??titleId].filter((x):x is string=>!!x))];
 const jobs:Promise<Evidence[]>[]=ids.map(async id=>{const source=await fetchIndexedSource(id,language);return [{source,excerpt:source.hadith,kind:'hadith' as const,score:100}];});
 if(topic?.verse)jobs.push(searchQuran(`${topic.verse.sura}:${topic.verse.aya}`,language));
 if(verse)jobs.push(searchQuran(question,language));
 if(verse||tafsir)jobs.push(additionalPublisherEvidence(question,language));
 // A failed/untranslated record cannot suppress another verified record.
 const outcomes=await Promise.allSettled(jobs),candidates=outcomes.flatMap(r=>r.status==='fulfilled'?r.value:[]).filter(e=>e.source.language===language);
 const ranked=await rankByContext(question,candidates,settings),evidence=ranked.evidence,modes=new Set(evidence.map(e=>e.source.accessMode));
 return {question,language,status:evidence.length?'found':'insufficient',message:evidence.length?'':copy[language].unavailable,evidence,dataMode:modes.size>1?'mixed':modes.has('snapshot')?'snapshot':'live',durationMs:Date.now()-start,generationEnabled:false,analysis:{topic:topic?.name??intent??titleId??'exact-reference',stance:'question',level:'B',reason:'Exact publisher reference or bounded introductory lookup; no generated answer.',method:'pilot-rules'},answer:[],generationStatus:'disabled',generatedBy:null,contextMode:evidence.length?ranked.mode:'source-unavailable'};
}
export async function answerFromSources(question:string,language:Language='en',settings:ModelSettings={}):Promise<SearchResponse>{
 const start=Date.now();
 const direct=await directAnswer(question,language,settings,start);if(direct?.evidence.length)return direct;
 const analysis=analyzeQuestion(question),policy=classifyPilotQuestion(question);
 const result:SearchResponse={question,language,status:'insufficient',message:copy[language].insufficient,evidence:[],dataMode:'snapshot',durationMs:0,generationEnabled:false,analysis,answer:[],generationStatus:'disabled',generatedBy:null};
 if(policy==='referral'||analysis.level==='D'){result.status='referral';result.durationMs=Date.now()-start;return result;}
 if(policy==='clarify'||policy==='insufficient'){result.status=policy==='clarify'?'clarify':'insufficient';result.durationMs=Date.now()-start;return result;}
 // Source retrieval and question understanding overlap. The plan improves
 // candidate recall; only the unchanged ORIGINAL question determines eligibility.
 const initial=searchSources(question,language);
 const quran=searchQuran(question,language);
 const understanding=understandQuestion(question,language,settings);
 const plan=await understanding;
 if(plan.requiresReview){await Promise.allSettled([initial,quran]);result.status='referral';result.durationMs=Date.now()-start;return result;}
 const refined=plan.mode==='astra'?searchSources(plan.queries.join(' '),language):Promise.resolve({evidence:[] as Evidence[],unavailable:false});
 const extras=additionalPublisherEvidence(plan.mode==='astra'?plan.queries[0]:question,language);
 const [base,better,verses,additional]=await Promise.all([initial,refined,quran,extras]);
 const pools=new Map<string,Evidence[]>();
 for(const item of [...base.evidence,...better.evidence,...additional,...verses]){
  if(item.source.language!==language)continue;
  const pool=pools.get(item.source.publisher)??[];
  if(!pool.some(e=>e.source.id===item.source.id))pool.push(item);
  pools.set(item.source.publisher,pool);
 }
 const candidates:Evidence[]=[];
 for(let round=0;round<12;round++)for(const pool of pools.values())if(pool[round])candidates.push(pool[round]);
 const ranked=await rankByContext(question,candidates.slice(0,16),settings);
 result.evidence=ranked.evidence;result.contextMode=ranked.mode;
 if(analysis.level==='C'&&ranked.mode==='semantic'&&ranked.evidence.length)result.analysis={...analysis,level:'B',method:'model',reason:'سؤال معرفي عام؛ اختار فحص السياق مقاطع مرجعية مرتبطة به، دون إصدار حكم شخصي.'};
 result.status=result.evidence.length?'found':'insufficient';
 result.message=result.evidence.length?'':ranked.mode==='context-unavailable'||base.unavailable?copy[language].unavailable:copy[language].insufficient;
 result.queryUnderstanding=plan.mode;
 const suggestion=exactIntent(question)?undefined:suggestQuery(question,language);if(suggestion)result.suggestion=suggestion;
 const modes=new Set(result.evidence.map(e=>e.source.accessMode));result.dataMode=modes.size>1?'mixed':modes.has('snapshot')?'snapshot':'live';
 result.durationMs=Date.now()-start;return result;
}
