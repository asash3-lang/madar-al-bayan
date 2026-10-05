import {currentReviewer,getCase,caseEvents} from '@/lib/case-store';
import {caseMarkdown} from '@/lib/export-case';
import {routeFailure} from '@/lib/request-validation';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{
  const {id}=await context.params,u=await currentReviewer(),record=await getCase(id,u.userId),events=await caseEvents(id,u.userId);
  const format=new URL(request.url).searchParams.get('format');
  if(format==='json')return new Response(JSON.stringify({case:record,events},null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="Madar_Case_${record.id}.json"`,'Cache-Control':'no-store'}});
  return new Response(caseMarkdown(record,events),{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="Madar_Case_${record.id}.md"`,'Cache-Control':'no-store'}});
}catch(e){return routeFailure(e);}}
