'use client';
import {Recitation} from '@/components/recitation';
import {LibraryOverview} from '@/components/library-overview';
import {IslamLanguageLinks} from '@/components/islam-language-links';
import {SourceReferences} from '@/components/source-references';
import {SiteShell} from '@/components/site-shell';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Check,ExternalLink,FileText,LoaderCircle,Search,Sparkles,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {Sheet,SheetClose,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {CaseWorkspace} from '@/components/case-workspace';
import {ReferralForm} from '@/components/referral-form';
import {detectLanguage} from '@/lib/detect-language';
import {navigationLabels} from '@/lib/navigation-labels';
import {ContactForm} from '@/components/contact-form';
import {ResourceCatalog} from '@/components/resource-catalog';
import {copy as translations,isLanguage,isRTL,type Language} from '@/lib/i18n';
import {searchLabels} from '@/lib/search-labels';
import {requestSearch} from '@/lib/search-client';
import {sourceReferenceLink,sourceLinkDescription} from '@/lib/source-links';
import type {CaseRecord,SearchResponse,Evidence} from '@/lib/types';

export default function Home(){
 const [language,setLanguage]=useState<Language>('en');
 const t=translations[language],dir=isRTL(language)?'rtl':'ltr';
 const [question,setQuestion]=useState(''),[result,setResult]=useState<SearchResponse|null>(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState<Evidence|null>(null),[copied,setCopied]=useState(false);
 const [tab,setTab]=useState('search'),[savedCase,setSavedCase]=useState<CaseRecord|null>(null),[saving,setSaving]=useState(false);
 const active=useRef(false);
 useEffect(()=>{const params=new URLSearchParams(window.location.search),lang=params.get('lang'),view=params.get('view');if(isLanguage(lang))setLanguage(lang);if(view&&['search','catalog','contact'].includes(view))setTab(view);},[]);
 const inputLanguage=useMemo(()=>{const detected=detectLanguage(question,'en');return detected.detected?detected.language:language;},[question,language]);
 const inputSearchLabel=navigationLabels(inputLanguage).search;
 const selectedLink=selected?sourceReferenceLink(selected.source):null;
 useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=dir;},[language,dir]);
 function changeLanguage(value:string){if(!isLanguage(value)||active.current)return;setLanguage(value);setResult(null);setSelected(null);setError('');setCopied(false);setTab('search');}
 async function saveCase(){
  if(language!=='ar'||!result||saving||active.current)return;active.current=true;setSaving(true);setError('');
  try{const r=await fetch('/api/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:result.question})});const d=await r.json() as {case:CaseRecord};if(!r.ok)throw Error(t.error);setSavedCase(d.case);setResult(d.case.response);setTab('cases');}
  catch(e){setError(e instanceof Error?e.message:t.error);}finally{active.current=false;setSaving(false);}
 }
 const ask=useCallback(async(value:string)=>{
  const q=value.trim();if(q.length<1||q.length>1000)throw Error(t.invalid);if(active.current)throw Error(t.busy);
  active.current=true;setLoading(true);setError('');setQuestion(q);setSelected(null);setCopied(false);setResult(null);setTab('search');
  try{const d=await requestSearch(q,language,translations[inputLanguage].error);setResult(d);if(isLanguage(d.language))setLanguage(d.language);return {status:d.status,question:d.question,language:d.language,sources:d.evidence.map(e=>({id:e.source.id,url:sourceReferenceLink(e.source).url})),excerpts:d.evidence.map(e=>e.excerpt)};}
  finally{active.current=false;setLoading(false);}
 },[language,t,inputLanguage]);
 async function applySuggestion(){const corrected=result?.suggestion?.text.trim();if(!corrected||active.current)return;await submit(corrected);}
 async function submit(value=question){try{await ask(value);}catch(e){setError(e instanceof Error?e.message:t.error);}}
 useEffect(()=>{
  const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;if(!context?.registerTool)return;const life=new AbortController();
  try{void Promise.resolve(context.registerTool({name:'search_islamic_sources',title:t.ask,description:'Search the pilot source collection in the selected interface language. Does not generate religious rulings.',inputSchema:{type:'object',properties:{question:{type:'string',minLength:1,maxLength:1000}},required:['question'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||typeof(input as {question?:unknown}).question!=='string'||Object.keys(input).some(k=>k!=='question'))throw Error(t.invalid);return ask((input as {question:string}).question);}},{signal:life.signal})).catch(()=>{});}catch{}return()=>life.abort();
 },[ask,t]);
 async function copy(){if(!result)return;try{await navigator.clipboard.writeText(`${result.question}\n\n${result.evidence.map(e=>`${e.excerpt}\n${t.source}: ${sourceReferenceLink(e.source).url}`).join('\n\n')||result.message}`);setCopied(true);}catch{setError(t.error);}}

 return <SiteShell language={language} onLanguageChange={changeLanguage} disabled={loading||saving} activeSection={tab==='search'?(!result&&!question?'home':'search'):tab==='catalog'?'catalog':'contact'} onNavigate={section=>{setTab(section==='home'?'search':section);if(section==='home'&&!active.current){setQuestion('');setResult(null);setSelected(null);setError('');}}}>
  {tab!=='search'&&<div className="back-to-search"><Button variant="ghost" onClick={()=>setTab('search')}><Search size={16}/>{t.back}</Button></div>}
  {tab==='search'&&<main className={`workspace simple-workspace ${result||loading?'has-result':''}`}><section className="conversation" aria-label={t.ask}>
   <h1 className="sr-only">{t.ask}</h1>
   <p className="search-language-hint" lang="en" dir="ltr">You can ask a question in any language listed in the menu.</p>
   <form className="composer" onSubmit={e=>{e.preventDefault();void submit();}}><label htmlFor="question" className="sr-only">{t.placeholder}</label><Textarea id="question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} rows={3} placeholder={t.placeholder} className="question-input" dir="auto" disabled={loading||saving} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void submit();}}}/><div className="composer-bottom"><Button type="submit" className="search-button" lang={inputLanguage} dir={isRTL(inputLanguage)?'rtl':'ltr'} aria-busy={loading} disabled={loading||saving||question.trim().length<1}>{loading?<LoaderCircle className="animate-spin"/>:<Search/>}{inputSearchLabel}</Button></div></form>
   {!result&&!loading&&<IslamLanguageLinks/>}{error&&<p className="error-message" role="alert">{error}</p>}
   {!result&&!loading&&<LibraryOverview onReferences={()=>setTab('catalog')}/>}
   <section className="results" aria-live="polite" aria-busy={loading}>{loading?<div className="loading-state"><h2 dir="auto" className="pending-question">{question}</h2><span className="sr-only">{t.searching}</span><Skeleton className="h-5 w-3/4"/><Skeleton className="h-5 w-full"/><Skeleton className="h-5 w-5/6"/></div>:result?<>
    {result.suggestion&&<div className="search-suggestion"><span>{searchLabels[isLanguage(result.suggestion.language)?result.suggestion.language:language].didYouMean}</span> <Button type="button" variant="link" disabled={loading||saving} onClick={()=>void applySuggestion()}><bdi>{result.suggestion.text}</bdi>?</Button></div>}<div className="result-heading"><h2 dir="auto">{result.question}</h2></div>{result.status!=='found'&&<ReferralForm contextUnavailable={result.contextMode==='context-unavailable'} key={result.question+language} question={result.question} language={language}/>}
    {!!result.answer.length&&<section className="answer-box"><h3><Sparkles size={17}/>{t.draft}</h3><p className="draft-note">{t.draftNote}</p>{result.answer.map((a,i)=><div key={i}><p>{a.text}</p><div className="claim-citations">{a.evidenceIds.map(id=><Button variant="outline" size="sm" key={id} onClick={()=>setSelected(result.evidence.find(e=>e.source.id===id)||null)}>{t.source} <bdi>{id}</bdi></Button>)}</div></div>)}</section>}
    {result.evidence.map((e,i)=><article className="evidence-card" key={`${e.source.id}-${i}`} lang={e.source.language} dir={isRTL(e.source.language)?'rtl':'ltr'}><div className="evidence-label"><span><FileText size={15}/>{e.source.publisher}</span><span>{String(i+1).padStart(2,'0')}</span></div><blockquote>{e.excerpt}</blockquote><div className="evidence-footer"><div><strong>{e.source.title}</strong><span>{e.source.grade} · {e.source.attribution}</span></div><Button variant="ghost" className="source-button" onClick={()=>setSelected(e)}>{t.openSource}<BookOpen size={16}/></Button></div></article>)}
    <div className="result-foot"><span>{result.evidence.length>0&&(result.dataMode==='live'?t.live:result.dataMode==='mixed'?t.mixed:t.snapshot)}</span><Button variant="ghost" onClick={()=>void copy()}>{copied&&<Check size={15}/>} {copied?t.copied:t.copy}</Button></div>
   </>:null}</section>
  </section></main>}
  {tab==='contact'&&<ContactForm language={language}/>}
  {tab==='cases'&&<div dir="rtl" lang="ar"><CaseWorkspace initialCase={savedCase}/></div>}{tab==='catalog'&&<div dir="rtl" lang="ar"><ResourceCatalog/></div>}
  <Sheet open={!!selected} onOpenChange={open=>{if(!open)setSelected(null);}}><SheetContent side={language==='ar'?'left':'right'} showCloseButton={false} className="source-sheet" dir={dir} lang={language}><SheetHeader><div className="sheet-top"><Badge variant="outline">{t.source}</Badge><SheetClose asChild><Button variant="ghost" size="icon" aria-label={t.close}><X/></Button></SheetClose></div><SheetTitle>{selected?.source.title}</SheetTitle><SheetDescription><bdi dir="auto">{selected?.source.publisher}</bdi></SheetDescription></SheetHeader>{selected&&<div className="sheet-body"><div className="grade-line">{selected.source.grade} · {selected.source.attribution}</div><h3>{selected.source.sourceType==='quran'?searchLabels[language].verse:selected.source.sourceType==='text'||selected.source.sourceType==='tafsir'?t.source:t.hadith}</h3><blockquote className="full-hadith">{selected.source.hadith}</blockquote>{selected.source.sourceType==='quran'&&selected.source.verse&&<Recitation surah={selected.source.verse.sura} language={language}/>}{selected.source.originalArabic&&language!=='ar'&&<><h3>{searchLabels[language].arabic}</h3><blockquote dir="rtl" lang="ar">{selected.source.originalArabic}</blockquote></>}<h3>{selected.source.sourceType==='quran'?searchLabels[language].notes:t.explanation}</h3><p className="full-explanation">{selected.source.explanation}</p><SourceReferences source={selected.source} language={language}/><div className="provenance"><span>{selected.source.accessMode==='live'?t.live:t.snapshot}</span><span>{t.retrieved}: <bdi>{selected.source.retrievedAt.slice(0,10)}</bdi></span></div><p className="source-link-note">{selectedLink&&sourceLinkDescription(selectedLink.kind,language)}</p>{selectedLink?.url&&<Button asChild className="original-link"><a href={selectedLink.url} target="_top" rel="external">{t.openSource}<ExternalLink size={16}/></a></Button>}</div>}</SheetContent></Sheet>
 </SiteShell>;
}
