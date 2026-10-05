import {BookOpen} from 'lucide-react';
import {isRTL, type Language} from '@/lib/i18n';

export const islamQuestions: {language: Language; question: string}[] = [
 {language:'en',question:'What is Islam?'},
 {language:'ar',question:'ما هو الإسلام؟'},
 {language:'fr',question:'Qu’est-ce que l’islam ?'},
 {language:'es',question:'¿Qué es el islam?'},
 {language:'zh',question:'什么是伊斯兰教？'},
 {language:'hi',question:'इस्लाम क्या है?'},
 {language:'fa',question:'اسلام چیست؟'},
 {language:'id',question:'Apa itu Islam?'},
 {language:'ur',question:'اسلام کیا ہے؟'},
];

export function IslamLanguageLinks(){
 return <nav className="islam-language-links" aria-label="What is Islam? — Nine languages" dir="ltr">
  {islamQuestions.map(({language,question})=><a key={language} lang={language} dir={isRTL(language)?'rtl':'ltr'} href={`https://hadeethenc.com/${language}/browse/hadith/4563`} target="_top" rel="external"><BookOpen size={17} aria-hidden="true"/><span>{question}</span></a>)}
 </nav>;
}
