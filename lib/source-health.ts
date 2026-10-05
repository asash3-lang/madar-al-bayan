import {publisherAsset,hadithSnapshot} from './publisher-assets';
import {modelSettings} from './runtime-model';
import catalog from './resource-catalog.json';
import {publisherIntegrations,integrationLabel} from './publisher-registry';
import {readPublisher,requireText,plainText,PublisherError} from './publisher-http';
import {quranpediaVerse,quranpediaTafsir,surahTafsir,recitationForSurah,searchIcadb,dorarSearch,byenahItem,islamhouseLibrary,savedByenah} from './publisher-adapters';
import {siwarConfigured,siwarLexicons} from './siwar-source';
import {probeMcp,mcpHadithIds} from './publisher-mcp';
type Probe={ok:boolean;checkedAt:string;status:'connected'|'catalog-connected'|'unavailable'|'needs-key'|'metadata-only';httpStatus?:number;reason?:string;records?:number;fields?:string[]};
const languages=['ar','en','fr','es','zh','hi','fa','id','ur'];
async function snapshots(kind:'hadith'|'quran'|'byenah'){
 return Promise.all((kind==='byenah'?languages.slice(0,7):languages).map(async language=>{
  try{
   if(kind==='byenah'){if(!(await savedByenah(language)).length)throw Error('empty');}
   else if(kind==='hadith'){const {raw}=await hadithSnapshot('4560',language);if(!String(raw.hadith_text??raw.hadith_text_ar??'').trim())throw Error('empty');}
   else{const [index,sura]=await Promise.all([publisherAsset(`/sources/quran/${language}/index.json`),publisherAsset(`/sources/quran/${language}/1.json`)]);if(index.count!==6236||sura.records['1:1']?.sura!==1||!String(sura.records['1:1']?.translation??'').trim())throw Error('invalid');}
   return {language,ok:true};
  }catch{return {language,ok:false};}
 }));
}
async function probe(id:number,run:()=>Promise<number>):Promise<Probe>{
 const checkedAt=new Date().toISOString();
 try{const records=await run();if(!records)return {ok:false,status:'metadata-only',checkedAt,reason:'no-verified-content',records:0};return {ok:true,status:id===9?'catalog-connected':'connected',httpStatus:200,checkedAt,records};}
 catch(error){
  const reason=error instanceof PublisherError?error.reason:'invalid-publisher-payload';
  const result:Probe={ok:false,status:reason==='missing-api-key'?'needs-key':'unavailable',checkedAt,reason,...(error instanceof PublisherError&&error.status?{httpStatus:error.status}:{})};
  if(id===4&&reason==='missing-source-text'){try{const r=await readPublisher('https://dev.surahapp.com/api/v1/aya/tafsir-saadi/1/1');result.fields=Object.keys(Array.isArray(r)?r[0]??{}:r).slice(0,20);}catch{}}
  return result;
 }
}
let cached:{expires:number;report:any}|undefined;
let pending:Promise<any>|undefined;
export async function sourceHealth():Promise<any>{
 if(cached&&cached.expires>Date.now())return cached.report;if(pending)return pending;
 pending=(async()=>{
  const checks:Record<number,()=>Promise<number>>={
   1:async()=>{const d=await readPublisher('https://quranenc.com/api/v1/translation/aya/english_saheeh/1/1');if(String(d.result?.sura)!=='1'||String(d.result?.aya)!=='1')throw new PublisherError('verse-identity-mismatch');requireText(d.result.translation);return 1;},
   2:async()=>{const d=await readPublisher('https://hadeethenc.com/api/v1/hadeeths/one/?language=en&id=4560');if(String(d.id)!=='4560')throw new PublisherError('source-identity-mismatch');requireText(d.hadeeth);return 1;},
   3:async()=>(await quranpediaVerse(1,1,'en')).length+(await quranpediaTafsir(1,1)).length,
   4:async()=>(await surahTafsir(1,1)).length,
   5:async()=>{await recitationForSurah(1,'en');return 1;},
   6:async()=>(await searchIcadb('What is Islam?','en')).length,
   7:async()=>(await dorarSearch('إنما الأعمال بالنيات')).length,
   8:async()=>(await byenahItem(25154,'en')).length,
   9:async()=>(await islamhouseLibrary('en')).items.length,
   27:async()=>{const data=await publisherAsset('/sources/collections/ar/binbaz-000.json'),sample:any=Object.values(data.records??{})[0];if(sample?.publisher!=='BinBaz.org.sa'||sample.language!=='ar'||!sample.hadith?.trim())throw Error('invalid');const html=await readPublisher(sample.canonicalUrl,{format:'html'});if(!plainText(html).includes(sample.title))throw Error('source-identity-mismatch');return 1;},
   11:async()=>{await siwarLexicons();return siwarConfigured()?1:0;},
   12:async()=>{const [r,ids]=await Promise.all([probeMcp('https://mcp.islamiccontent.org/mcp'),mcpHadithIds('الأعمال بالنيات','ar')]);return r.contentVerified&&ids.length?1:0;},
   16:async()=>{const r=await probeMcp('https://shamela.ws/mcp');return r.contentVerified?1:0;},
  };
  const [hadithSaved,quranSaved,byenahSaved,live]=await Promise.all([snapshots('hadith'),snapshots('quran'),snapshots('byenah'),Promise.all(publisherIntegrations.map(async p=>({id:p.id,...await probe(p.id,checks[p.id])}))) ]);
  const sources=publisherIntegrations.map(p=>({id:p.id,publisher:p.name,capability:p.capability,mode:[1,2,8].includes(p.id)?'live-with-official-snapshot-fallback':p.id===27?'official-publisher-snapshot':p.id===5?'audio-catalog':p.id===9?'article-catalog':p.id===11?'dictionary-api':[12,16].includes(p.id)?'mcp-content-probe':'live-api',live:live.find(x=>x.id===p.id)!,saved:p.id===1?quranSaved:p.id===2?hadithSaved:p.id===8?byenahSaved:[]}));
  const report={checkedAt:new Date().toISOString(),contextConfigured:!!modelSettings().key,integratedSources:sources,
   catalog:catalog.rows.map(row=>({id:row.id,name:row.name,url:row.url,integration:integrationLabel(row.id)})),
   scope:'Known-record content probes, not an audit of entire corpora. MP3Quran validates the recording catalog URL, not all audio bytes. IslamHouse searches a bounded recent articles page. MCP gateways are not additional independent sources.',cacheSeconds:120};
  cached={expires:Date.now()+120000,report};return report;
 })();try{return await pending;}finally{pending=undefined;}
}
