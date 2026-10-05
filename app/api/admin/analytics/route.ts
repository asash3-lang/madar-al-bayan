import {requireAdmin} from '@/lib/admin-auth';
import {getDbBinding} from '@/db';
import {routeFailure} from '@/lib/request-validation';
export const dynamic='force-dynamic';
const messages=`WITH all_messages AS (
 SELECT r.id,r.language,r.status,r.question,r.created_at,CASE WHEN r.status='sent' THEN COALESCE(r.sent_at,r.updated_at) END AS sent_at FROM referrals r
 UNION ALL SELECT c.id,c.language,'received',c.message,c.created_at,NULL FROM contact_messages c WHERE NOT EXISTS(SELECT 1 FROM referrals r WHERE r.id=c.id)
) , messages AS (SELECT * FROM all_messages m WHERE NOT EXISTS(SELECT 1 FROM message_numbers n WHERE n.request_id=m.id AND n.deleted_at IS NOT NULL))`;
export async function GET(request:Request){try{
 await requireAdmin(request);const daysValue=new URL(request.url).searchParams.get('days'),days=daysValue==='7'?7:daysValue==='90'?90:daysValue==='all'?null:30;
 const today=new Date(Date.now()+10800000).toISOString().slice(0,10),start=days===null?'1970-01-01T00:00:00.000Z':new Date(Date.parse(today+'T00:00:00+03:00')-(days-1)*86400000).toISOString();
 const db=getDbBinding(),r=await db.batch([
  db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(outcome='found'),0) AS found FROM search_events WHERE created_at>=?").bind(start),
  db.prepare(`${messages} SELECT COUNT(*) AS total,COALESCE(SUM(status!='sent'),0) AS pending FROM messages WHERE created_at>=?`).bind(start),
  db.prepare(`${messages} SELECT COUNT(*) AS sent FROM messages WHERE status='sent' AND sent_at>=?`).bind(start),
  db.prepare('SELECT language,COUNT(*) AS count FROM search_events WHERE created_at>=? GROUP BY language ORDER BY count DESC,language').bind(start),
  db.prepare(`${messages} SELECT language,COUNT(*) AS count FROM messages WHERE created_at>=? GROUP BY language ORDER BY count DESC,language`).bind(start),
  db.prepare('SELECT MIN(question) AS question,language,COUNT(*) AS count FROM search_events WHERE created_at>=? GROUP BY normalized_question,language ORDER BY count DESC,MAX(created_at) DESC LIMIT 8').bind(start),
  db.prepare(`${messages} SELECT question,language,COUNT(*) AS count FROM messages WHERE created_at>=? AND TRIM(question)!='' GROUP BY question,language ORDER BY count DESC,MAX(created_at) DESC LIMIT 8`).bind(start),
  db.prepare("SELECT substr(datetime(created_at,'+3 hours'),1,10) AS day,COUNT(*) AS count FROM search_events WHERE created_at>=? GROUP BY day ORDER BY day DESC LIMIT 90").bind(start),
  db.prepare(`${messages} SELECT substr(datetime(created_at,'+3 hours'),1,10) AS day,COUNT(*) AS count FROM messages WHERE created_at>=? GROUP BY day ORDER BY day DESC LIMIT 90`).bind(start),
  db.prepare(`${messages} SELECT substr(datetime(sent_at,'+3 hours'),1,10) AS day,COUNT(*) AS count FROM messages WHERE status='sent' AND sent_at>=? GROUP BY day ORDER BY day DESC LIMIT 90`).bind(start),
  db.prepare('SELECT MIN(created_at) AS firstSearch FROM search_events'),
 ]);
 const searches=r[0].results[0] as {total:number;found:number},inbound=r[1].results[0] as {total:number;pending:number},sent=r[2].results[0] as {sent:number};
 return Response.json({days,start,today,generatedAt:new Date().toISOString(),firstSearch:(r[10].results[0] as {firstSearch:string|null}).firstSearch,summary:{searches:searches.total,found:searches.found,messages:inbound.total,pending:inbound.pending,sent:sent.sent},languages:{search:r[3].results,messages:r[4].results},questions:{search:r[5].results,messages:r[6].results},activity:{search:r[7].results,messages:r[8].results,sent:r[9].results}},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return routeFailure(e);}}
