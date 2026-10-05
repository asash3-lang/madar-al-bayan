import {adminSession,loginAdmin,logoutAdmin} from '@/lib/admin-auth';
import {jsonInput,routeFailure} from '@/lib/request-validation';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return Response.json({authenticated:!!await adminSession(request)},{headers:{'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
export async function POST(request:Request){try{const b=await jsonInput(request,1000);return Response.json({authenticated:true},{headers:{'Set-Cookie':await loginAdmin(b.username,b.password),'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
export async function DELETE(request:Request){try{await jsonInput(request,100);return Response.json({authenticated:false},{headers:{'Set-Cookie':await logoutAdmin(request),'Cache-Control':'no-store'}});}catch(e){return routeFailure(e);}}
