import {francAll} from 'franc';
import {isLanguage} from './i18n';
const iso:Record<string,string>={eng:'en',arb:'ar',urd:'ur',spa:'es',ind:'id',uig:'ug',ben:'bn',fra:'fr',tur:'tr',rus:'ru',bos:'bs',sin:'si',hin:'hi',cmn:'zh',pes:'fa',vie:'vi',tgl:'tl',ckb:'ku',hau:'ha',por:'pt',mal:'ml',tel:'te',swh:'sw',tam:'ta',mya:'my',tha:'th',deu:'de',jpn:'ja',pbt:'ps',asm:'as',als:'sq',swe:'sv',amh:'am',nld:'nl',guj:'gu',kir:'ky',npi:'ne',yor:'yo',lit:'lt',srp:'sr',som:'so',tgk:'tg',kin:'rw',ron:'ro',hun:'hu',ces:'cs',mos:'mos',plt:'mg',fuv:'ff',ita:'it',gaz:'om',kan:'kn',wol:'wo',bul:'bg',azj:'az',ell:'el',aka:'ak',uzn:'uz',ukr:'uk',kat:'ka',lin:'ln',mkd:'mk',khm:'km',bam:'bm',pan:'pa',mar:'mr',dan:'da',run:'rn',yao:'yao',kmr:'kmr',zsm:'ms'};
export function detectLanguage(question:string,selected:string){
 const q=question.normalize('NFKC').trim();
 let code:string|undefined;
 // Distinct scripts take precedence over statistical guesses on short queries.
 const scripts:[RegExp,string][]=[[/[\p{Script=Hiragana}\p{Script=Katakana}]/u,'ja'],[/\p{Script=Han}/u,'zh'],[/\p{Script=Tamil}/u,'ta'],[/\p{Script=Telugu}/u,'te'],[/\p{Script=Malayalam}/u,'ml'],[/\p{Script=Gujarati}/u,'gu'],[/\p{Script=Kannada}/u,'kn'],[/\p{Script=Gurmukhi}/u,'pa'],[/\p{Script=Sinhala}/u,'si'],[/\p{Script=Thai}/u,'th'],[/\p{Script=Myanmar}/u,'my'],[/\p{Script=Khmer}/u,'km'],[/\p{Script=Georgian}/u,'ka'],[/\p{Script=Greek}/u,'el'],[/\p{Script=Ethiopic}/u,'am']];
 code=scripts.find(([pattern])=>pattern.test(q))?.[1];
 if(!code&&/\p{Script=Arabic}/u.test(q)){
  if(/[ٹڈڑںھے]/u.test(q))code='ur';
  else if(q==='نماز'&&['ur','fa'].includes(selected))code=selected;
  else if(/[پچژگکی]/u.test(q)||/(?:چیست|چگونه|است|نماز|روزه)/u.test(q))code=selected==='prs'?'prs':'fa';
  else code=['ar','fa','ur','ps','ug','prs','ku'].includes(selected)?selected:'ar';
 }
 if(!code&&/\p{Script=Devanagari}/u.test(q))code=['ne','mr'].includes(selected)?selected:'hi';
 if(!code&&/\p{Script=Bengali}/u.test(q))code=selected==='as'?'as':'bn';
 if(!code){
  const words=q.toLowerCase().match(/[\p{L}]+/gu)??[];
  const clues:Record<string,string[]>={en:['what','why','how','does','meaning'],es:['qué','cuales','cuáles','cómo','como','significa','oración','reza','ayuno'],fr:['est','pourquoi','comment','signifie','prière','jeûne'],id:['apa','apakah','bagaimana','mengapa','cara','itu','dalam','shalat','sholat','puasa'],fa:['چیست'],pt:['oração','jejum','significado'],de:['was','warum','bedeutet','gebet']};
  const ranked=Object.entries(clues).map(([lang,terms])=>({lang,score:words.filter(w=>terms.includes(w)).length})).sort((a,b)=>b.score-a.score);
  if(ranked[0].score>0&&ranked[0].score>(ranked[1]?.score??0))code=ranked[0].lang;
 }
 if(!code&&q.replace(/[^\p{L}]/gu,'').length>=20){
  const guesses=francAll(q,{minLength:20,only:Object.keys(iso)});
  if(guesses[0]&&guesses[0][0]!=='und'&&(!guesses[1]||guesses[0][1]-guesses[1][1]>=0.08))code=iso[guesses[0][0]];
 }
 return {language:code&&isLanguage(code)?code:selected,detected:!!code&&isLanguage(code),ambiguous:!code};
}
