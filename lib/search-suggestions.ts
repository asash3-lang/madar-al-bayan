import rawIndex from './hadith-index.json';
const index = rawIndex as {records:{id:string;titles:Record<string,string>;translations:string[]}[]};
import {normalize} from './source-search';
import type {Language} from './i18n';
const known:Record<string,string>={ramthan:'ramadan',ramadhan:'ramadan',ramdan:'ramadan',ramazan:'ramadan',ramzan:'ramadan',isalm:'islam',islamn:'islam','رمظان':'رمضان','رمضانن':'رمضان','اسلامم':'اسلام'};
const dictionaries=new Map<string,Map<string,number>>();
function dictionary(language:Language){
 let result=dictionaries.get(language);if(result)return result;
 result=new Map();
 for(const record of index.records){const title=(record.titles as Record<string,string>)[language]??'';
  const words=language==='zh'?[...new Intl.Segmenter('zh',{granularity:'word'}).segment(normalize(title))].filter(s=>s.isWordLike).map(s=>s.segment):normalize(title).match(/[\p{L}\p{M}]+/gu)??[];
  for(const term of new Set(words))if(term.length>=(language==='zh'?2:3)&&term.length<=24)result.set(term,(result.get(term)??0)+1);
 }
 dictionaries.set(language,result);return result;
}
function distance(a:string,b:string){
 const d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
 for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
  d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+Number(a[i-1]!==b[j-1]));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
 }return d[a.length][b.length];
}
export function suggestQuery(question:string,selected:Language):{text:string;language:Language}|undefined{
 const language:Language=selected;
 const terms=question.match(/[\p{L}\p{M}]+/gu)??[];
 if(!terms.length||terms.length>12)return;
 const words=dictionary(language);let changes=0;
 const text=question.replace(/[\p{L}\p{M}]+/gu,original=>{
  const term=normalize(original);if(known[term]){changes++;return known[term];}
  if(term.length<(language==='zh'?2:4)||term.length>24||words.has(term))return original;
  const candidates=[...words].filter(([word,count])=>count>=3&&Math.abs(word.length-term.length)<=1&&word[0]===term[0]).map(([word,count])=>({word,count,d:distance(term,word)})).filter(x=>x.d===1).sort((a,b)=>b.count-a.count);
  if(!candidates.length||(candidates[1]&&candidates[0].count<candidates[1].count*2))return original;
  changes++;return candidates[0].word;
 });
 return changes&&normalize(text)!==normalize(question)?{text,language}:undefined;
}
