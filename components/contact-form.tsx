'use client';
import extraLanguages from '@/lib/added-language-copy.json';
import {useState} from 'react';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
export const contactLabels:Record<string,{title:string;contact:string;name:string;message:string;send:string;saved:string;error:string;note:string}>={
 en:{title:'Contact us',contact:'Email or phone number *',name:'Name (optional)',message:'Message (optional)',send:'Send',saved:'Your message has been saved for the site team.',error:'Check your contact details and try again.',note:'Your contact details will only be used to respond to your message.'},
 ar:{title:'تواصل مع القائمين على الموقع',contact:'البريد الإلكتروني أو رقم الجوال *',name:'الاسم (اختياري)',message:'الرسالة (اختياري)',send:'إرسال',saved:'تم حفظ رسالتك للقائمين على الموقع.',error:'تحقق من وسيلة التواصل وحاول مجددًا.',note:'تُستخدم بيانات التواصل للرد على رسالتك فقط.'},
 fr:{title:'Nous contacter',contact:'E-mail ou téléphone *',name:'Nom (facultatif)',message:'Message (facultatif)',send:'Envoyer',saved:'Votre message a été enregistré pour l’équipe du site.',error:'Vérifiez vos coordonnées et réessayez.',note:'Vos coordonnées serviront uniquement à répondre à votre message.'},
 es:{title:'Contáctanos',contact:'Correo electrónico o teléfono *',name:'Nombre (opcional)',message:'Mensaje (opcional)',send:'Enviar',saved:'Tu mensaje se ha guardado para el equipo del sitio.',error:'Comprueba tus datos e inténtalo de nuevo.',note:'Tus datos solo se utilizarán para responder a tu mensaje.'},
 zh:{title:'联系我们',contact:'电子邮箱或手机号码 *',name:'姓名（选填）',message:'留言（选填）',send:'发送',saved:'您的留言已保存，供网站团队查看。',error:'请检查联系方式并重试。',note:'您的联系方式仅用于回复您的留言。'},
 hi:{title:'हमसे संपर्क करें',contact:'ईमेल या मोबाइल नंबर *',name:'नाम (वैकल्पिक)',message:'संदेश (वैकल्पिक)',send:'भेजें',saved:'आपका संदेश वेबसाइट टीम के लिए सहेज लिया गया है।',error:'संपर्क विवरण जाँचें और फिर प्रयास करें।',note:'आपके संपर्क विवरण का उपयोग केवल आपके संदेश का उत्तर देने के लिए किया जाएगा।'},
 fa:{title:'تماس با مسئولان سایت',contact:'ایمیل یا شماره موبایل *',name:'نام (اختیاری)',message:'پیام (اختیاری)',send:'ارسال',saved:'پیام شما برای مسئولان سایت ذخیره شد.',error:'اطلاعات تماس را بررسی و دوباره تلاش کنید.',note:'اطلاعات تماس فقط برای پاسخ به پیام شما استفاده می‌شود.'},
};
Object.assign(contactLabels,extraLanguages.contactLabels);
export function ContactForm({language}:{language:string}){
 const t=contactLabels[language]??contactLabels.en,[contact,setContact]=useState(''),[name,setName]=useState(''),[message,setMessage]=useState(''),[website,setWebsite]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(''),[error,setError]=useState('');
 async function submit(){if(busy)return;setBusy(true);setError('');try{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact,name,message,website,language})});if(!r.ok)throw Error();const data=await r.json() as {reference:string};setSent(data.reference);setContact('');setMessage('');}catch{setError(t.error);}finally{setBusy(false);}}
 return <main className="contact-panel"><h1>{t.title}</h1>{sent?<p role="status">{t.saved} <bdi>{sent}</bdi></p>:<form className="contact-fields" onSubmit={e=>{e.preventDefault();void submit();}}><label htmlFor="contact-channel">{t.contact}</label><Input id="contact-channel" value={contact} onChange={e=>setContact(e.target.value)} required maxLength={254} dir="ltr" disabled={busy}/><label htmlFor="contact-name">{t.name}</label><Input id="contact-name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} dir="auto" disabled={busy}/><label htmlFor="contact-message">{t.message}</label><Textarea id="contact-message" value={message} onChange={e=>setMessage(e.target.value)} maxLength={4000} dir="auto" disabled={busy}/><input hidden tabIndex={-1} aria-hidden="true" value={website} onChange={e=>setWebsite(e.target.value)}/><p className="referral-note">{t.note}</p><Button disabled={busy||!contact.trim()}>{t.send}{busy?'…':''}</Button>{error&&<p role="alert">{error}</p>}</form>}</main>;
}
