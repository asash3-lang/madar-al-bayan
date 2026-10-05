import {islamhouseLibrary} from '@/lib/publisher-adapters';
import {isLanguage} from '@/lib/i18n';

export async function GET(request:Request){
 const u=new URL(request.url),language=u.searchParams.get('language')??'en',page=Number(u.searchParams.get('page')??'1');
 if(!isLanguage(language)||!Number.isSafeInteger(page)||page<1||page>1000)return Response.json({error:'Invalid language or page'},{status:400});
 try{return Response.json(await islamhouseLibrary(language,page),{headers:{'Cache-Control':'public, max-age=900'}});}
 catch{return Response.json({error:'Publisher catalog unavailable'},{status:503});}
}
