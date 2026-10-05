import {saveContact,listContact} from '@/lib/contact';
import {committeeReviewer} from '@/lib/referrals';
import {jsonInput,routeFailure} from '@/lib/request-validation';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{return Response.json(await saveContact(await jsonInput(request)),{status:201,headers:{'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
export async function GET(){try{await committeeReviewer();return Response.json({items:await listContact()},{headers:{'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
