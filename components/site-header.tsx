'use client';
import {Globe,LibraryBig} from 'lucide-react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {copy,isRTL,languages} from '@/lib/i18n';
export type SiteSection='home'|'search'|'catalog'|'contact'|'admin';
export function SiteHeader({language,onLanguageChange,disabled=false}:{language:string;onLanguageChange:(value:string)=>void;activeSection?:SiteSection;disabled?:boolean}){
 const t=copy[language];
 return <header className="topbar multilingual-topbar fixed-navigation-topbar" dir="ltr" lang="en">
  <a className="brand" href={'/?lang='+encodeURIComponent(language)} aria-label={t.brand}><span className="brand-mark library-brand"><LibraryBig size={26} strokeWidth={1.65}/></span><span>Madar Al Bayan</span></a>
  <div className="language-picker" dir="ltr"><Select value={language} onValueChange={onLanguageChange} disabled={disabled} dir="ltr"><SelectTrigger className="language-button" aria-label={`Choose your language: ${languages.find(l=>l.code===language)?.name}`}><Globe size={17}/><span>Choose your language</span><span className="selected-language">{languages.find(l=>l.code===language)?.name}</span><span className="sr-only"><SelectValue/></span></SelectTrigger><SelectContent position="popper" align="end">{languages.map(l=><SelectItem key={l.code} value={l.code} className="language-option"><span lang={l.code} dir={isRTL(l.code)?'rtl':'ltr'}>{l.name}</span></SelectItem>)}</SelectContent></Select></div>
 </header>;
}
