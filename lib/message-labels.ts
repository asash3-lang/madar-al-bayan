export const messageLanguageNames:Record<string,string>={ar:'العربية',en:'الإنجليزية',fr:'الفرنسية',es:'الإسبانية',zh:'الصينية',hi:'الهندية',fa:'الفارسية',id:'الإندونيسية',ur:'الأردية'};
export const messageStatusNames:Record<string,string>={pending:'بانتظار الرد',received:'بانتظار الرد',draft:'مسودة',approved:'مسودة',sending:'جارٍ الإرسال',sent:'تم الإرسال',delivery_failed:'تعذر الإرسال',delivery_unknown:'تعذر تأكيد الإرسال'};
export function messageReference(number:number|undefined|null,id=''){return number?'MB-'+String(number).padStart(6,'0'):'MB-'+id.slice(0,8).toUpperCase();}
export function messageLanguage(language:string){return messageLanguageNames[language]??'غير محددة';}
