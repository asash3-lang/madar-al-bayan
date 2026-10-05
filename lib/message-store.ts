import {getDbBinding} from '@/db';
import {RequestError} from '@/lib/request-validation';

// Also enforced in write/claim SQL to close races with an in-flight reply.
export const activeMessageSql="NOT EXISTS (SELECT 1 FROM message_numbers WHERE request_id=referrals.id AND deleted_at IS NOT NULL)";
export async function requireActiveMessage(id:string){
 const row=await getDbBinding().prepare('SELECT deleted_at FROM message_numbers WHERE request_id=?').bind(id).first<{deleted_at:string|null}>();
 if(row?.deleted_at)throw new RequestError(409,'الرسالة في سلة المحذوفات. استعدها قبل تعديلها أو إرسال الرد.');
}
export async function ensureMessageNumbers(){
 await getDbBinding().prepare(`INSERT OR IGNORE INTO message_numbers (request_id)
 SELECT id FROM (
  SELECT id,created_at FROM referrals
  UNION ALL SELECT id,created_at FROM contact_messages WHERE NOT EXISTS (SELECT 1 FROM referrals WHERE referrals.id=contact_messages.id)
 ) AS messages WHERE NOT EXISTS (SELECT 1 FROM message_numbers WHERE request_id=messages.id)
 ORDER BY created_at,id LIMIT 500`).run();
}
export async function messageNumber(id:string){return (await getDbBinding().prepare('SELECT number FROM message_numbers WHERE request_id=?').bind(id).first<{number:number}>())?.number??null;}
