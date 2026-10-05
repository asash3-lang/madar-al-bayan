import extraLanguages from '@/lib/added-language-copy.json';
import type {Language} from '@/lib/i18n';
import type {SourceRecord} from '@/lib/types';

const labels:Record<Language,{references:string;publisher:string}>={
 ar:{references:'المراجع',publisher:'بيانات الناشر'},
 en:{references:'References',publisher:'Publisher information'},
 fr:{references:'Références',publisher:'Informations de l’éditeur'},
 es:{references:'Referencias',publisher:'Información del editor'},
 zh:{references:'参考资料',publisher:'发布方信息'},
 hi:{references:'संदर्भ',publisher:'प्रकाशक की जानकारी'},
 fa:{references:'منابع',publisher:'اطلاعات ناشر'},
};
Object.assign(labels,extraLanguages.sourceReferences);
const normalize=(value:string)=>value.normalize('NFKC').replace(/[\[\]{}()\u064b-\u065f\u0670]/g,'').replace(/\s+/g,' ').trim();

// Display only. Publisher records, Arabic originals and search ranking stay intact.
export function readableReferences(source:SourceRecord){
 const repeated=new Set([normalize(source.grade),normalize(source.attribution)]);
 return [...new Set(source.references.map(text=>text.trim()).filter(Boolean))].filter(text=>{
  if(repeated.has(normalize(text)))return false;
  // HadeethEnc's bibliography can remain Arabic even when the hadith is translated.
  // The translated attribution is already displayed with the hadith.
  if(source.publisher==='HadeethEnc.com'&&source.language!=='ar'&&/\p{Script=Arabic}/u.test(text))return false;
  return true;
 });
}

export function SourceReferences({source,language}:{source:SourceRecord;language:Language}){
 const references=readableReferences(source),t=labels[language];
 return <>
  {references.length>0&&<section className="source-bibliography"><h3>{t.references}</h3><ul className="source-references">{references.map((text,i)=><li key={i} dir="auto">{text}</li>)}</ul></section>}
  {source.publisherNotice&&<details className="publisher-details"><summary>{t.publisher}</summary><pre className="publisher-notice" dir="auto">{source.publisherNotice}</pre></details>}
 </>;
}
