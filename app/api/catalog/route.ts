import { snapshotSources } from '@/lib/sources';
import {sourceIndexInfo} from '@/lib/source-search';
import publisherLanguages from '@/lib/publisher-languages.json';
import statistics from '@/lib/library-statistics.json';
import {currentReferences} from '@/lib/reference-directory';
export function GET() {
  const sources = snapshotSources().map(({id,title,canonicalUrl,grade,attribution}) => ({id,title,canonicalUrl,grade,attribution}));
  return Response.json({sources,corpus:'approved-publisher-collection',index:sourceIndexInfo,statistics,connectedPublishers:currentReferences.map(r=>new URL(r.url).hostname),hadithLanguages:publisherLanguages,currentReferences:currentReferences.map(r=>({id:r.id,name:r.name,url:r.url,scope:r.material})),quran:{verses:statistics.uniqueVerses,languages:Object.keys(statistics.languages),mode:'official-publisher-snapshot'},snapshotDate:statistics.verifiedAt}, {headers:{'Cache-Control':'public, max-age=300'}});
}
