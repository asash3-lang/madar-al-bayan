import {getDbBinding} from '@/db';
import {RequestError} from './request-validation';
import {isLanguage} from './i18n';
import {ensureMessageNumbers} from './message-store';
import {messageReference} from './message-labels';
export async function saveContact(body:Record<string,unknown>){
 if(typeof body.contact!=='string'||body.website)throw new RequestError(400,'Invalid contact');
 let contact=body.contact.trim();
 const email=contact.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
 if(email)contact=contact.toLowerCase();else{contact=contact.replace(/[\s()-]/g,'').replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));if(!/^\+?\d{7,15}$/.test(contact))throw new RequestError(400,'Enter an email address or phone number');}
 const name=typeof body.name==='string'?body.name.trim():'',message=typeof body.message==='string'?body.message.trim():'';
 if(name.length>100||message.length>4000)throw new RequestError(400,'Message too long');
 const language=isLanguage(body.language)?body.language:'en',id=crypto.randomUUID(),now=new Date().toISOString(),db=getDbBinding();
 await ensureMessageNumbers();
 const results=await db.batch([db.prepare('INSERT INTO contact_messages (id,contact,name,message,language,created_at) VALUES (?,?,?,?,?,?)').bind(id,contact,name,message,language,now),db.prepare('INSERT INTO message_numbers (request_id) VALUES (?) RETURNING number').bind(id)]);
 const number=(results[1].results[0] as {number:number}).number;return {id,number,reference:messageReference(number,id),status:'saved'};
}
export async function listContact(){return (await getDbBinding().prepare('SELECT id,contact,name,message,language,created_at FROM contact_messages ORDER BY created_at DESC LIMIT 100').all()).results;}
