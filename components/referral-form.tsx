'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import extraLanguages from '@/lib/added-language-copy.json';
import {referralCopy} from '@/lib/referral-copy';
export function ReferralForm({question,language,contextUnavailable=false}:{question:string;language:string;contextUnavailable?:boolean}){
 const unavailable:Record<string,string>={ar:'تعذر التحقق من مناسبة المصادر لسؤالك الآن. يمكنك إرسال السؤال للمراجعة.',en:'We cannot check source relevance right now. You can submit your question for review.',fr:'La vérification de la pertinence des sources est indisponible. Vous pouvez soumettre votre question pour examen.',es:'No podemos comprobar la pertinencia de las fuentes ahora. Puedes enviar tu pregunta para su revisión.',zh:'暂时无法核实资料与问题的相关性。您可以提交问题以供审核。',hi:'अभी प्रश्न से स्रोतों की प्रासंगिकता की जाँच उपलब्ध नहीं है। आप प्रश्न समीक्षा के लिए भेज सकते हैं।',fa:'اکنون بررسی ارتباط منابع با پرسش ممکن نیست. می‌توانید پرسش را برای بررسی ارسال کنید.'};
 Object.assign(unavailable,extraLanguages.referralContextUnavailable);
 const t=referralCopy(language),[email,setEmail]=useState(''),[consent,setConsent]=useState(false),[website,setWebsite]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(''),[error,setError]=useState('');
 async function submit(){if(busy)return;setBusy(true);setError('');try{const response=await fetch('/api/referrals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,language,email,consent,website})});const data=await response.json() as {id:string;reference:string};if(!response.ok)throw Error();setSaved(data.reference);setEmail('');}catch{setError(t.failed);}finally{setBusy(false);}}
 return <section className="referral-form">{!saved&&<p>{contextUnavailable?(unavailable[language]??unavailable.en):t.intro}</p>}{saved?<p role="status">{t.saved} <bdi>{saved}</bdi></p>:<form onSubmit={e=>{e.preventDefault();void submit();}}><label htmlFor="referral-email">{t.email}</label><Input id="referral-email" type="email" autoComplete="email" dir="ltr" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/><div hidden aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></div><label className="referral-consent"><Checkbox checked={consent} onCheckedChange={v=>setConsent(v===true)} disabled={busy}/><span>{t.consent}</span></label><Button disabled={!consent||busy} type="submit">{t.submit}{busy?'…':''}</Button>{error&&<p role="alert">{error}</p>}</form>}</section>;
}
