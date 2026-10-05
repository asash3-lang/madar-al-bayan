import stats from '@/lib/library-statistics.json';
export function LibraryOverview({onReferences}:{onReferences:()=>void}){
 const items=[{value:stats.totalHadithTexts,label:'Hadith texts & translations'},{value:stats.totalQuranVerses,label:'Verse texts & translations'},{value:stats.publishedAnswers,label:'Published answers'},{value:stats.termCards,label:'Islamic term cards'},{value:Object.keys(stats.languages).length,label:'Languages'},{value:stats.currentReferences,label:'References'}];
 return <section className="library-overview" aria-label="A library for your questions" lang="en" dir="ltr"><h2>{stats.scope==='local-starter'?'Local starter library':'A library for your questions'}</h2><div>{items.map(item=><div key={item.label}><strong><bdi>{item.value.toLocaleString('en-US')}</bdi></strong><span>{item.label}</span></div>)}</div><button type="button" onClick={onReferences}>Explore the references <span aria-hidden="true">↗</span></button></section>;
}
