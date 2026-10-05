import {requireAdmin} from '@/lib/admin-auth';
import {getDbBinding} from '@/db';
import {approveReferral,type Referral} from '@/lib/referrals';
import {jsonInput,routeFailure,RequestError} from '@/lib/request-validation';
import {ensureMessageNumbers,messageNumber,requireActiveMessage,activeMessageSql} from '@/lib/message-store';
import {messageReference} from '@/lib/message-labels';
import {mailCopies} from '@/lib/mail-recipients';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
type Contact={id:string;contact:string;message:string;name:string;language:string;created_at:string};
const isEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const headers={'Cache-Control':'no-store'};

export async function GET(request:Request,context:Context){try{
 await requireAdmin(request);const {id}=await context.params,db=getDbBinding();
 const [referral,contact]=await Promise.all([
  db.prepare('SELECT * FROM referrals WHERE id=?').bind(id).first<Referral>(),
  db.prepare('SELECT * FROM contact_messages WHERE id=?').bind(id).first<Contact>(),
 ]);
 if(!referral&&!contact)throw new RequestError(404,'الرسالة غير موجودة.');
 await ensureMessageNumbers();const number=await messageNumber(id),priority=await db.prepare('SELECT is_urgent,deleted_at FROM message_numbers WHERE request_id=?').bind(id).first<{is_urgent:number;deleted_at:string|null}>();
 const item=referral?{...referral,name:contact?.name,contact:referral.email}:{...contact,email:isEmail(contact!.contact)?contact!.contact:null,question:contact!.message||'طلب تواصل',status:'received',updated_at:contact!.created_at};
 return Response.json({item:{...item,urgent:!!priority?.is_urgent,deletedAt:priority?.deleted_at??null,number,reference:messageReference(number,id)},kind:contact?'contact':'question'},{headers});
 }catch(e){return routeFailure(e);}}

export async function POST(request:Request,context:Context){try{
 const user=await requireAdmin(request),{id}=await context.params,body=await jsonInput(request,32000),db=getDbBinding();
 if(body.action==='delete'||body.action==='restore'){
  const exists=await db.prepare('SELECT id FROM referrals WHERE id=? UNION ALL SELECT id FROM contact_messages WHERE id=? LIMIT 1').bind(id,id).first();
  if(!exists)throw new RequestError(404,'الرسالة غير موجودة.');
  await ensureMessageNumbers();
  const deletedAt=body.action==='delete'?new Date().toISOString():null;
  const changed=await db.prepare(`UPDATE message_numbers SET deleted_at=CASE WHEN ? IS NULL THEN NULL ELSE COALESCE(deleted_at,?) END
   WHERE request_id=? AND NOT EXISTS (SELECT 1 FROM referrals WHERE id=? AND status='sending') RETURNING deleted_at`).bind(deletedAt,deletedAt,id,id).first<{deleted_at:string|null}>();
  if(!changed)throw new RequestError(409,'جارٍ إرسال الرد. حدّث الرسائل وحاول بعد اكتمال الإرسال.');
  return Response.json({deletedAt:changed.deleted_at},{headers});
 }
 await requireActiveMessage(id);
 if(body.action==='priority'){
  if(typeof body.urgent!=='boolean')throw new RequestError(400,'تعذر تنفيذ الطلب.');
  const exists=await db.prepare('SELECT id FROM referrals WHERE id=? UNION ALL SELECT id FROM contact_messages WHERE id=? LIMIT 1').bind(id,id).first();
  if(!exists)throw new RequestError(404,'الرسالة غير موجودة.');
  await ensureMessageNumbers();
  const changed=await db.prepare('UPDATE message_numbers SET is_urgent=? WHERE request_id=? AND deleted_at IS NULL RETURNING number').bind(body.urgent?1:0,id).first();
  if(!changed)throw new RequestError(409,'تعذر تحديث الرسالة. أعد فتحها وحاول مجددًا.');
  return Response.json({urgent:body.urgent},{headers});
 }
 if(body.action!==undefined&&!['draft','send'].includes(String(body.action)))throw new RequestError(400,'تعذر تنفيذ الطلب.');
 if(typeof body.answer!=='string'||!body.answer.trim()||body.answer.length>12000)throw new RequestError(400,'اكتب الإجابة.');
 let row=await db.prepare('SELECT * FROM referrals WHERE id=?').bind(id).first<Referral>();
 if(!row){
  const contact=await db.prepare('SELECT * FROM contact_messages WHERE id=?').bind(id).first<Contact>();
  if(!contact)throw new RequestError(404,'الرسالة غير موجودة.');
  if(!isEmail(contact.contact))throw new RequestError(400,'لا يوجد بريد إلكتروني لهذه الرسالة.');
  if(body.updatedAt!==contact.created_at)throw new RequestError(409,'تم تحديث الرسالة. أعد فتحها وحاول مجددًا.');
  await db.prepare('INSERT OR IGNORE INTO referrals (id,question,language,email,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind(id,contact.message||'طلب تواصل',contact.language,contact.contact,contact.created_at,contact.created_at).run();
  row=await db.prepare('SELECT * FROM referrals WHERE id=?').bind(id).first<Referral>();
 }
 if(!row||body.updatedAt!==row.updated_at)throw new RequestError(409,'تم تحديث الرسالة. أعد فتحها وحاول مجددًا.');
 const copies=mailCopies(body.cc??row.cc,body.bcc??row.bcc,row.email);
 if(body.action==='draft'){
  const now=new Date(Math.max(Date.now(),Date.parse(row.updated_at)+1)).toISOString();
  const saved=await db.prepare(`UPDATE referrals SET answer=?,cc=?,bcc=?,status='draft',reviewer=?,updated_at=? WHERE id=? AND updated_at=? AND status IN ('pending','draft','approved','delivery_failed') AND ${activeMessageSql} RETURNING id`).bind(body.answer.trim(),JSON.stringify(copies.cc),JSON.stringify(copies.bcc),user.userId,now,id,row.updated_at).first();
  if(!saved)throw new RequestError(409,'تعذر تعديل هذه الإجابة. أعد فتح الرسالة.');
  const item=await db.prepare('SELECT * FROM referrals WHERE id=?').bind(id).first<Referral>();
  return Response.json({status:'draft',item},{headers});
 }
 const result=await approveReferral(id,{answer:body.answer,cc:copies.cc,bcc:copies.bcc,confirmed:true,updatedAt:body.updatedAt},user.userId);
 const item=await db.prepare('SELECT * FROM referrals WHERE id=?').bind(id).first<Referral>();
 if(!['sent','sending'].includes(result.status))return Response.json({status:result.status,item,error:result.status==='delivery_unknown'?'تعذر تأكيد الإرسال. الإجابة محفوظة.':'تعذر إرسال الرد. الإجابة محفوظة، حاول مجددًا.'},{status:503,headers});
 return Response.json({status:result.status,item},{headers});
 }catch(e){return routeFailure(e);}}
