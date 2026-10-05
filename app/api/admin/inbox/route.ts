import {requireAdmin} from '@/lib/admin-auth';
import {getDbBinding} from '@/db';
import {routeFailure} from '@/lib/request-validation';
import {ensureMessageNumbers} from '@/lib/message-store';
import {messageReference} from '@/lib/message-labels';
export const dynamic='force-dynamic';

const messages=`WITH messages AS (
 SELECT r.id,CASE WHEN c.id IS NULL THEN 'question' ELSE 'contact' END AS kind,
 r.question AS subject,r.email AS contact,COALESCE(c.name,'') AS name,
 r.language,r.status,r.created_at AS createdAt,r.updated_at AS updatedAt,
 CASE WHEN r.status='sent' THEN COALESCE(r.sent_at,r.updated_at) ELSE NULL END AS sentAt,r.answer
 FROM referrals r LEFT JOIN contact_messages c ON c.id=r.id
 UNION ALL
 SELECT c.id,'contact',CASE WHEN c.message='' THEN 'طلب تواصل' ELSE c.message END,
 c.contact,c.name,c.language,'received',c.created_at,c.created_at,NULL,''
 FROM contact_messages c WHERE NOT EXISTS (SELECT 1 FROM referrals r WHERE r.id=c.id)
)`;
type Row={id:string;number:number;createdAt:string;sentAt:string|null;sortAt:string};
export async function GET(request:Request){try{
 await requireAdmin(request);await ensureMessageNumbers();
 const url=new URL(request.url),folder=['sent','urgent','trash'].includes(url.searchParams.get('folder')??'')?url.searchParams.get('folder')!:'inbox';
 const cursor=(url.searchParams.get('before')??'').slice(0,100),[before='',lastId='']=cursor.split('|');
 const raw=(url.searchParams.get('q')??'').trim().slice(0,200).replace(/[٠-٩۰-۹]/g,ch=>String(ch.charCodeAt(0)-(ch<='٩'?1632:1776)));
 const q=/^(?:MB[- ]*)?\d{1,9}$/i.test(raw)?'MB-'+raw.replace(/^MB[- ]*/i,'').padStart(6,'0'):raw,pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
 const sort=folder==='trash'?'n.deleted_at':folder==='sent'&&!q?'COALESCE(m.sentAt,m.createdAt)':'m.createdAt',filter=folder==='trash'?'1=1':folder==='urgent'?'n.is_urgent=1':folder==='sent'?"m.status='sent'":"m.status!='sent'";
 const db=getDbBinding();
 const [rows,countResult]=await db.batch([
  db.prepare(`${messages} SELECT m.id,m.kind,m.subject,m.contact,m.name,m.language,m.status,m.createdAt,m.updatedAt,m.sentAt,n.number,COALESCE(n.is_urgent,0) AS urgent,n.deleted_at AS deletedAt,${sort} AS sortAt
   FROM messages m LEFT JOIN message_numbers n ON n.request_id=m.id
   WHERE n.deleted_at IS ${folder==='trash'?'NOT ':''}NULL AND (?!='' OR ${filter}) AND (?='' OR m.subject LIKE ? ESCAPE '\\' OR m.contact LIKE ? ESCAPE '\\' OR m.name LIKE ? ESCAPE '\\' OR m.answer LIKE ? ESCAPE '\\' OR printf('MB-%06d',n.number) LIKE ? ESCAPE '\\')
   AND (?='' OR ${sort}<? OR (${sort}=? AND m.id<?))
   ORDER BY ${sort} DESC,m.id DESC LIMIT 31`).bind(q,q,pattern,pattern,pattern,pattern,pattern,cursor,before,before,lastId),
  db.prepare(`${messages} SELECT COALESCE(SUM(status!='sent' AND n.deleted_at IS NULL),0) AS inbox,COALESCE(SUM(status='sent' AND n.deleted_at IS NULL),0) AS sent,COALESCE(SUM(n.is_urgent=1 AND n.deleted_at IS NULL),0) AS urgent,COALESCE(SUM(n.deleted_at IS NOT NULL),0) AS trash FROM messages LEFT JOIN message_numbers n ON n.request_id=messages.id`),
 ]);
 const all=rows.results as Row[],page=all.slice(0,30),last=page.at(-1);
 return Response.json({items:page.map(row=>({...row,reference:messageReference(row.number,row.id)})),next:all.length>30&&last?last.sortAt+'|'+last.id:null,counts:countResult.results[0]??{inbox:0,sent:0,urgent:0,trash:0}},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return routeFailure(e);}}
