import {committeeReviewer,listReferrals,deliveryEnabled,approveReferral} from '@/lib/referrals';
import {jsonInput,routeFailure,RequestError} from '@/lib/request-validation';
export const dynamic='force-dynamic';
export async function GET(){try{await committeeReviewer();return Response.json({items:await listReferrals(),emailDeliveryEnabled:deliveryEnabled()},{headers:{'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
export async function POST(request:Request){try{const user=await committeeReviewer(),body=await jsonInput(request,18000);if(typeof body.id!=='string'||!/^[-a-f0-9]{36}$/.test(body.id))throw new RequestError(400,'معرف غير صحيح.');return Response.json(await approveReferral(body.id,body,user.userId),{headers:{'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
