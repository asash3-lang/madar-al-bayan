'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {SiteShell} from './site-shell';
import type {SiteSection} from './site-header';
import {isLanguage,isRTL} from '@/lib/i18n';

export function SiteFrame({children,activeSection}:{children:ReactNode;activeSection:SiteSection}){
 const [language,setLanguage]=useState('en');
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('lang');if(isLanguage(value))setLanguage(value);},[]);
 useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=isRTL(language)?'rtl':'ltr';},[language]);
 return <SiteShell language={language} onLanguageChange={setLanguage} activeSection={activeSection}>{children}</SiteShell>;
}
