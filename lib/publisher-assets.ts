import {env} from 'cloudflare:workers';
export async function publisherAsset(path:string):Promise<any>{
 if(!/^\/(?:sources)\/[a-zA-Z0-9_./-]+\.json$/.test(path)||path.includes('..'))throw Error('Invalid publisher asset');
 if(!env.ASSETS)throw Error('Publisher assets binding unavailable');
 const response=await env.ASSETS.fetch(new Request('https://publisher-assets.internal'+path));
 if(!response.ok)throw Error('Publisher snapshot unavailable');return response.json();
}
export async function hadithSnapshot(id:string,language:string){
 const data=await publisherAsset(`/sources/hadith/${language}/${Math.floor(Number(id)/100)}.json`);
 const raw=data.records[id];if(!raw||String(raw.id)!==id)throw Error('Snapshot identity mismatch');
 return {raw,notice:data.notice,version:data.version,retrievedAt:data.retrievedAt};
}
