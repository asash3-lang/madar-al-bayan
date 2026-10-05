import {env} from 'cloudflare:workers';
import {getDbBinding} from '@/db';
import {headers} from 'next/headers';
import {RequestError} from './request-validation';
const cookieName='__Host-madar-admin';
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async(text:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
const bytes=(s:string)=>Uint8Array.from(s.match(/../g)??[],x=>parseInt(x,16));
export async function verifyAdminPassword(password:string,stored=env.ADMIN_PASSWORD_HASH??''){
 const [algorithm,iterations,salt,expected]=stored.split(':');
 if(algorithm!=='pbkdf2'||iterations!=='100000'||!/^([a-f0-9]{2}){16}$/.test(salt??'')||!/^([a-f0-9]{2}){32}$/.test(expected??''))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const actual=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(salt),iterations:100000,hash:'SHA-256'},key,256));
 let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}
export async function adminSession(request?:Request){
 const h=request?.headers??await headers(),cookie=h.get('cookie')??'';
 const token=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const tokenHash=await digest(token),row=await getDbBinding().prepare('SELECT expires_at FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(tokenHash,Date.now()).first();
 return row?{userId:'site-administrator',displayName:env.ADMIN_DISPLAY_NAME?.trim()||'Site administrator',tokenHash}:null;
}
export async function requireAdmin(request?:Request){const user=await adminSession(request);if(!user)throw new RequestError(401,'يرجى تسجيل الدخول إلى الإدارة.');return user;}
export async function loginAdmin(username:unknown,password:unknown){
 if(typeof username!=='string'||typeof password!=='string'||username.length>100||password.length>200)throw new RequestError(400,'بيانات الدخول غير صحيحة.');
 if(!env.ADMIN_PASSWORD_HASH||!env.ADMIN_USERNAME?.trim())throw new RequestError(503,'لم يكتمل إعداد دخول الإدارة.');
 const db=getDbBinding(),now=Date.now();
 // A single-account global limit cannot be bypassed by rotating IPs.
 const slot=await db.prepare("INSERT INTO admin_login_limits (bucket,attempts,reset_at) VALUES ('admin',1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END WHERE reset_at<=? OR attempts<5 RETURNING attempts").bind(now+900000,now,now,now+900000,now).first();
 if(!slot)throw new RequestError(429,'محاولات كثيرة. أعد المحاولة بعد ١٥ دقيقة.');
 const name=username.trim().replace(/\s+/g,' '),validName=name===env.ADMIN_USERNAME.trim().replace(/\s+/g,' ');
 const validPassword=await verifyAdminPassword(password);
 if(!validName||!validPassword)throw new RequestError(401,'اسم المستخدم أو كلمة المرور غير صحيحة.');
 const token=hex(crypto.getRandomValues(new Uint8Array(32)).buffer),hash=await digest(token);
 await db.batch([db.prepare('INSERT INTO admin_sessions (token_hash,expires_at,created_at) VALUES (?,?,?)').bind(hash,now+28800000,now),db.prepare("DELETE FROM admin_login_limits WHERE bucket='admin'"),db.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now)]);
 // Partitioned cookies retain the session inside the embedded Site as well as
 // in a normal tab. JSON mutations still enforce the Site's Origin separately.
 return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=28800`;
}
export async function logoutAdmin(request:Request){const user=await adminSession(request);if(user)await getDbBinding().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(user.tokenHash).run();return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`;}
