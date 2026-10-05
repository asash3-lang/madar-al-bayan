import {readPublisher,plainText,requireText,requireArray,languageCode,PublisherError} from './publisher-http';
import {searchTerms,normalize,fetchIndexedSource} from './source-search';
import type {Evidence,SourceRecord} from './types';
import {publisherAsset} from './publisher-assets';
import {mcpHadithIds} from './publisher-mcp';
import type {Language} from './i18n';

// This is the public, free demonstration key published by the provider in its
// official Postman collection. It is not a user's secret or a private account key.
const IH='https://api3.islamhouse.com/v3/paV29H2gm56kvLPy';
const QP='https://api.quranpedia.net/v1';
const BY='https://byenah.com';
export function verseReference(question:string){
 const m=question.trim().match(/^(\d{1,3})\s*[:：]\s*(\d{1,3})$/);if(!m)return null;
 const sura=Number(m[1]),aya=Number(m[2]);return sura>=1&&sura<=114&&aya>=1&&aya<=286?{sura,aya}:null;
}
export function tafsirReference(question:string){const m=question.trim().match(/^تفسير(?:\s+السعدي|\s+الآية)?\s+(\d{1,3}\s*[:：]\s*\d{1,3})$/);return m?verseReference(m[1]):null;}
function source(publisher:string,id:string,language:string,text:string,title:string,url:string,extra:Partial<SourceRecord>={}):SourceRecord{
 return {id,publisher,language,title,hadith:text,explanation:'',grade:'',attribution:publisher,references:[],canonicalUrl:url,apiUrl:url,retrievedAt:new Date().toISOString(),contentVersion:null,accessMode:'live',sourceType:'text',...extra};
}
function evidence(s:SourceRecord):Evidence{return {source:s,excerpt:s.hadith,kind:'hadith',score:0};}
function termsScore(text:string,question:string){const t=normalize(text);return searchTerms(question).reduce((n,group)=>n+(group.some(term=>t.includes(term))?1:0),0);}
// Passage selection only gathers candidates. It never approves an answer.
function passages(s:SourceRecord,question:string,max=2):Evidence[]{
 const chunks=s.hadith.split(/\n\s*\n|\n/).filter(t=>t.trim().length>40);
 if(s.hadith.length<=8000)return [evidence(s)];
 let offset=0;const spans:{text:string;start:number;score:number}[]=[];
 for(const chunk of chunks){const start=s.hadith.indexOf(chunk,offset);offset=start+chunk.length;spans.push({text:chunk,start,score:termsScore(chunk,question)});}
 return spans.filter(x=>x.score>0&&x.text.length<=14000).sort((a,b)=>b.score-a.score).slice(0,max).map(x=>evidence({...s,id:`${s.id}:p${x.start}`,hadith:x.text,references:[...s.references,`Text offset: ${x.start}`]}));
}

