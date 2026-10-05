import {getDbBinding} from '@/db';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {answerFromSources} from './federated-search';
import {modelSettings} from './runtime-model';
import {canReview} from './policy';
import {RequestError} from './request-validation';
import type {CaseRecord,ReviewDecision,ReviewEvent} from './types';
type Row={id:string;owner_id:string;question:string;topic:string;level:CaseRecord['level'];response_json:string;decision:ReviewDecision;note:string;revision:number;last_event_id:string;created_at:string;updated_at:string};
function record(row:Row):CaseRecord{return {id:row.id,question:row.question,topic:row.topic,level:row.level,response:JSON.parse(row.response_json),decision:row.decision,note:row.note,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at};}
export async function currentReviewer(){
  const user=await getChatGPTUser();
  if(!user)throw new RequestError(401,'يلزم تسجيل الدخول لفتح ملفاتك المحفوظة.');
  return user;
}
export async function listCases(owner:string){
  const result=await getDbBinding().prepare('SELECT id,question,topic,level,decision,note,revision,created_at,updated_at FROM cases WHERE owner_id = ? ORDER BY created_at DESC LIMIT 50').bind(owner).all<Omit<Row,'response_json'|'owner_id'|'last_event_id'>>();
  return result.results.map(r=>({id:r.id,question:r.question,topic:r.topic,level:r.level,decision:r.decision,note:r.note,revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at}));
}
export async function getCase(id:string,owner:string){
  const row=await getDbBinding().prepare('SELECT * FROM cases WHERE id = ? AND owner_id = ?').bind(id,owner).first<Row>();
  if(!row)throw new RequestError(404,'الحالة غير موجودة أو غير متاحة لك.');
  return record(row);
}
export async function caseEvents(id:string,owner:string){
  await getCase(id,owner);
  const result=await getDbBinding().prepare('SELECT id,case_id,from_decision,to_decision,note,actor,created_at FROM review_events WHERE case_id = ? AND owner_id = ? ORDER BY created_at, rowid').bind(id,owner).all<{id:string;case_id:string;from_decision:ReviewDecision|null;to_decision:ReviewDecision;note:string;actor:string;created_at:string}>();
  return result.results.map(r=>({id:r.id,caseId:r.case_id,fromDecision:r.from_decision,toDecision:r.to_decision,note:r.note,actor:r.actor,createdAt:r.created_at})) satisfies ReviewEvent[];
}
export async function createCase(question:string,owner:string,actor:string){
  const response=await answerFromSources(question,'ar',modelSettings());
  const id=crypto.randomUUID(),event=crypto.randomUUID(),now=new Date().toISOString(),db=getDbBinding();
  await db.batch([
    db.prepare('INSERT INTO cases (id,owner_id,question,topic,level,response_json,decision,note,revision,last_event_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?, ?,1,?,?,?)').bind(id,owner,question,response.analysis.topic,response.analysis.level,JSON.stringify(response),'pending','',event,now,now),
    db.prepare('INSERT INTO review_events (id,case_id,owner_id,from_decision,to_decision,note,actor,created_at) VALUES (?,?,?,NULL,?,?,?,?)').bind(event,id,owner,'pending','إنشاء مسودة؛ لم تُعتمد علميًا.',actor,now),
  ]);
  return getCase(id,owner);
}
export async function reviewCase(id:string,owner:string,actor:string,decision:ReviewDecision,note:string,revision:number){
  const current=await getCase(id,owner),failure=canReview(current.response,decision,note);
  if(failure)throw new RequestError(400,failure);
  if(current.revision!==revision)throw new RequestError(409,'تغيرت الحالة منذ فتحها. حدّثها قبل تسجيل القرار.');
  const event=crypto.randomUUID(),now=new Date().toISOString(),db=getDbBinding();
  const result=await db.batch([
    db.prepare('UPDATE cases SET decision = ?, note = ?, revision = revision + 1, last_event_id = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND revision = ? RETURNING id').bind(decision,note,event,now,id,owner,revision),
    db.prepare('INSERT INTO review_events (id,case_id,owner_id,from_decision,to_decision,note,actor,created_at) SELECT ?,id,owner_id,?,?,?,?,? FROM cases WHERE id = ? AND owner_id = ? AND last_event_id = ?').bind(event,current.decision,decision,note,actor,now,id,owner,event),
  ]);
  if(!result[0].results.length)throw new RequestError(409,'تغيرت الحالة منذ فتحها. حدّثها قبل تسجيل القرار.');
  return getCase(id,owner);
}
