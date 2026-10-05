import {env} from 'cloudflare:workers';
export function modelSettings(){return {key:env.OPENAI_API_KEY,model:env.OPENAI_MODEL};}
