export async function jsonInput(request:Request,maxLength=6000):Promise<Record<string,unknown>>{
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new RequestError(403,'طلب من مصدر غير مسموح.');
  if(!(request.headers.get('content-type')??'').includes('application/json'))throw new RequestError(415,'صيغة الطلب غير صحيحة.');
  const raw=await request.text();if(raw.length>maxLength)throw new RequestError(413,'الطلب أطول من الحد المسموح.');
  let body:unknown;try{body=JSON.parse(raw);}catch{throw new RequestError(400,'تعذر قراءة الطلب.');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new RequestError(400,'الطلب غير صحيح.');
  return body as Record<string,unknown>;
}
export function questionInput(body:Record<string,unknown>){
  if(typeof body.question!=='string')throw new RequestError(400,'اكتب سؤالًا نصيًا.');
  const q=body.question.trim();if(q.length<1||q.length>1000)throw new RequestError(400,'اكتب حرفًا واحدًا على الأقل، وحتى ١٠٠٠ حرف.');return q;
}
export class RequestError extends Error{constructor(public status:number,message:string){super(message);}}
export function routeFailure(e:unknown){
  if(e instanceof RequestError)return Response.json({error:e.message},{status:e.status});
  console.error('Madar request failed',e instanceof Error?e.name:'UnknownError');
  return Response.json({error:'الخدمة غير متاحة الآن. احتفظ بالنص وحاول مرة أخرى.'},{status:503});
}
