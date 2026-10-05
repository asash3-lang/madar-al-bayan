import extraLanguages from '@/lib/added-language-copy.json';
const labels:Record<string,{didYouMean:string;verse:string;arabic:string;notes:string}>={
 en:{didYouMean:'Did you mean',verse:'Translation of the verse’s meaning',arabic:'Arabic verse',notes:'Publisher notes'},
 ar:{didYouMean:'هل تقصد',verse:'الآية القرآنية',arabic:'الآية بالعربية',notes:'ملاحظات الناشر'},
 fr:{didYouMean:'Vouliez-vous dire',verse:'Traduction du sens du verset',arabic:'Verset en arabe',notes:'Notes de l’éditeur'},
 es:{didYouMean:'¿Quisiste decir',verse:'Traducción del significado de la aleya',arabic:'Aleya en árabe',notes:'Notas del editor'},
 zh:{didYouMean:'您是否想搜索',verse:'经文含义的翻译',arabic:'阿拉伯语经文',notes:'出版方注释'},
 hi:{didYouMean:'क्या आपका मतलब है',verse:'आयत के अर्थ का अनुवाद',arabic:'अरबी आयत',notes:'प्रकाशक की टिप्पणियाँ'},
};
labels.fa={didYouMean:'آیا منظورتان این بود',verse:'ترجمه معنای آیه',arabic:'متن عربی آیه',notes:'یادداشت ناشر'};
Object.assign(labels,extraLanguages.searchLabels);
export const searchLabels=new Proxy(labels,{get:(target,key:string)=>target[key]??target.en});
