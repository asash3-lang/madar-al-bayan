import {publisherAsset} from './publisher-assets';
import {normalize,searchTerms} from './retrieval-terms';
import type {SourceRecord} from './types';
export type IndexedHit={id:string;score:number;path?:string;key?:string};
type Entry={id:string;length:number;path?:string;key?:string};
type FullIndex={version:1;language:string;averageLength:number;documents:Entry[];terms:Record<string,number[]>};
const cache=new Map<string,FullIndex>();
async function readIndex(language:string){
 const cached=cache.get(language);if(cached)return cached;
 const data=await publisherAsset(`/sources/search/${language}.json`) as FullIndex;
 if(data.version!==1||data.language!==language||!Array.isArray(data.documents)||!data.terms)throw Error('Invalid source search index');
 if(cache.size>=2)cache.delete(cache.keys().next().value!);cache.set(language,data);return data;
}
export async function rankFullText(question:string,language:string,limit=10):Promise<IndexedHit[]>{
 const index=await readIndex(language),groups=searchTerms(question),scores=new Map<number,number>();
 for(const alternatives of groups){
  const best=new Map<number,number>();
  for(const term of alternatives){
   const postings=index.terms[term];if(!postings)continue;
   const idf=Math.log(1+(index.documents.length-postings.length/2+0.5)/(postings.length/2+0.5));
   for(let p=0;p<postings.length;p+=2){const ordinal=postings[p],tf=postings[p+1],doc=index.documents[ordinal];
    if(!doc)continue;
    const score=idf*(tf*2.2)/(tf+1.2*(0.25+0.75*doc.length/index.averageLength));
    best.set(ordinal,Math.max(best.get(ordinal)??0,score));
   }
  }
  for(const [ordinal,score]of best)scores.set(ordinal,(scores.get(ordinal)??0)+score);
 }
 const ordered=[...scores].sort((a,b)=>b[1]-a[1]);
 // Retain a strong candidate from each indexed publisher before filling the
 // remaining slots. This affects recall only; the semantic gate still decides.
 const leaders=new Map<string,[number,number]>();
 for(const entry of ordered){const id=index.documents[entry[0]].id,publisher=id.startsWith('icadb-card:')?'icadb':id.startsWith('binbaz:')?'binbaz':'hadeethenc';if(!leaders.has(publisher))leaders.set(publisher,entry);}
 const chosen=new Map<number,number>([...leaders.values(),...ordered].slice(0,limit+leaders.size));
 return [...chosen].slice(0,limit).sort((a,b)=>b[1]-a[1]).map(([ordinal,score])=>({...index.documents[ordinal],score}));
}
// Editorial subject routing improves recall for a procedural question. This
// never approves an answer: each candidate must pass the unchanged semantic gate.
export function teachingCandidates(question:string):string[]{
 const q=normalize(question),terms=searchTerms(question);
 const procedural=/\b(?:how|comment|como|bagaimana|cara)\b|كيف|طريقه|كيفيه|صفه|كيفية|如何|怎么|怎样|कैसे|چگونه|چطور|كيسے/.test(q);
 if(procedural&&terms.some(group=>group.includes('prayer')))return ['10901'];
 return [];
}
export async function collectionSource(hit:IndexedHit,language:string):Promise<SourceRecord>{
 if(!hit.path||!hit.key)throw Error('Missing collection source');
 const data=await publisherAsset(hit.path),source=data.records?.[hit.key] as SourceRecord|undefined;
 if(!source||source.id!==hit.id||source.language!==language||!source.hadith?.trim()||!['ICADB.com','BinBaz.org.sa','Modoee.com','Kuwait Awqaf'].includes(source.publisher))throw Error('Invalid collection source');
 return source;
}
// Keep a contiguous original passage around the strongest local match when a
// book answer exceeds the judge's input window. The stored original is untouched.
export function contextWindow(text:string,question:string,limit:number){
 if(text.length<=limit)return text;
 const groups=searchTerms(question);let bestStart=0,bestScore=-1;
 for(let start=0;start<text.length;start+=Math.floor(limit/3)){
  const window=normalize(text.slice(start,start+limit));
  const score=groups.reduce((sum,g)=>sum+(g.some(t=>window.includes(t))?1:0),0);
  if(score>bestScore){bestScore=score;bestStart=start;}
 }
 const paragraph=text.lastIndexOf('\n',bestStart);if(paragraph>=Math.max(0,bestStart-500))bestStart=paragraph+1;
 return text.slice(bestStart,bestStart+limit);
}
