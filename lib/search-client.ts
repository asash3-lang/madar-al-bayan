import type {SearchResponse} from './types';

type SearchRequestOptions={fetch?:typeof fetch;timeoutMs?:number};
const statuses=new Set(['found','insufficient','referral','clarify']);
const modes=new Set(['live','snapshot','mixed']);
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(x=>typeof x==='string');

function validPayload(value:unknown,question:string):value is SearchResponse{
 if(!object(value)||value.question!==question||!statuses.has(String(value.status))||typeof value.language!=='string'||typeof value.message!=='string'||!modes.has(String(value.dataMode))||!Array.isArray(value.evidence)||!Array.isArray(value.answer))return false;
 if(!Number.isFinite(value.durationMs)||Number(value.durationMs)<0||typeof value.generationEnabled!=='boolean'||!['disabled','generated','unavailable','not-applicable'].includes(String(value.generationStatus))||!(value.generatedBy===null||typeof value.generatedBy==='string'))return false;
 const analysis=value.analysis;
 if(!object(analysis)||!['topic','reason'].every(k=>typeof analysis[k]==='string')||!['A','B','C','D'].includes(String(analysis.level))||!['question','affirmation','negation','unclear'].includes(String(analysis.stance))||!['pilot-rules','model'].includes(String(analysis.method)))return false;
 if(value.contextMode!==undefined&&typeof value.contextMode!=='string')return false;
 if(value.suggestion!==undefined&&(!object(value.suggestion)||typeof value.suggestion.text!=='string'||typeof value.suggestion.language!=='string'))return false;
 return value.answer.every(row=>object(row)&&typeof row.text==='string'&&strings(row.evidenceIds))&&value.evidence.every(row=>{
  if(!object(row)||typeof row.excerpt!=='string'||!['hadith','explanation'].includes(String(row.kind))||!object(row.source))return false;
  const s=row.source;
  return ['id','title','hadith','explanation','grade','attribution','canonicalUrl','apiUrl','publisher','language','retrievedAt'].every(k=>typeof s[k]==='string')&&strings(s.references)&&['live','snapshot'].includes(String(s.accessMode))&&(s.contentVersion===null||typeof s.contentVersion==='string');
 });
}

class SearchFailure extends Error{constructor(readonly retryable=false){super('Search request failed');}}
function transientNetwork(error:unknown){return error instanceof TypeError||error instanceof Error&&error.name==='NetworkError';}

// Only the read-only search POST is retried. Referral, contact and admin writes
// must never share this helper. Both attempts share one total time budget.
export async function requestSearch(question:string,language:string,errorMessage:string,options:SearchRequestOptions={}):Promise<SearchResponse>{
 const q=question.trim();if(!q||q.length>1000)throw new Error(errorMessage);
 const fetcher=options.fetch??globalThis.fetch;
 const timeoutMs=Number.isFinite(options.timeoutMs)?Math.max(1,Math.min(120000,options.timeoutMs!)):120000;
 const controller=new AbortController();let timeout:ReturnType<typeof setTimeout>;
 const deadline=new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new SearchFailure());},timeoutMs);});
 const bounded=<T>(operation:Promise<T>)=>Promise.race([operation,deadline]);
 try{
  for(let attempt=0;attempt<2;attempt++){
   try{
    let response:Response;
    try{response=await bounded(fetcher('/api/ask',{method:'POST',redirect:'manual',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({question:q,language}),signal:controller.signal}));}
    catch(error){throw new SearchFailure(!controller.signal.aborted&&transientNetwork(error));}
    // Do not retry sign-in redirects or protection challenges under another path.
    if(response.redirected||response.type==='opaqueredirect'||response.type==='opaque'||response.status>=300&&response.status<400||response.headers.has('cf-mitigated'))throw new SearchFailure();
    if(!response.ok)throw new SearchFailure([502,503,504].includes(response.status));
    const contentType=(response.headers.get('content-type')??'').split(';',1)[0].trim().toLowerCase();
    if(!/^application\/(?:json|[a-z0-9!#$&^_.+-]+\+json)$/.test(contentType))throw new SearchFailure(true);
    let data:unknown;
    try{data=await bounded(response.json());}
    catch(error){throw new SearchFailure(!controller.signal.aborted&&(error instanceof SyntaxError||transientNetwork(error)));}
    if(!validPayload(data,q))throw new SearchFailure();
    return data;
   }catch(error){
    if(controller.signal.aborted||attempt===1||!(error instanceof SearchFailure)||!error.retryable)throw new Error(errorMessage);
   }
  }
  throw new Error(errorMessage);
 }catch{throw new Error(errorMessage);}
 finally{clearTimeout(timeout!);controller.abort();}
}
