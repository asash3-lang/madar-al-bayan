import {RequestError} from './request-validation';
export function recipientList(raw:unknown):string[]{
 if(raw==null||raw==='')return [];
 let input=raw;
 if(typeof raw==='string'&&raw.trim().startsWith('[')){try{input=JSON.parse(raw);}catch{throw new RequestError(400,'تحقق من عناوين بريد النسخ.');}}
 const values=typeof input==='string'?input.split(/[,;\n،；]+/):Array.isArray(input)?input:[];
 if(!Array.isArray(input)&&typeof input!=='string')throw new RequestError(400,'تحقق من عناوين بريد النسخ.');
 const result:string[]=[];
 for(const value of values){
  if(typeof value!=='string')throw new RequestError(400,'تحقق من عناوين بريد النسخ.');
  const email=value.trim().toLowerCase();if(!email)continue;
  if(email.length>254||!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email))throw new RequestError(400,'أحد عناوين بريد النسخ غير صحيح.');
  if(!result.includes(email))result.push(email);
 }
 return result;
}
export function mailCopies(cc:unknown,bcc:unknown,recipient:string){
 const copies=recipientList(cc).filter(email=>email!==recipient.toLowerCase());
 const hidden=recipientList(bcc).filter(email=>email!==recipient.toLowerCase()&&!copies.includes(email));
 if(copies.length+hidden.length>49)throw new RequestError(400,'أضف حتى ٤٩ مستلمًا إضافيًا للرسالة الواحدة.');
 return {cc:copies,bcc:hidden};
}
