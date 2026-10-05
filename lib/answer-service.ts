import {loadSources} from './sources';
import {classifyPilotQuestion,retrieve} from './retrieval';
import {analyzeQuestion} from './policy';
import {generateGroundedAnswer} from './grounded-answer';
import type {SearchResponse} from './types';
import {searchSources} from './source-search';
export type ModelSettings={key?:string;model?:string};
export async function answerQuestion(question:string, settings:ModelSettings={}):Promise<SearchResponse>{
  const start=Date.now(),policy=classifyPilotQuestion(question),analysis=analyzeQuestion(question);
  const result:SearchResponse={question,status:'insufficient',message:'',evidence:[],dataMode:'snapshot',durationMs:0,generationEnabled:!!settings.key,analysis,answer:[],generationStatus:settings.key?'not-applicable':'disabled',generatedBy:null};
  if(analysis.level==='D'||analysis.level==='C'){
    result.status='referral';result.message=analysis.level==='D'?'السؤال يتعلق بحالة شخصية أو حكم على شخص. يحتاج القرار إلى جهة علمية مؤهلة تعرف تفاصيل الحالة.':'هذا الموضوع حساس أو خلافي ويحتاج مادة متخصصة ومراجعة علمية. لن نكوّن حكمًا من المكتبة المحدودة.';
  }else if(policy==='clarify'){
    result.status='clarify';result.message='حدد المفهوم والسياق الذي تقصده. لا تُنقل نتيجة سؤال سابق إلى سؤال جديد تلقائيًا.';
  }else if(policy==='insufficient'){
    result.message='لا يمكن اختلاق نص ديني أو نسبة قول بلا مصدر. اكتب سؤالًا لنبحث عن دليله.';
  }else{
    const sources=await loadSources();result.evidence=retrieve(question,sources);
    let sourceUnavailable=false;
    if(!result.evidence.length){const found=await searchSources(question,'ar');result.evidence=found.evidence;sourceUnavailable=found.unavailable;}
    result.status=result.evidence.length?'found':'insufficient';
    result.message=result.evidence.length?'هذه مقاطع أصلية مرتبطة بالسؤال. راجع الدليل وسياق السؤال قبل اعتماد النتيجة.':'لم أجد دليلًا كافيًا في المكتبة المحدودة. عدم العثور على نص هنا لا يثبت عدم وجوده أو صحة نقيضه.';
    if(sourceUnavailable)result.message='تعذر الوصول إلى المصدر الآن. حاول مجددًا.';
    const modes=new Set(result.evidence.map(e=>e.source.accessMode));result.dataMode=modes.size===2?'mixed':modes.has('live')?'live':'snapshot';
    if(settings.key&&result.evidence.length){
      try{
        const model=settings.model||'gpt-4.1-mini',draft=await generateGroundedAnswer(question,result.evidence,analysis,settings.key,model);
        result.analysis=draft.analysis;
        if(['C','D'].includes(draft.analysis.level)){result.status='referral';result.message=draft.analysis.reason;result.evidence=[];}
        else if(!draft.supported){result.status='insufficient';result.message='المقاطع الموجودة لا تكفي للإجابة عن هذا السؤال. تبقى النتيجة غير محسومة وتحتاج مصدرًا أدق.';}
        else result.answer=draft.claims;
        result.generationStatus='generated';result.generatedBy=model;
      }catch{result.generationStatus='unavailable';result.message+=' تعذرت صياغة الإجابة؛ بقيت الأدلة الأصلية متاحة.';}
    }
  }
  result.durationMs=Date.now()-start;return result;
}
