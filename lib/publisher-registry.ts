// This records implemented capabilities, not proof that a publisher is reachable.
export const publisherIntegrations=[
 {id:1,key:'quranenc',name:'QuranEnc.com',capability:'ترجمات الآيات؛ اتصال مباشر ونسخ الناشر'},
 {id:2,key:'hadeethenc',name:'HadeethEnc.com',capability:'الحديث وشرحه وترجماته؛ اتصال مباشر ونسخ الناشر'},
 {id:3,key:'quranpedia',name:'Quranpedia.net',capability:'نص الآية وترجماتها والتفسير بحسب رقم الآية'},
 {id:4,key:'surah',name:'Surah',capability:'تفسير السعدي بحسب رقم الآية (العربية)'},
 {id:5,key:'mp3quran',name:'MP3Quran.net',capability:'فهرس القراء وروابط تسجيلات السور'},
 {id:6,key:'icadb',name:'ICADB.com',capability:'البحث الدلالي في نصوص الكتب وترجماتها المتاحة'},
 {id:7,key:'dorar',name:'Dorar.net',capability:'بحث الحديث مع حكم كل رواية ومراجعها (العربية)'},
 {id:8,key:'byenah',name:'Byenah.com',capability:'النصوص والترجمات؛ ونسخ رسمية لمادة تعريفية في ٧ لغات عند تعذر الاتصال'},
 {id:9,key:'islamhouse',name:'IslamHouse.com',capability:'فهرس المقالات وروابط المرفقات؛ النص الكامل عند توافره'},
 {id:27,key:'binbaz',name:'BinBaz.org.sa',capability:'١٠١ إجابة عربية من الموقع الرسمي؛ نصوص أصلية محفوظة وروابط فردية'},
 {id:11,key:'siwar',name:'Siwar',capability:'المعاجم العامة؛ يتطلب مفتاح الجهة ومعرّفات المعاجم'},
 {id:12,key:'islamic-mcp',name:'Islamic Content MCP',capability:'بحث الحديث عبر MCP ثم استرجاع النص من HadeethEnc؛ بوابة للمصادر نفسها'},
 {id:16,key:'shamela-mcp',name:'Shamela MCP',capability:'فحص عنوان MCP المعلن؛ لا يُعتمد قبل نجاح استرجاع نص'},
] as const;
export function integrationLabel(id:number){
 if(id===10)return 'المحتوى المتاح عبر ICADB؛ ليس اتصالًا مستقلًا';
 if(id===11)return 'موصل جاهز؛ بانتظار مفتاح سوار';
 if([12,16].includes(id))return 'فحص MCP متاح؛ لا يُعد مصدرًا إضافيًا';
 if(id===36)return 'دليل توثيق؛ ليس قاعدة محتوى';
 if(id===35)return 'لم تثبت واجهة عاملة؛ رابط التوثيق يعيد 404';
 if(publisherIntegrations.some(p=>p.id===id))return 'موصل مضاف؛ راجع نتيجة الفحص المباشر';
 return 'لا توجد API عامة متحققة في الكتالوج';
}
