import {getDbBinding} from '@/db';
export function analyticsQuestion(value:string){
 const text=value.normalize('NFKC').replace(/https?:\/\/\S+/gi,'[link]').replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g,'[email]').replace(/(?:\+?\d[\s().-]*){7,}/g,'[number]').trim().slice(0,1000);
 const normalized=text.toLocaleLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim();
 return {text,normalized};
}
export async function recordSearch(question:string,language:string,outcome:string){
 const value=analyticsQuestion(question);if(!value.normalized)return;
 await getDbBinding().prepare('INSERT INTO search_events (id,question,normalized_question,language,outcome,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),value.text,value.normalized,language,outcome,new Date().toISOString()).run();
}
