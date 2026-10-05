import {env} from 'cloudflare:workers';
import {readPublisher,requireArray,PublisherError} from './publisher-http';
function settings(){const e=env as unknown as Record<string,string|undefined>;return {key:e.SIWAR_API_KEY,lexicons:e.SIWAR_LEXICON_IDS};}
export function siwarConfigured(){const s=settings();return !!s.key&&!!s.lexicons;}
export async function siwarLexicons(){const {key}=settings();if(!key)throw new PublisherError('missing-api-key');return requireArray(await readPublisher('https://siwar.ksaa.gov.sa/api/v1/external/public/lexicons',{headers:{apikey:key},ttl:3600000}));}
export async function siwarLookup(query:string){
 const {key,lexicons}=settings();if(!key)throw new PublisherError('missing-api-key');if(!lexicons)throw new PublisherError('missing-lexicon-ids');
 const allowed=new Set(lexicons.split(',').map(x=>x.trim()).filter(Boolean));
 const rows=requireArray(await readPublisher(`https://siwar.ksaa.gov.sa/api/v1/external/public/search?lexiconIds=${encodeURIComponent([...allowed].join(','))}&query=${encodeURIComponent(query)}`,{headers:{apikey:key}}));
 // Lexical definitions are kept separate from religious answers.
 return rows.filter(r=>allowed.has(String(r.lexiconId))).slice(0,10).map(r=>({id:r.lexicalEntryId,word:r.lemma,lexicon:r.lexiconName,senses:r.senses,publisher:'Siwar',source:'https://siwar.ksaa.gov.sa/'}));
}
