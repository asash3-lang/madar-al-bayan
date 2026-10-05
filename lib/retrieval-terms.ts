// Candidate retrieval only. The complete, unchanged question still goes to the
// contextual relevance judge before any passage can become an answer.
export function normalize(text:string){return text.normalize('NFKC').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/[ىی]/g,'ي').replace(/ک/g,'ك').replace(/ة/g,'ه').normalize('NFC');}
const stop=new Set(normalize('what is are the a an of in to and does do how why mean meaning explain tell me about can should who when with for from it i you my qu est ce que le la les de du des un une en et comment pourquoi quel quelle quels quelles il elle on se el los las del es qué significa un una por para cómo como cuál cuales ما ماذا هو هي هل عن في من معنى اشرح كيف لماذا هذا هذه لي ما معنى ما هو ما هي اريد كيفية بالاسلام के की का क्या है हैं में अर्थ बताएं मुझे कैसे किस इस हैं چیست چگونه است در به از که را برای apa apakah bagaimana mengapa yang di dalam dengan dan itu adalah saya cara tentang क्या کیسے کیا ہے ہیں میں کا کی کے سے کو اور پر').split(/\s+/));
export function tokens(text:string):string[]{
 const result:string[]=[];
 for(let token of normalize(text).match(/[\p{L}\p{M}\p{N}]+/gu)??[]){
  if(stop.has(token))continue;
  if(/\p{Script=Han}/u.test(token)){
   token=token.replace(/什么是|是什么|中的|为什么|如何|怎么|怎样|什麼是|為什麼/g,'');
   for(const segment of token.split(/中|的/u)){if(segment.length===1)result.push(segment);else for(let i=0;i<segment.length-1;i++)result.push(segment.slice(i,i+2));}
  }else{
   if(/^[وفبك]ال/.test(token)&&token.length>5)token=token.slice(1);
   if(token.startsWith('ال')&&token.length>4)token=token.slice(2);
   if(token.length>1)result.push(token);
  }
 }
 return result;
}
const substitutions:Record<string,string>={ramthan:'ramadan',ramadhan:'ramadan',ramazan:'ramadan',ramzan:'ramadan',ihsane:'ihsan'};
const groups=[
 ['islam','islamic','اسلام','اسلامي','伊斯兰','伊斯蘭','इस्लाम'],
 ['ramadan','رمضان','斋月','齋月','रमज़ान','रमजान'],
 ['fasting','fast','صيام','صوم','jeune','jeûner','ayuno','ayunar','斋戒','रोज़ा','रोजा','روزه','روزہ','puasa'],
 ['prayer','prayers','pray','praying','salah','salat','صلاه','صلوات','يصلي','اصلي','صلي','priere','prier','priez','oracion','orar','rezar','reza','rezo','礼拜','祈祷','نماز','नमाज़','नमाज','salat','shalat','sholat','berdoa'],
 ['intention','intentions','نيه','نيات','نوي','نیت','نيت','intencion','举意','नीयत','नियत','niat'],
 ['faith','iman','ايمان','foi','fe','信仰','ईमान','ایمان','keimanan'],
 ['ihsan','احسان','伊赫桑','इहसान'],
 ['charity','صدقه','صدقات','charite','caridad','施舍','दान','sedekah'],
 ['ablution','wudu','وضوء','وضو','وضوؤ','ablutions','ablucion','小净','小淨','वुज़ू','wudhu'],
 ['mercy','رحمه','misericorde','misericordia','慈悯','दया','رحمت','rahmat'],
 ['parents','والدين','والد','والده','padres','父母','माता','पिता','والدین','orangtua'],
].map(g=>[...new Set(g.flatMap(tokens))]);
export function searchTerms(question:string){return [...new Set(tokens(question))].map(t=>substitutions[t]??t).map(term=>[...new Set([term,...(groups.find(g=>g.includes(term))??[])])]);}
