import extraLanguages from '@/lib/added-language-copy.json';
import type {SourceRecord} from './types';
type ReferenceLink={url:string;kind:'page'|'data'|'search'|'unavailable'};
const approvedHosts=new Set(['binbaz.org.sa','hadeethenc.com','quranenc.com','api.quranpedia.net','quranpedia.net','dev.surahapp.com','surahapp.com','icadb.com','dorar.net','byenah.com','islamhouse.com','api3.islamhouse.com']);
function safeUrl(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&approvedHosts.has(url.hostname)?url:null;}catch{return null;}}

// Navigation metadata only: never changes a publisher request, evidence or ranking.
export function sourceReferenceLink(source:SourceRecord):ReferenceLink{
 const canonical=safeUrl(source.canonicalUrl),api=safeUrl(source.apiUrl);
 // The seven saved Byenah editions only carry API URLs, which currently reject
 // public access. Keep the source text; don't offer a known failing reading link.
 if(source.publisher==='Byenah.com'&&canonical?.hostname==='byenah.com'&&canonical.pathname.includes('/Api/'))return {url:'',kind:'unavailable'};
 if(source.publisher==='ICADB.com'){
  // The documented phrase-search response has an ID, but no dedicated reading URL.
  // Keep the exact request that supplied the text; don't invent a phrase route.
  if(api?.hostname==='icadb.com'&&/^\/books\/api\/books\/relevant-examples\/[a-z]{2,3}\/$/.test(api.pathname)&&api.searchParams.has('query')){
   api.hash=':~:text='+encodeURIComponent(source.id.split(':')[1]??source.hadith.slice(0,100));
   return {url:api.href,kind:'data'};
  }
 }
 if(canonical&&canonical.pathname!=='/'){
  if(canonical.hostname==='dorar.net'&&canonical.pathname==='/hadith/search'){
   canonical.searchParams.set('q',source.hadith);return {url:canonical.href,kind:'search'};
  }
  return {url:canonical.href,kind:canonical.hostname.startsWith('api.')||/\/api\/|\/Api\//.test(canonical.pathname)?'data':'page'};
 }
 if(api&&api.pathname!=='/')return {url:api.href,kind:'data'};
 return {url:'',kind:'unavailable'};
}
const descriptions:Record<string,{data:string;search:string;unavailable:string}>={
 ar:{data:'لم يرفق الناشر رابط صفحة قراءة لهذا السجل؛ الرابط يفتح بياناته الرسمية التي ورد منها النص.',search:'الرابط يبحث عن نص الرواية كاملًا لدى الناشر؛ لم يُرفق رابط منفرد لها.',unavailable:'رابط المرجع غير متاح حاليًا.'},
 en:{data:'No reading-page link was supplied for this record. This link opens the official data response used for the text.',search:'This link searches the full narration at the publisher. No individual record link was supplied.',unavailable:'A direct reference link is currently unavailable.'},
 fr:{data:'Aucun lien de lecture distinct n’a été fourni. Ce lien ouvre les données officielles dont ce texte est extrait.',search:'Ce lien recherche le récit complet chez l’éditeur. Aucun lien individuel n’a été fourni.',unavailable:'Le lien direct vers la référence est actuellement indisponible.'},
 es:{data:'No se proporcionó una página de lectura para este registro. El enlace abre los datos oficiales de los que procede el texto.',search:'El enlace busca la narración completa en el sitio del editor. No se proporcionó un enlace individual.',unavailable:'El enlace directo a la referencia no está disponible por el momento.'},
 zh:{data:'发布方未提供此记录的独立阅读页面。此链接打开该文本所依据的官方数据。',search:'此链接在发布方网站搜索完整传述；未提供单独记录的链接。',unavailable:'参考资料的直接链接目前不可用。'},
 hi:{data:'इस रिकॉर्ड का अलग पठन-पृष्ठ नहीं दिया गया है। यह लिंक उस आधिकारिक डेटा को खोलता है जिससे पाठ लिया गया है।',search:'यह लिंक प्रकाशक की वेबसाइट पर पूरी रिवायत खोजता है। अलग रिकॉर्ड का लिंक नहीं दिया गया है।',unavailable:'संदर्भ का सीधा लिंक अभी उपलब्ध नहीं है।'},
 fa:{data:'ناشر پیوند صفحهٔ مطالعهٔ مستقلی برای این رکورد ارائه نکرده است. این پیوند داده‌های رسمیِ منبع متن را باز می‌کند.',search:'این پیوند متن کامل روایت را در وبگاه ناشر جستجو می‌کند؛ پیوند مستقلی ارائه نشده است.',unavailable:'پیوند مستقیم منبع در حال حاضر در دسترس نیست.'},
};
Object.assign(descriptions,extraLanguages.sourceLinkDescriptions);
export function sourceLinkDescription(kind:ReferenceLink['kind'],language:string){return kind==='page'?'':(descriptions[language]??descriptions.en)[kind];}
