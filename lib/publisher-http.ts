// Publisher origins are fixed in code. Never follow a returned URL or a redirect.
const origins=new Set(['https://hadeethenc.com','https://quranenc.com','https://api.quranpedia.net','https://dev.surahapp.com','https://mp3quran.net','https://www.mp3quran.net','https://icadb.com','https://dorar.net','https://binbaz.org.sa','https://byenah.com','https://api3.islamhouse.com','https://siwar.ksaa.gov.sa','https://mcp.islamiccontent.org','https://shamela.ws']);
export class PublisherError extends Error {
 constructor(public reason:string,public status?:number){super(reason);this.name='PublisherError';}
}
const cache=new Map<string,{expires:number;value:unknown}>();
const pending=new Map<string,Promise<unknown>>();
export function assertPublisherUrl(value:string){
 const u=new URL(value);if(!origins.has(u.origin)||u.username||u.password||u.hash)throw new PublisherError('unapproved-origin');return u;
}
export async function readPublisher(url:string,options:{headers?:Record<string,string>;ttl?:number;maxBytes?:number;timeoutMs?:number;format?:'json'|'html'}={}):Promise<any>{
 assertPublisherUrl(url);
 const ttl=options.ttl??300000,key=JSON.stringify([url,options.headers??{},options.format??'json']),old=cache.get(key);
 if(old&&old.expires>Date.now())return old.value;
 if(pending.has(key))return pending.get(key);
 const task=(async()=>{
  let response:Response;
  try{response=await fetch(url,{headers:{Accept:options.format==='html'?'text/html':'application/json',...options.headers},redirect:'manual',signal:AbortSignal.timeout(Math.min(options.timeoutMs??7000,25000))});}catch{throw new PublisherError('network-or-timeout');}
  if(!response.ok)throw new PublisherError('publisher-http-error',response.status);
  const limit=options.maxBytes??2000000;
  if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw new PublisherError('response-too-large');}
  const reader=response.body?.getReader();if(!reader)throw new PublisherError('empty-response');
  const decoder=new TextDecoder();let text='',size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new PublisherError('response-too-large');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  let value:unknown;try{value=options.format==='html'?text:JSON.parse(text);}catch{throw new PublisherError('invalid-json',response.status);}
  if(ttl>0){if(cache.size>=80)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+ttl,value});}
  return value;
 })();
 pending.set(key,task);try{return await task;}finally{pending.delete(key);}
}
export function plainText(value:unknown):string {
 if(typeof value!=='string')return '';
 return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/(?:p|div|li|h[1-6]|tr)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'')
 .replace(/&#(x[0-9a-f]+|\d+);/gi,(all,n)=>{const i=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return i>0&&i<=0x10ffff?String.fromCodePoint(i):all;})
 .replace(/&(nbsp|quot|apos|lt|gt|amp);/g,(_,e)=>({nbsp:' ',quot:'"',apos:"'",lt:'<',gt:'>',amp:'&'}[e as 'amp']??''))
 .replace(/[ \t]+/g,' ').replace(/\n\s*\n\s*\n/g,'\n\n').trim();
}
export function requireText(value:unknown){const t=plainText(value);if(!t)throw new PublisherError('missing-source-text');return t;}
export function requireArray(value:unknown):any[]{if(!Array.isArray(value))throw new PublisherError('invalid-publisher-payload');return value;}
export function languageCode(value:unknown){return typeof value==='string'?value.toLowerCase().replace('_','-').split('-')[0]:'';}
