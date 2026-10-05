import catalog from './resource-catalog.json';
import publisherLanguages from './publisher-languages.json';
import {currentReferences,upcomingReferences,libraryLanguageCounts} from './reference-directory';
import {languages} from './i18n';
export const connectedReferences=currentReferences.map(row=>({...catalog.rows.find(r=>r.id===row.id)!,scope:row.material.ar,availability:row.quantity.ar,kind:row.id===9?'فهرس وملفات':'محتوى مرجعي'}));
export const plannedReferences=upcomingReferences.map(row=>({...catalog.rows.find(r=>r.id===row.id)!,scope:row.material.ar,requirement:'إعداد المحتوى وتوثيق الوصول وحقوق الاستخدام.'}));
export const currentLanguages=libraryLanguageCounts.map(row=>({code:row.code,name:row.ar,native:languages.find(l=>l.code===row.code)?.name??row.en,hadith:row.texts,explanations:row.explanations}));
const targetNames:Record<string,string>={bs:'البوسنية',ru:'الروسية',tr:'التركية',tl:'التاغالوغية',ku:'الكردية',bn:'البنغالية',ha:'الهوسا',pt:'البرتغالية',si:'السنهالية',vi:'الفيتنامية',ug:'الأويغورية'};
export const targetLanguages=publisherLanguages.filter(row=>targetNames[row.code]).sort((a,b)=>b.count-a.count).map(row=>({...row,native:row.name,name:targetNames[row.code]}));
