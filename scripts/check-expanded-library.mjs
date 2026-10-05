import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=process.cwd();
const out='/tmp/madar-expanded-library-check';
await fs.mkdir(out,{recursive:true});
const langs=['ar','en','fr','es','zh','hi','fa','id','ur'];
const cases={
 ar:['ما هو الإسلام؟','كيفية الصلاة بالإسلام؟','هل تعتمد قيمة الأعمال على النية؟','كيف أزيد سرعة الإنترنت في رمضان؟','نسيت الركوع في صلاتي اليوم، هل صلاتي صحيحة؟'],
 en:['What is Islam?','How to pray in Islam?','Do actions depend on intentions?','How can I increase internet bandwidth in Ramadan?','I forgot bowing in my prayer today. Is my prayer valid?'],
 fr:['Qu’est-ce que l’islam ?','Comment prier en islam ?','La valeur des actes dépend-elle des intentions ?','Comment augmenter la vitesse Internet pendant le Ramadan ?','J’ai oublié l’inclinaison dans ma prière aujourd’hui. Ma prière est-elle valide ?'],
 es:['¿Qué es el islam?','¿Cómo se reza en el islam?','¿El valor de las obras depende de las intenciones?','¿Cómo puedo aumentar la velocidad de Internet durante el Ramadán?','Hoy olvidé inclinarme durante mi oración. ¿Es válida mi oración?'],
 zh:['什么是伊斯兰教？','伊斯兰中如何祈祷？','行为的价值取决于举意吗？','斋月期间如何提高互联网速度？','我今天礼拜时忘记了鞠躬，我的礼拜有效吗？'],
 hi:['इस्लाम क्या है?','इस्लाम में नमाज़ कैसे पढ़ें?','क्या कर्मों का मूल्य नीयत पर निर्भर है?','रमज़ान में इंटरनेट की गति कैसे बढ़ाऊँ?','आज नमाज़ में मैं रुकू करना भूल गया। क्या मेरी नमाज़ सही है?'],
 fa:['اسلام چیست؟','چگونه در اسلام نماز بخوانم؟','آیا ارزش اعمال به نیت بستگی دارد؟','چگونه در رمضان سرعت اینترنت را افزایش دهم؟','امروز در نمازم رکوع را فراموش کردم. آیا نماز من صحیح است؟'],
 id:['Apa itu Islam?','Bagaimana cara salat dalam Islam?','Apakah nilai amal bergantung pada niat?','Bagaimana cara meningkatkan kecepatan internet pada bulan Ramadan?','Saya lupa rukuk dalam salat hari ini. Apakah salat saya sah?'],
 ur:['اسلام کیا ہے؟','اسلام میں نماز کیسے پڑھیں؟','کیا اعمال کی قدر نیت پر منحصر ہے؟','رمضان میں انٹرنیٹ کی رفتار کیسے بڑھاؤں؟','آج نماز میں رکوع کرنا بھول گیا۔ کیا میری نماز درست ہے؟'],
};
const ids=['definition','procedure','intention','off-topic','personal-ruling'];
const deployCases=langs.flatMap(language=>cases[language].map((question,i)=>({
 language,question,selectedLanguage:'en',case:ids[i],
 expected:i<3?{status:['found'],sourceLanguage:language,exactLiteralQuote:true,publisherLinkRequired:true,topic:i===0?'definition of Islam':i===1?'actual steps/description of prayer, not merely its reward or timing':'relationship of actions and intentions',relevantWitness:i===0?'4563':i===1?'10901':'4560'}:i===3?{status:['insufficient','referral'],evidenceMustBeEmpty:true,reason:'No religious passage answers an internet-speed question'}:{status:['referral','insufficient'],evidenceMustBeEmpty:true,reason:'Individual validity ruling requires review'},
})));
await fs.writeFile(path.join(out,'deployment-cases.json'),JSON.stringify({purpose:'Manual/live deployment acceptance cases. No model accuracy asserted by controlled local tests.',cases:deployCases},null,2));
const {build}=createRequire(await fs.realpath(path.join(root,'node_modules/wrangler/package.json')))('esbuild');
globalThis.__readOnlyAuditEnv={ASSETS:{fetch:async request=>{
 const p=path.resolve(root,'public','.'+new URL(request.url).pathname);
 if(!p.startsWith(path.join(root,'public/sources/')))throw Error('Unexpected asset path');
 try{return new Response(await fs.readFile(p));}catch{return new Response('',{status:404});}
}}};
const b=await build({stdin:{contents:"export {detectLanguage} from './lib/detect-language'; export {teachingCandidates} from './lib/fulltext-search'; export {searchTerms} from './lib/retrieval-terms'; export {languages,copy,isRTL} from './lib/i18n'; export {hadithSnapshot} from './lib/publisher-assets'; export {answerFromSources} from './lib/federated-search'; export {validateRanked} from './lib/context-ranking';",resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'runtime',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'runtime',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const env=globalThis.__readOnlyAuditEnv'}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const report={createdAt:new Date().toISOString(),scope:'Read-only source inspection + asset identity + controlled model/provider tests, not live model accuracy.',checks:[],snapshots:{},summary:{}};
const check=(name,passed,detail={})=>report.checks.push({name,passed,...detail});
check('Exactly nine enabled languages',api.languages.length===9&&langs.every(l=>api.languages.some(x=>x.code===l)));
check('English is the default first language',api.languages[0].code==='en');
for(const language of langs){
 for(const i of [0,1,2]){
  const detected=api.detectLanguage(cases[language][i],'en');
  check('Automatic language '+language+'/'+ids[i],detected.language===language,{question:cases[language][i],actual:detected.language});
 }
 check('Procedure candidate '+language,api.teachingCandidates(cases[language][1]).includes('10901'));
 const fields=Object.keys(api.copy.en),missing=fields.filter(k=>!(k in api.copy[language]));
 check('UI copy fields '+language,missing.length===0,{missing});
 check('Text direction '+language,api.isRTL(language)===['ar','fa','ur'].includes(language));
}
for(const language of ['id','ur']){
 const dir=path.join(root,'public/sources/hadith',language),files=(await fs.readdir(dir)).filter(x=>/^\d+\.json$/.test(x));
 let total=0;const invalid=[],seen=new Set();
 for(const file of files){const data=JSON.parse(await fs.readFile(path.join(dir,file),'utf8'));
  for(const [key,r]of Object.entries(data.records??{})){total++;const errors=[];
   if(String(r.id)!==key)errors.push('id');if(seen.has(key))errors.push('duplicate');seen.add(key);
   if(r.lang!==language)errors.push('language');for(const f of ['title','hadith_text','grade','takhrij'])if(typeof r[f]!=='string'||!r[f].trim())errors.push(f);
   if(r.hadith_text===r.hadith_text_ar)errors.push('Arabic-substitution');
   if(errors.length)invalid.push({id:key,errors});
  }
 }
 check('Every saved hadith '+language,invalid.length===0,{total,shards:files.length,invalid:invalid.slice(0,10)});
 const index=JSON.parse(await fs.readFile(path.join(root,'public/sources/titles',language+'.json'),'utf8'));
 check('Title catalog matches full-text count '+language,total===index.records.length,{bodyCount:total,titleCount:index.records.length});
 const qdir=path.join(root,'public/sources/quran',language),qindex=JSON.parse(await fs.readFile(path.join(qdir,'index.json'),'utf8'));
 let verses=0;const qinvalid=[],verseIds=new Set();
 for(let sura=1;sura<=114;sura++){const data=JSON.parse(await fs.readFile(path.join(qdir,sura+'.json'),'utf8'));
  for(const [id,r]of Object.entries(data.records??{})){verses++;if(verseIds.has(id)||r.sura!==sura||id!==`${r.sura}:${r.aya}`||!r.translation?.trim()||!r.arabic_text?.trim()||r.translation===r.arabic_text)qinvalid.push(id);verseIds.add(id);}
 }
 check('Complete official Quran translation '+language,verses===6236&&qinvalid.length===0&&qindex.meta.language_iso_code===language,{verses,invalid:qinvalid.slice(0,8),key:qindex.meta.key,version:qindex.meta.version});
 report.snapshots[language]={hadith:total,quran:verses};
}
let acceptance=false,modelQueries=[],rankCalls=0;
globalThis.fetch=async(url,options)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')return new Response('',{status:503});
 const body=JSON.parse(options.body),input=JSON.parse(body.input);
 if(body.text.format.name==='question_search_plan')return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({intent:input.question,queries:[input.question],requiresReview:false})}]}]});
 rankCalls++;modelQueries.push(input.question);
 const witness=input.documents.find(d=>d.id==='10901');
 const items=acceptance&&witness?[{id:witness.id,relevance:97,directAnswer:true,allConstraints:true,quote:witness.hadith,kind:'hadith'}]:[];
 return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({requiresReview:false,items})}]}]});
};
const saveError=console.error,saveInfo=console.info;console.error=()=>{};console.info=()=>{};
try{
 for(const language of langs){
  acceptance=true;rankCalls=0;modelQueries=[];
  const result=await api.answerFromSources(cases[language][1],language,{key:'controlled-fixture'});
  check('Controlled procedure recovery '+language,result.status==='found'&&result.evidence.some(e=>e.source.id==='10901'&&e.source.language===language)&&rankCalls===1&&modelQueries[0]===cases[language][1]&&result.queryUnderstanding==='astra',{status:result.status,contextMode:result.contextMode,ids:result.evidence.map(e=>e.source.id),rankCalls});
  for(const e of result.evidence)check('Literal publisher source '+language,e.source.hadith.includes(e.excerpt)&&e.source.canonicalUrl===`https://hadeethenc.com/${language}/browse/hadith/${e.source.id}`);
  acceptance=false;rankCalls=0;
  const denied=await api.answerFromSources(cases[language][3],language,{key:'controlled-fixture'});
  check('Controlled rejection '+language,denied.evidence.length===0&&denied.status!=='found',{status:denied.status,contextMode:denied.contextMode,rankCalls});
 }
}finally{console.error=saveError;console.info=saveInfo;}
report.summary={total:report.checks.length,passed:report.checks.filter(x=>x.passed).length,failed:report.checks.filter(x=>!x.passed).length};
await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));
if(report.summary.failed)process.exitCode=1;
await fs.writeFile(path.join(root,'docs/expanded-library-test-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary:report.summary,failures:report.checks.filter(x=>!x.passed),paths:[path.join(out,'results.json'),path.join(out,'deployment-cases.json')]}));
