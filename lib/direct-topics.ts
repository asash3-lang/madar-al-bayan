// Bounded source lookups, not a replacement for semantic validation of free questions.
// Match the WHOLE query: extra conditions, negation, or personal details must not pass.
export function lookupKey(value:string){
 return value.normalize('NFKC').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim().normalize('NFC');
}
type DirectTopic={name:string;hadithIds:string[];verse?:{sura:number;aya:number}};
const definitions:[DirectTopic,string[]][]=[
 [{name:'islam-definition',hadithIds:['4563']},[
  'islam','what is islam','define islam','meaning of islam','what does islam mean',
  'الإسلام','اسلام','ما الإسلام','ما هو الإسلام','ماهو الإسلام','ما معنى الإسلام','تعريف الإسلام','الدين الإسلامي',
  'islam en français','qu est ce que l islam','c est quoi l islam','que signifie islam',
  'el islam','qué es el islam','que es islam','qué significa islam',
  '伊斯兰','伊斯兰教','什么是伊斯兰','什么是伊斯兰教','伊斯兰是什么','伊斯兰教是什么',
  '何谓伊斯兰','何谓伊斯兰教','何謂伊斯蘭','何謂伊斯蘭教','伊斯兰是什么意思','伊斯兰教是什么意思','伊斯蘭是什麼意思','伊斯蘭教是什麼意思',
  'इस्लाम','इस्लाम क्या है','इस्लाम का अर्थ क्या है',
  'اسلام چیست','معنی اسلام چیست','apa itu islam','apakah islam','اسلام کیا ہے',
 ]],
 [{name:'ramadan-topic',hadithIds:['4196','10107']},[
  'ramadan','ramadhan','ramazan','ramzan','رمضان','شهر رمضان','فضل رمضان','فضائل رمضان',
  'le ramadan','el ramadán','ramadán','斋月','齋月','莱麦丹月','रमजान','रमज़ान','رمضان المبارک',
 ]],
 [{name:'ramadan-description',hadithIds:[],verse:{sura:2,aya:185}},[
  'what is ramadan','what is the month of ramadan','ما هو رمضان','ماهو رمضان','ما هو شهر رمضان','ما شهر رمضان',
  'qu est ce que le ramadan','c est quoi le ramadan','qué es el ramadán','que es ramadan',
  '什么是斋月','斋月是什么','什麼是齋月','रमजान क्या है','रमज़ान क्या है','رمضان چیست','apa itu ramadan','apa itu ramadhan','رمضان کیا ہے',
 ]],
];
const topics=new Map<string,DirectTopic>(definitions.flatMap(([topic,aliases])=>aliases.map(alias=>[lookupKey(alias),topic])));
export function directTopic(question:string){return topics.get(lookupKey(question));}
