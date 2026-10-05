import {jsonInput,routeFailure} from '@/lib/request-validation';
import {deliveryEnabled,submitReferral} from '@/lib/referrals';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({emailDeliveryEnabled:deliveryEnabled()},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){try{return Response.json(await submitReferral(await jsonInput(request)),{status:201,headers:{'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
