'use client';
import {useEffect,useState} from 'react';
import type {Recitation as Recording} from '@/lib/publisher-adapters';
export function Recitation({surah,language}:{surah:number;language:string}){
 const [recording,setRecording]=useState<Recording|null>(null);
 useEffect(()=>{const controller=new AbortController();setRecording(null);fetch(`/api/recitations?surah=${surah}&language=${encodeURIComponent(language)}`,{signal:controller.signal}).then(r=>r.ok?r.json():null).then(value=>setRecording(value as Recording|null)).catch(()=>{});return ()=>controller.abort();},[surah,language]);
 if(!recording)return null;
 return <div className="publisher-recitation"><small dir="auto">{recording.reciter} · {recording.reading} · MP3Quran.net</small><audio controls preload="none" src={recording.url} aria-label={language==='ar'?'تلاوة السورة':'Surah recitation'} style={{width:'100%'}}/></div>;
}
