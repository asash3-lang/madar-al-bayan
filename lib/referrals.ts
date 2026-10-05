import {env} from 'cloudflare:workers';
import {getDbBinding} from '@/db';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {RequestError,questionInput} from './request-validation';
import {isLanguage} from './i18n';
import {detectLanguage} from './detect-language';
import {adminSession} from './admin-auth';
import {ensureMessageNumbers,messageNumber,requireActiveMessage,activeMessageSql} from './message-store';
import {messageReference} from './message-labels';
import {replyEmail} from './reply-email';
import {mailCopies} from './mail-recipients';
export type Referral={id:string;question:string;language:string;email:string;status:string;answer:string;sources:string;cc:string;bcc:string;reviewer:string|null;approved_at:string|null;delivery_id:string|null;delivery_started_at:string|null;sent_at:string|null;reply_revision:number;created_at:string;updated_at:string};
export function deliveryEnabled(){return !!env.RESEND_API_KEY&&!!env.MAIL_FROM;}
export function reviewerAllowed(id:string){return (env.COMMITTEE_REVIEWER_IDS??'').split(',').map(s=>s.trim()).filter(Boolean).includes(id);}
export async function committeeReviewer(){const admin=await adminSession();if(admin)return admin;const user=await getChatGPTUser();if(!user)throw new RequestError(401,'يلزم تسجيل الدخول.');if(!reviewerAllowed(user.userId))throw new RequestError(403,'هذا الحساب غير مخول بالمراجعة.');return user;}
export async function submitReferral(body:Record<string,unknown>){
 const question=questionInput(body);
 if(!isLanguage(body.language)||body.consent!==true||body.website)throw new RequestError(400,'Invalid submission');
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 if(email.length>254||!/^[-.!#$%&'*+/=?^_`{|}~a-z0-9]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email))throw new RequestError(400,'Invalid email');
 const language=detectLanguage(question,body.language).language,id=crypto.randomUUID(),now=new Date().toISOString();
 const db=getDbBinding();await ensureMessageNumbers();
 const results=await db.batch([db.prepare('INSERT INTO referrals (id,question,language,email,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind(id,question,language,email,now,now),db.prepare('INSERT INTO message_numbers (request_id) VALUES (?) RETURNING number').bind(id)]);
 const number=(results[1].results[0] as {number:number}).number;
 return {id,number,reference:messageReference(number,id),status:'pending',emailDeliveryEnabled:deliveryEnabled()};
}
export async function listReferrals(){return (await getDbBinding().prepare(`SELECT * FROM referrals WHERE ${activeMessageSql} ORDER BY created_at DESC LIMIT 100`).all<Referral>()).results;}
function approvedSources(raw:unknown){
 if(!Array.isArray(raw)||raw.length<1||raw.length>10)throw new RequestError(400,'أضف رابط مصدر واحد على الأقل.');
 return raw.map(value=>{if(typeof value!=='string'||value.length>1000)throw new RequestError(400,'رابط غير صحيح.');let url:URL;try{url=new URL(value);}catch{throw new RequestError(400,'رابط غير صحيح.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port||!['hadeethenc.com','quranenc.com'].includes(url.hostname))throw new RequestError(400,'اختر رابطًا من المراجع المتصلة المعتمدة.');return url.href;});
}
export async function approveReferral(id:string,body:Record<string,unknown>,reviewer:string){
 await requireActiveMessage(id);
 const db=getDbBinding(),row=await db.prepare('SELECT * FROM referrals WHERE id = ?').bind(id).first<Referral>();
 if(!row)throw new RequestError(404,'السؤال غير موجود.');
 if(body.updatedAt!==undefined&&body.updatedAt!==row.updated_at)throw new RequestError(409,'تم تحديث الرسالة. أعد فتحها وحاول مجددًا.');
 if(['pending','draft','approved','delivery_failed'].includes(row.status)){
  if(typeof body.answer!=='string'||body.answer.trim().length<1||body.answer.length>12000||body.confirmed!==true)throw new RequestError(400,'أدخل الإجابة قبل الإرسال.');
  const sources=Array.isArray(body.sources)&&body.sources.length?approvedSources(body.sources):JSON.parse(row.sources),answer=body.answer.trim(),now=new Date(Math.max(Date.now(),Date.parse(row.updated_at)+1)).toISOString();
  const copies=mailCopies(body.cc??row.cc,body.bcc??row.bcc,row.email);
  const updated=await db.prepare(`UPDATE referrals SET status='approved',answer=?,sources=?,cc=?,bcc=?,reviewer=?,approved_at=?,updated_at=?,reply_revision=reply_revision+1 WHERE id=? AND updated_at=? AND status IN ('pending','draft','approved','delivery_failed') AND ${activeMessageSql} RETURNING id`).bind(answer,JSON.stringify(sources),JSON.stringify(copies.cc),JSON.stringify(copies.bcc),reviewer,now,now,id,row.updated_at).all();
  if(!updated.results.length)throw new RequestError(409,'سبق تحديث السؤال.');
 }
 if(!deliveryEnabled())return {status:row.status==='sent'?'sent':'approved',emailDeliveryEnabled:false};
 return deliverReferral(id);
}
async function deliverReferral(id:string){
 const db=getDbBinding(),now=new Date().toISOString();
 // One durable claim prevents concurrent sends; uncertain delivery requires reconciliation, never blind retries.
 const claim=await db.prepare(`UPDATE referrals SET status='sending',delivery_started_at=?,updated_at=? WHERE id=? AND status='approved' AND ${activeMessageSql} RETURNING *`).bind(now,now,id).first<Referral>();
 if(!claim){await requireActiveMessage(id);const row=await db.prepare('SELECT status FROM referrals WHERE id=?').bind(id).first<{status:string}>();return {status:row?.status??'unknown',emailDeliveryEnabled:true};}
 try{
  const email=replyEmail(claim,await messageNumber(id)),copies=mailCopies(claim.cc,claim.bcc,claim.email);
  const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`madar-review-${id}-${claim.reply_revision}`},body:JSON.stringify({from:env.MAIL_FROM,to:[claim.email],...(copies.cc.length?{cc:copies.cc}:{}),...(copies.bcc.length?{bcc:copies.bcc}:{}),...email})});
  if(!response.ok){
   const status=response.status>=400&&response.status<500&&response.status!==409?'delivery_failed':'delivery_unknown';
   await db.prepare("UPDATE referrals SET status=?,updated_at=? WHERE id=? AND status='sending'").bind(status,new Date().toISOString(),id).run();
   console.error('Mail delivery failed',{questionId:id,httpStatus:response.status});
   return {status,emailDeliveryEnabled:true};
  }
  const data=await response.json() as {id?:string};if(!data.id)throw Error('Missing mail receipt');
  const sentAt=new Date().toISOString();
  await db.prepare("UPDATE referrals SET status='sent',delivery_id=?,sent_at=?,updated_at=? WHERE id=? AND status='sending'").bind(data.id,sentAt,sentAt,id).run();
  return {status:'sent',emailDeliveryEnabled:true};
 }catch{
  console.error('Mail delivery could not be confirmed',{questionId:id});
  await db.prepare("UPDATE referrals SET status='delivery_unknown',updated_at=? WHERE id=? AND status='sending'").bind(new Date().toISOString(),id).run();
  return {status:'delivery_unknown',emailDeliveryEnabled:true};
 }
}