export async function quranpediaVerse(sura:number,aya:number,language:string):Promise<Evidence[]>{
 const url=`${QP}/mushafs/1/${sura}/${aya}`,raw=await readPublisher(url,{timeoutMs:15000});
 if(Number(raw.number)!==aya||Number(raw.surah)!==sura)throw new PublisherError('verse-identity-mismatch');
 const arabic=requireText(raw.text),ref={sura,aya};
 if(language==='ar')return [evidence(source('Quranpedia.net',`quranpedia:${sura}:${aya}`,'ar',arabic,`القرآن الكريم ${sura}:${aya}`,url,{sourceType:'quran',verse:ref,originalArabic:arabic,canonicalUrl:url}))];
 const translationUrl=`${QP}/translations/${sura}/${aya}/${encodeURIComponent(language)}`;
 const rows=requireArray(await readPublisher(translationUrl));
 return rows.slice(0,2).map(r=>evidence(source('Quranpedia.net',`quranpedia:${r.book?.id}:${sura}:${aya}`,language,requireText(r['translation-content']),`${requireText(r.book?.name)} · ${sura}:${aya}`,translationUrl,{sourceType:'quran',verse:ref,originalArabic:arabic,references:[requireText(r.book?.name)],canonicalUrl:translationUrl})));
}
export async function quranpediaTafsir(sura:number,aya:number):Promise<Evidence[]>{
 const url=`${QP}/ayah/${sura}/${aya}/book/1`,raw=await readPublisher(url,{timeoutMs:15000});
 if(Number(raw.book?.id)!==1||languageCode(raw.book?.language?.code)!=='ar')throw new PublisherError('source-identity-mismatch');
 const text=requireArray(raw.content).map(x=>requireText(x.text)).join('\n\n');if(!text)throw new PublisherError('missing-source-text');
 return [evidence(source('Quranpedia.net',`quranpedia:tafsir:1:${sura}:${aya}`,'ar',text,`${requireText(raw.book.name)} · ${sura}:${aya}`,url,{sourceType:'tafsir',verse:{sura,aya},attribution:plainText(raw.book.author?.full_name)||raw.book.name,references:raw.content.map((x:any)=>`${raw.book.name} · ${x.part??''}:${x.page??''}`)}))];
}
export async function surahTafsir(sura:number,aya:number):Promise<Evidence[]>{
 const url=`https://dev.surahapp.com/api/v1/aya/tafsir-saadi/${sura}/${aya}`,raw=await readPublisher(url,{timeoutMs:25000});
 const row=Array.isArray(raw)?raw[0]:raw;
 // The full publisher response is checked in the deployment integration probe.
 const text=requireText(row?.text??row?.content??row?.aya_text??row?.data?.text);
 const n=row?.sura??row?.sura_number??row?.surah_number, a=row?.aya??row?.aya_number;
 if(n!==undefined&&Number(n)!==sura||a!==undefined&&Number(a)!==aya)throw new PublisherError('verse-identity-mismatch');
 return [evidence(source('Surah',`surah:tafsir-saadi:${sura}:${aya}`,'ar',text,`تفسير السعدي · ${sura}:${aya}`,url,{sourceType:'tafsir',verse:{sura,aya},attribution:'عبد الرحمن بن ناصر السعدي',references:['تيسير الكريم الرحمن في تفسير كلام المنان']}))];
}
export async function searchIcadb(question:string,language:string):Promise<Evidence[]>{
 const url=`https://icadb.com/books/api/books/relevant-examples/${encodeURIComponent(language)}/?query=${encodeURIComponent(question)}&k=4`,raw=await readPublisher(url,{timeoutMs:25000});
 if(languageCode(raw.iso_code)!==language)throw new PublisherError('source-language-mismatch');
 return requireArray(raw.examples).flatMap(row=>{
  const book=plainText(typeof row.book==='string'?row.book:row.book?.title??row.book?.name);
  if(row.phrase_id==null)return [];
  const text=plainText(language==='ar'?row.source_text:row.target_text);if(!text)return [];
  // The live API can omit book and version despite their presence in its schema.
  // Attribute such excerpts to the database and its actual phrase ID, never an invented book.
  const title=book||`ICADB.com · ${row.phrase_id}`;
  return [evidence(source('ICADB.com',`icadb:${row.phrase_id}:${row.version??'unversioned'}`,language,text,title,url,{sourceType:'text',contentVersion:row.version==null?null:String(row.version),originalArabic:plainText(row.source_text),references:[...(book?[book]:[]),`ICADB.com · phrase_id: ${row.phrase_id}`],canonicalUrl:url}))];
 });
}
const acceptedDorarGrades=new Set(['صحيح','حسن','حسن صحيح','صحيح لغيره','حسن لغيره','اسناده صحيح','اسناده حسن','صحيح الاسناد','حسن الاسناد','متفق عليه']);
export function parseDorarSearch(html:string,url:string):Evidence[]{
 const cards=html.split(/<div\s+class=["']border-bottom py-4[^"']*["'][^>]*>/i).slice(1);
 if(!cards.length){if(/لا توجد نتائج|لم يتم العثور/.test(html))return [];throw new PublisherError('unrecognized-hadith-markup');}
 const records=new Map<string,Evidence>();
 for(const card of cards){
  const body=card.match(/<article\b[^>]*>[\s\S]*?<h5\b[^>]*>([\s\S]*?)<\/h5>/i)?.[1];
  const link=card.match(/<a\b[^>]*tag=["']([a-zA-Z0-9]+)["'][^>]*href=["']https:\/\/dorar\.net\/h\/([a-zA-Z0-9]+)["']/i);
  if(!body||!link||link[1]!==link[2])continue;
  const fields=new Map<string,string>();
  for(const part of card.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)){
   const value=plainText(part[1]).replace(/\s+/g,' ').replace(/^\|\s*/,'').trim(),colon=value.indexOf(':');
   if(colon>0)fields.set(value.slice(0,colon).trim(),value.slice(colon+1).trim());
  }
  const grade=fields.get('خلاصة حكم المحدث')??'',narrator=fields.get('الراوي'),scholar=fields.get('المحدث'),book=fields.get('المصدر'),page=fields.get('الصفحة أو الرقم');
  const normalizedGrade=normalize(grade).replace(/[\[\]()]/g,'').replace(/\s+/g,' ').trim();
  if(!acceptedDorarGrades.has(normalizedGrade)||!narrator||!scholar||!book||!page)continue;
  const text=plainText(body).replace(/^\s*\d+\s*[-–]\s*/,''),canonicalUrl=`https://dorar.net/h/${link[1]}`;
  if(!text||records.has(link[1]))continue;
  records.set(link[1],evidence(source('Dorar.net',`dorar:${link[1]}`,'ar',text,text.slice(0,110),url,{sourceType:'hadith',grade,attribution:narrator,references:[`${scholar} · ${book} · ${page}`,...(fields.get('التخريج')?[fields.get('التخريج')!]:[])],canonicalUrl})));
 }
 return [...records.values()].slice(0,4);
}
export async function dorarSearch(question:string):Promise<Evidence[]>{
 const url=`https://dorar.net/hadith/search?q=${encodeURIComponent(question)}&d%5B%5D=1`;
 return parseDorarSearch(await readPublisher(url,{format:'html',maxBytes:3000000,timeoutMs:10000}),url);
}
export async function byenahItem(id:number,language:string):Promise<Evidence[]>{
 const url=`${BY}/${encodeURIComponent(language)}/Api/single-content?id=${id}`,raw=await readPublisher(url),row=raw.content;
 return parseByenahItem(row,raw.sources,id,language,url);
}
function parseByenahItem(row:any,sources:any,id:number,language:string,url:string,savedAt?:string):Evidence[]{
 if(Number(row?.id)!==id)throw new PublisherError('source-identity-mismatch');
 if(languageCode(row.locale)!==language)throw new PublisherError('source-language-mismatch');
 const text=requireText(row.full_description); // Never substitute a book's marketing description for its body.
 const authors=(Array.isArray(row.authors)?row.authors:[]).map((a:any)=>plainText(a.name)).filter(Boolean);
 return [evidence(source('Byenah.com',`byenah:${id}`,language,text,requireText(row.name),url,{attribution:authors.join(' · ')||'Byenah.com',references:[...authors,...(Array.isArray(sources)?sources:[]).map((s:any)=>plainText(s.name)).filter(Boolean)],contentVersion:row.version==null?null:String(row.version),...(savedAt?{accessMode:'snapshot',retrievedAt:savedAt}:{})}))];
}
export async function savedByenah(language:string):Promise<Evidence[]>{
 if(!['ar','en','fr','es','zh','hi','fa'].includes(language))return [];
 const data=await publisherAsset(`/sources/byenah/${language}/index.json`);
 if(data.publisher!=='Byenah.com'||typeof data.retrievedAt!=='string')throw new PublisherError('invalid-publisher-snapshot');
 return Object.values(data.records??{}).flatMap((row:any)=>parseByenahItem(row,row.sources,Number(row.id),language,`${BY}/${language}/Api/single-content?id=${row.id}`,data.retrievedAt));
}
export async function searchByenah(question:string,language:string):Promise<Evidence[]>{
 try{
 const url=`${BY}/${encodeURIComponent(language)}/Api/name_search?name=${encodeURIComponent(question)}`,raw=await readPublisher(url),rows=requireArray(raw.data);
 const preferred=[...rows].sort((a,b)=>(languageCode(b.locale)===language?1:0)-(languageCode(a.locale)===language?1:0));
 const ids=new Set<number>(),results:Evidence[]=[];
 for(const row of preferred.slice(0,4)){
  try{
   let id=Number(row.id);
   if(languageCode(row.locale)!==language){
    const base=Number(row.translated_id??row.id);if(!Number.isSafeInteger(base)||base<1)continue;
    const translated=await readPublisher(`${BY}/${language}/Api/content_translation/${base}?language=${encodeURIComponent(language)}`);id=Number(translated.id);
   }
   if(!Number.isSafeInteger(id)||id<1||ids.has(id))continue;ids.add(id);
   const [item]=await byenahItem(id,language);results.push(...passages(item.source,question));if(results.length>=4)break;
  }catch{/* Untranslated and attachment-only items cannot supply answer text. */}
 }
 if(results.length)return results.slice(0,4);
 }catch{/* The same publisher's selected official API snapshots remain usable. */}
 try{return (await savedByenah(language)).filter(e=>termsScore(e.source.hadith,question)>0).flatMap(e=>passages(e.source,question));}catch{return [];}
}
export async function islamhouseItem(id:number,language:string):Promise<Evidence[]>{
 const url=`${IH}/main/get-item/${id}/${encodeURIComponent(language)}/json`,raw=await readPublisher(url);
 if(Number(raw.id)!==id||languageCode(raw.source_language)!==language||languageCode(raw.translation_language)!==language)throw new PublisherError('source-identity-or-language-mismatch');
 const body=requireText(raw.full_description),authors=requireArray(raw.prepared_by??[]).map(r=>plainText(r.title)).filter(Boolean);
 return [evidence(source('IslamHouse.com',`islamhouse:${id}`,language,body,requireText(raw.title),url,{canonicalUrl:`https://islamhouse.com/${language}/${raw.type}/${id}/`,attribution:authors.join(' · ')||'IslamHouse.com',references:authors,contentVersion:raw.update_date?String(raw.update_date):null}))];
}
export type PublisherLibraryItem={id:number;title:string;description:string;language:string;publisher:'IslamHouse.com';canonicalUrl:string;apiUrl:string;authors:string[];contentAvailable:boolean;attachments:{url:string;format:string;title:string;size:string}[]};
export async function islamhouseLibrary(language:string,page=1):Promise<{publisher:'IslamHouse.com';language:string;page:number;apiUrl:string;retrievedAt:string;scope:string;items:PublisherLibraryItem[]}>{
 if(!/^[a-z]{2,3}(?:-[a-z]{2,8})?$/.test(language)||!Number.isSafeInteger(page)||page<1||page>1000)throw new PublisherError('invalid-catalog-request');
 const url=`${IH}/main/articles/${encodeURIComponent(language)}/${encodeURIComponent(language)}/${page}/50/json`,raw=await readPublisher(url,{ttl:900000});
 const items=requireArray(raw.data).filter(r=>Number.isSafeInteger(Number(r.id))&&Number(r.id)>0&&languageCode(r.source_language)===language&&languageCode(r.translated_language)===language).flatMap((r):PublisherLibraryItem[]=>{
  const title=plainText(r.title);if(!title)return [];
  const attachments=(Array.isArray(r.attachments)?r.attachments:[]).flatMap((a:any)=>{
   try{const u=new URL(a.url);if(u.protocol!=='https:'||u.username||u.password||!(u.hostname==='islamhouse.com'||u.hostname.endsWith('.islamhouse.com')))return [];return [{url:u.href,format:plainText(a.extension_type),title:plainText(a.description),size:plainText(a.size)}];}catch{return [];}
  });
  return [{id:Number(r.id),title,description:plainText(r.description),language,publisher:'IslamHouse.com',canonicalUrl:`https://islamhouse.com/${language}/articles/${Number(r.id)}/`,apiUrl:`${IH}/main/get-item/${Number(r.id)}/${language}/json`,authors:(Array.isArray(r.prepared_by)?r.prepared_by:[]).map((a:any)=>plainText(a.title)).filter(Boolean),contentAvailable:!!plainText(r.full_description),attachments}];
 });
 return {publisher:'IslamHouse.com',language,page,apiUrl:url,retrievedAt:new Date().toISOString(),scope:'A page of up to 50 article catalog records. Descriptions and attachments are not answer text; attachment bytes have not been imported.',items};
}
export async function searchIslamhouse(question:string,language:string):Promise<Evidence[]>{
 // The documented API has no full-text search. Inspect the latest bounded page
 // of articles in this language, and fetch actual bodies only for matching titles.
 const library=await islamhouseLibrary(language);
 const rows=library.items.map(r=>({row:r,score:termsScore(r.title+' '+r.description,question)})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
 const hits=await Promise.allSettled(rows.map(async({row})=>{const [item]=await islamhouseItem(Number(row.id),language);return passages(item.source,question);}));
 return hits.flatMap(x=>x.status==='fulfilled'?x.value:[]);
}
export type Recitation={publisher:'MP3Quran.net';reciter:string;reading:string;surah:number;url:string;canonicalUrl:string};
export async function recitationForSurah(surah:number,language:string):Promise<Recitation>{
 if(!Number.isInteger(surah)||surah<1||surah>114)throw new PublisherError('invalid-surah');
 const raw=await readPublisher(`https://www.mp3quran.net/api/v3/reciters?language=${language==='ar'?'ar':'en'}`,{ttl:3600000});
 const row=requireArray(raw.reciters).find(r=>Number(r.id)===1),moshaf=row?.moshaf?.find((m:any)=>Number(m.rewaya_id)===1&&String(m.surah_list).split(',').includes(String(surah)));
 if(!moshaf)throw new PublisherError('recitation-unavailable');
 const base=new URL(moshaf.server);if(base.protocol!=='https:'||!base.hostname.endsWith('.mp3quran.net')||base.username||base.password)throw new PublisherError('unapproved-audio-origin');
 const url=new URL(`${String(surah).padStart(3,'0')}.mp3`,base.href.endsWith('/')?base.href:base.href+'/').href;
 return {publisher:'MP3Quran.net',reciter:requireText(row.name),reading:requireText(moshaf.name),surah,url,canonicalUrl:'https://mp3quran.net/'};
}
export async function additionalPublisherEvidence(question:string,language:string):Promise<Evidence[]>{
 const verse=verseReference(question)??tafsirReference(question);
 const viaMcp=async()=>{const ids=await mcpHadithIds(question,language);const records=await Promise.allSettled(ids.map(id=>fetchIndexedSource(id,language as Language)));return records.flatMap(r=>r.status==='fulfilled'?[evidence(r.value)]:[]);};
 const jobs=verse?[quranpediaVerse(verse.sura,verse.aya,language),...(language==='ar'?[quranpediaTafsir(verse.sura,verse.aya),surahTafsir(verse.sura,verse.aya)]:[])]:[searchIcadb(question,language),searchByenah(question,language),searchIslamhouse(question,language),viaMcp(),...(language==='ar'?[dorarSearch(question)]:[])];
 const collected:Evidence[]=[];let timer:ReturnType<typeof setTimeout>;
 const settled=Promise.allSettled(jobs.map(async job=>{try{collected.push(...await job);}catch{/* A failed publisher cannot suppress successful publishers. */}}));
 await Promise.race([settled,new Promise<void>(resolve=>{timer=setTimeout(resolve,verse?26000:12000);})]);clearTimeout(timer!);
 return collected.slice();
}
