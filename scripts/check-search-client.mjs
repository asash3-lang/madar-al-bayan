import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild');
const bundled=await build({stdin:{contents:"export {requestSearch} from './lib/search-client';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {requestSearch}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const errorMessage='تعذر إكمال البحث. حاول مجددًا.';
const source={id:'4563',title:'Published title',hadith:'Published text',explanation:'',grade:'Authentic',attribution:'Publisher attribution',references:['Publisher reference'],canonicalUrl:'https://hadeethenc.com/en/browse/hadith/4563',apiUrl:'https://hadeethenc.com/api/v1/hadeeths/one/?language=en&id=4563',publisher:'HadeethEnc.com',language:'en',retrievedAt:'2026-10-04T00:00:00Z',contentVersion:null,accessMode:'snapshot'};
const payload=(extra={})=>({question:'What is Islam?',language:'en',status:'found',message:'',evidence:[{source,excerpt:source.hadith,kind:'hadith'}],dataMode:'snapshot',durationMs:5,generationEnabled:false,analysis:{topic:'islam-definition',stance:'question',level:'B',reason:'Exact source lookup',method:'pilot-rules'},answer:[],generationStatus:'disabled',generatedBy:null,...extra});
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS',name);}
function fetchSequence(outcomes){const calls=[];const fetch=async(url,init)=>{calls.push({url,init});const outcome=outcomes[calls.length-1];assert.notEqual(outcome,undefined,'unexpected additional attempt');if(outcome instanceof Error)throw outcome;return typeof outcome==='function'?outcome(init):outcome;};return {calls,fetch};}
async function rejectSafely(fetch,options={}){await assert.rejects(requestSearch('What is Islam?','en',errorMessage,{fetch,...options}),e=>e instanceof Error&&e.message===errorMessage&&!e.message.includes('<'));}

await test('Valid publisher content passes unchanged and only the fixed read-only endpoint is called',async()=>{
 const expected=payload(),f=fetchSequence([Response.json(expected)]),actual=await requestSearch('  What is Islam?  ','en',errorMessage,{fetch:f.fetch});
 assert.deepEqual(actual,expected);assert.equal(f.calls.length,1);const call=f.calls[0];assert.equal(call.url,'/api/ask');assert.equal(call.init.method,'POST');assert.equal(call.init.redirect,'manual');assert.equal(call.init.credentials,'same-origin');assert.deepEqual(JSON.parse(call.init.body),{question:'What is Islam?',language:'en'});
});
await test('A transient network failure gets exactly one identical retry',async()=>{
 const f=fetchSequence([new TypeError('Network disconnected'),Response.json(payload())]);await requestSearch('What is Islam?','en',errorMessage,{fetch:f.fetch});assert.equal(f.calls.length,2);assert.equal(f.calls[0].init.body,f.calls[1].init.body);assert.equal(f.calls[0].init.signal,f.calls[1].init.signal);
});
await test('Each transient gateway status retries once',async()=>{
 for(const status of [502,503,504]){const f=fetchSequence([new Response('<html>gateway failure</html>',{status}),Response.json(payload())]);await requestSearch('What is Islam?','en',errorMessage,{fetch:f.fetch});assert.equal(f.calls.length,2);}
});
await test('Successful non-JSON and malformed JSON responses retry once without exposing their body',async()=>{
 for(const first of [new Response('<html>upstream fallback</html>',{headers:{'Content-Type':'text/html'}}),new Response('<html>invalid JSON</html>',{headers:{'Content-Type':'application/json'}})]){const f=fetchSequence([first,Response.json(payload())]);await requestSearch('What is Islam?','en',errorMessage,{fetch:f.fetch});assert.equal(f.calls.length,2);}
});
await test('Repeated transient failure stops after two attempts and exposes only the localized message',async()=>{
 const f=fetchSequence([new Response('<html>first failure</html>',{status:502}),new Response('<html>second failure</html>',{status:503})]);await rejectSafely(f.fetch);assert.equal(f.calls.length,2);
});
await test('Authentication, authorization and rate limits never retry',async()=>{
 for(const status of [401,403,429]){const f=fetchSequence([new Response('<html>sensitive failure</html>',{status})]);await rejectSafely(f.fetch);assert.equal(f.calls.length,1);}
});
await test('Redirects and Cloudflare security challenges never retry',async()=>{
 const redirected=Response.json(payload());Object.defineProperty(redirected,'redirected',{value:true});
 const opaque=new Response();Object.defineProperty(opaque,'type',{value:'opaqueredirect'});
 for(const response of [redirected,opaque,Response.redirect('https://example.invalid/login',302),new Response('<html>challenge</html>',{headers:{'cf-mitigated':'challenge','Content-Type':'text/html'}})]){const f=fetchSequence([response]);await rejectSafely(f.fetch);assert.equal(f.calls.length,1);}
});
await test('Valid empty search and review outcomes never retry',async()=>{
 for(const status of ['insufficient','referral','clarify']){const expected=payload({status,evidence:[],contextMode:'context-unavailable'}),f=fetchSequence([Response.json(expected)]);assert.deepEqual(await requestSearch(expected.question,'en',errorMessage,{fetch:f.fetch}),expected);assert.equal(f.calls.length,1);}
});
await test('A stale response for another question is rejected without retry',async()=>{
 const f=fetchSequence([Response.json(payload({question:'A previous question'}))]);await rejectSafely(f.fetch);assert.equal(f.calls.length,1);
});
await test('Malformed nested payloads are rejected before reaching the UI',async()=>{
 for(const bad of [payload({evidence:{}}),payload({answer:[{}]}),payload({evidence:[{source:{},excerpt:'text',kind:'hadith'}]}),payload({analysis:null}),payload({suggestion:{text:32,language:'en'}})]){const f=fetchSequence([Response.json(bad)]);await rejectSafely(f.fetch);assert.equal(f.calls.length,1);}
});
await test('Language auto-detection may differ from the initial selector',async()=>{
 const expected=payload({question:'什么是伊斯兰教？',language:'zh',evidence:[]}),f=fetchSequence([Response.json(expected)]);const r=await requestSearch(expected.question,'en',errorMessage,{fetch:f.fetch});assert.equal(r.language,'zh');
});
await test('The total deadline covers body parsing and prevents further attempts',async()=>{
 let signal,calls=0;const fetch=async(_,init)=>{calls++;signal=init.signal;return {ok:true,status:200,type:'basic',redirected:false,headers:new Headers({'Content-Type':'application/json'}),json:()=>new Promise(()=>{})};};
 await rejectSafely(fetch,{timeoutMs:20});assert.equal(calls,1);assert.equal(signal.aborted,true);
});
await test('The second attempt shares the deadline instead of resetting it',async()=>{
 let calls=0,signal;const fetch=async(_,init)=>{calls++;signal=init.signal;if(calls===1)throw new TypeError('Transient network error');return new Promise(()=>{});};
 await rejectSafely(fetch,{timeoutMs:20});assert.equal(calls,2);assert.equal(signal.aborted,true);
});
console.log(`${passed} search client checks passed`);
