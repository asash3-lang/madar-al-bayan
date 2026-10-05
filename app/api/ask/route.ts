import {answerFromSources} from '@/lib/federated-search';
import {jsonInput,questionInput,routeFailure} from '@/lib/request-validation';
import {isLanguage} from '@/lib/i18n';
import {detectLanguage} from '@/lib/detect-language';
import {recordSearch} from '@/lib/search-analytics';
import {modelSettings} from '@/lib/runtime-model';
export async function POST(request:Request){
  try{
    const body=await jsonInput(request),question=questionInput(body),selected=body.language??'en';
    if(!isLanguage(selected))return Response.json({error:'Unsupported language'},{status:400});
    const detection=detectLanguage(question,selected);
    const result=await answerFromSources(question,detection.language,modelSettings());
    try{await recordSearch(question,result.language??detection.language,result.status);}catch{console.error('Search statistics unavailable');}
    // Ordinal relevance stays server-side; it is not a calibrated percentage.
    const evidence=result.evidence.map(({score,...e})=>e);
    return Response.json({...result,evidence,...detection},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return routeFailure(e);}
}
