import {assertPublisherUrl,PublisherError} from './publisher-http';
async function mcpClient(endpoint:'https://mcp.islamiccontent.org/mcp'|'https://shamela.ws/mcp'){
 assertPublisherUrl(endpoint);let session:string|null=null,version='2025-03-26',id=0;
 async function rpc(method:string,params:unknown,notification=false){
  const headers:Record<string,string>={'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':version};if(session)headers['Mcp-Session-Id']=session;
  let r:Response;try{r=await fetch(endpoint,{method:'POST',headers,redirect:'manual',signal:AbortSignal.timeout(6500),body:JSON.stringify({jsonrpc:'2.0',...(!notification?{id:++id}:{}),method,params})});}catch{throw new PublisherError('mcp-network-or-timeout');}
  if(!r.ok)throw new PublisherError('mcp-http-error',r.status);session=r.headers.get('Mcp-Session-Id')??session;
  if(notification){await r.body?.cancel();return {};}
  const text=await r.text();if(text.length>500000)throw new PublisherError('mcp-response-too-large');
  const data=text.trim().startsWith('{')?JSON.parse(text):text.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>{try{return JSON.parse(l.slice(5).trim());}catch{return null;}}).find(x=>x?.id===id);
  if(!data||data.error||data.result?.isError)throw new PublisherError('mcp-content-error');return data.result;
 }
 const initialized=await rpc('initialize',{protocolVersion:version,capabilities:{},clientInfo:{name:'Madar-Al-Bayan',version:'1.0'}});version=initialized.protocolVersion??version;
 await rpc('notifications/initialized',{},true);
 return {rpc};
}
export async function probeMcp(endpoint:'https://mcp.islamiccontent.org/mcp'|'https://shamela.ws/mcp'){
 const {rpc}=await mcpClient(endpoint);
 const list=await rpc('tools/list',{});if(!Array.isArray(list.tools))throw new PublisherError('invalid-mcp-tools');
 if(endpoint.includes('shamela.ws'))return {stage:'tools-only',tools:list.tools.map((t:any)=>String(t.name)).slice(0,30),contentVerified:false};
 if(!list.tools.some((t:any)=>t.name==='get_hadith'))throw new PublisherError('mcp-tool-unavailable');
 const result=await rpc('tools/call',{name:'get_hadith',arguments:{id:4560,language:'ar'}});
 const text=(result.content??[]).filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('\n');
 if(!text.includes('4560')||!text.includes('الأعمال'))throw new PublisherError('mcp-content-not-verified');
 return {stage:'content',contentVerified:true,tools:list.tools.map((t:any)=>String(t.name)).slice(0,30)};
}
export function hadithIdsFromMcp(result:unknown,language:string):string[]{
 const r=result as {structuredContent?:unknown;content?:{type:string;text?:string}[]};
 let data:any=r?.structuredContent;
 if(!data){const text=r?.content?.filter(c=>c.type==='text').map(c=>c.text??'').join('\n');if(!text)throw new PublisherError('invalid-mcp-search');try{data=JSON.parse(text);}catch{throw new PublisherError('invalid-mcp-search');}}
 if(!Array.isArray(data.results))throw new PublisherError('invalid-mcp-search');
 return [...new Set<string>(data.results.flatMap((row:any)=>{
  try{const u=new URL(row.url);const match=u.pathname.match(/^\/([a-z]{2,3})\/browse\/hadith\/(\d+)\/?$/);return u.origin==='https://hadeethenc.com'&&!u.username&&!u.password&&match?.[1]===language?[match[2]]:[];}catch{return [];}
 }))].slice(0,3);
}
const searches=new Map<string,{expires:number;ids:string[]}>();
export async function mcpHadithIds(question:string,language:string):Promise<string[]>{
 const key=JSON.stringify([question,language]),hit=searches.get(key);if(hit&&hit.expires>Date.now())return hit.ids;
 const {rpc}=await mcpClient('https://mcp.islamiccontent.org/mcp');
 const result=await rpc('tools/call',{name:'search',arguments:{query:question,sources:['hadith'],language,limit:3}});
 const ids=hadithIdsFromMcp(result,language);if(searches.size>=60)searches.delete(searches.keys().next().value!);searches.set(key,{expires:Date.now()+300000,ids});return ids;
}
