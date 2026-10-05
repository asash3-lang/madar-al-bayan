'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {House,LibraryBig,Menu,MessageSquare,ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Sidebar,SidebarContent,SidebarFooter,SidebarHeader,SidebarMenu,SidebarMenuButton,SidebarMenuItem,SidebarProvider} from '@/components/ui/sidebar';
import {useIsMobile} from '@/hooks/use-mobile';
import {SiteHeader,type SiteSection} from './site-header';
import {siteInfo} from '@/lib/site-info';
import {isRTL} from '@/lib/i18n';

type Props={children:ReactNode;language:string;onLanguageChange:(value:string)=>void;onNavigate?:(section:SiteSection)=>void;activeSection:SiteSection;disabled?:boolean};
export function SiteShell({children,language,onLanguageChange,onNavigate,activeSection,disabled=false}:Props){
 const mobile=useIsMobile(),[preference,setPreference]=useState<boolean|null>(null),collapsed=preference??mobile;
 useEffect(()=>{try{const v=localStorage.getItem('madar-navigation');if(v==='compact')setPreference(true);if(v==='expanded')setPreference(false);}catch{}},[]);
 function toggle(){const value=!collapsed;setPreference(value);try{localStorage.setItem('madar-navigation',value?'compact':'expanded');}catch{}}
 const href=(section:SiteSection)=>`/?lang=${encodeURIComponent(language)}${section==='home'?'':'&view='+section}`;
 const items=[{id:'home',label:'Home',icon:House},{id:'catalog',label:'References',icon:LibraryBig},{id:'contact',label:'Contact us',icon:MessageSquare}] as const;
 const currentSection=activeSection==='search'?'home':activeSection;
 return <SidebarProvider open={!collapsed} onOpenChange={value=>setPreference(!value)} className="site-shell" data-nav-state={collapsed?'compact':'expanded'} data-nav-auto={preference===null?'true':'false'} dir="ltr">
  <a className="site-skip-link" href="#site-content">Skip to content</a>
  <Sidebar side="right" collapsible="none" className="permanent-navigation" dir="ltr" lang="en" aria-label="Main navigation">
   <SidebarHeader className="permanent-navigation-header"><a href={href('home')} className="navigation-brand" aria-label="Madar Al Bayan"><LibraryBig size={28}/><span>Madar<br/>Al Bayan</span></a><Button type="button" variant="ghost" size="icon" onClick={toggle} className="permanent-menu-toggle" aria-label={collapsed?'Expand navigation':'Collapse navigation'} aria-expanded={!collapsed} aria-controls="main-navigation-items" title={collapsed?'Expand navigation':'Collapse navigation'}><Menu size={22}/></Button></SidebarHeader>
   <SidebarContent><nav id="main-navigation-items" aria-label="Main navigation"><SidebarMenu>{items.map(item=><SidebarMenuItem key={item.id}><SidebarMenuButton asChild={!onNavigate} isActive={currentSection===item.id} className="permanent-nav-item" aria-label={item.label} title={collapsed?item.label:undefined} {...(onNavigate?{onClick:()=>onNavigate(item.id)}:{})}>
    {onNavigate?<><item.icon size={21}/><span>{item.label}</span></>:<a href={href(item.id)} aria-current={currentSection===item.id?'page':undefined}><item.icon size={21}/><span>{item.label}</span></a>}
   </SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></nav></SidebarContent>
   <SidebarFooter className="permanent-navigation-footer"><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild isActive={activeSection==='admin'} className="permanent-nav-item" title={collapsed?'Administration':undefined}><a href={'/admin?lang='+encodeURIComponent(language)} aria-label="Administration" aria-current={activeSection==='admin'?'page':undefined}><ShieldCheck size={21}/><span>Administration</span></a></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
  </Sidebar>
  <div className="simple-app site-page" lang={language} dir={isRTL(language)?'rtl':'ltr'}>
   <SiteHeader language={language} onLanguageChange={onLanguageChange} activeSection={activeSection} disabled={disabled}/>
   <div id="site-content" className="site-content" tabIndex={-1}>{children}</div>
   <footer className="site-footer" lang="en" dir="ltr"><div><p>© {new Date().getFullYear()} Madar Al Bayan. All rights reserved.</p><span>Reference materials belong to their respective publishers.</span></div><a href={siteInfo.contactEmail?'mailto:'+siteInfo.contactEmail:href('contact')} onClick={event=>{if(!siteInfo.contactEmail&&onNavigate){event.preventDefault();onNavigate('contact');}}}><MessageSquare size={15}/><span>{siteInfo.contactEmail||'Supervisory committee · Contact us'}</span></a></footer>
  </div>
 </SidebarProvider>;
}
