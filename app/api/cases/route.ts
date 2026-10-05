import {currentReviewer,listCases,createCase} from '@/lib/case-store';
import {jsonInput,questionInput,routeFailure} from '@/lib/request-validation';
export const dynamic='force-dynamic';
export async function GET(){try{const u=await currentReviewer();return Response.json({cases:await listCases(u.userId)},{headers:{'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
export async function POST(request:Request){try{const u=await currentReviewer(),q=questionInput(await jsonInput(request));return Response.json({case:await createCase(q,u.userId,u.displayName)},{status:201,headers:{'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
