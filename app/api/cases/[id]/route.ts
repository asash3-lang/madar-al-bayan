import {currentReviewer,getCase,caseEvents,reviewCase} from '@/lib/case-store';
import {jsonInput,RequestError,routeFailure} from '@/lib/request-validation';
import type {ReviewDecision} from '@/lib/types';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context){try{const {id}=await context.params,u=await currentReviewer();return Response.json({case:await getCase(id,u.userId),events:await caseEvents(id,u.userId)},{headers:{'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
export async function POST(request:Request,context:Context){try{
  const {id}=await context.params,u=await currentReviewer(),body=await jsonInput(request);
  if(!['pending','approved','referral','rejected'].includes(String(body.decision))||typeof body.note!=='string'||body.note.length>2000||!Number.isSafeInteger(body.revision)||Number(body.revision)<1)throw new RequestError(400,'تحقق من القرار والملاحظة وإصدار الحالة.');
  return Response.json({case:await reviewCase(id,u.userId,u.displayName,body.decision as ReviewDecision,body.note.trim(),Number(body.revision)),events:await caseEvents(id,u.userId)},{headers:{'Cache-Control':'no-store'}});
}catch(e){return routeFailure(e);}}
