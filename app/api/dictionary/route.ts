import {siwarLookup} from '@/lib/siwar-source';
import {PublisherError} from '@/lib/publisher-http';
export async function GET(request:Request){const q=new URL(request.url).searchParams.get('q')?.trim();if(!q||q.length>100)return Response.json({error:'Invalid query'},{status:400});try{return Response.json({kind:'linguistic-definitions',items:await siwarLookup(q)});}catch(e){return Response.json({error:e instanceof PublisherError?e.reason:'publisher-unavailable'},{status:503});}}
