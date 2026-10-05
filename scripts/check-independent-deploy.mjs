/** Validate the public export's independent-host identity boundary using synthetic headers. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const {build}=createRequire(import.meta.resolve('wrangler/package.json'))('esbuild');
const result=await build({entryPoints:['build/sites-worker.ts'],bundle:true,platform:'node',format:'esm',write:false,define:{'import.meta.env.DEV':'false'},plugins:[{name:'independent-host-fixture',setup(b){
  b.onResolve({filter:/^vinext\/server\/fetch-handler$/},()=>({path:'handler',namespace:'fixture'}));
  b.onResolve({filter:/connector-context$/},()=>({path:'context',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='handler'?'export default {fetch(request){return Response.json(Object.fromEntries(request.headers));}}':'export const runWithConnectorBinding=(_binding,callback)=>callback();'}));
}}]});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))).default;
const response=await worker.fetch(new Request('https://independent.example/api/cases',{headers:{'oai-authenticated-user-id':'synthetic-id','oai-authenticated-user-email':'synthetic@example.invalid','oai-authenticated-user-full-name':'Synthetic user','oai-authenticated-user-full-name-encoding':'percent-encoded-utf-8',cookie:'__Host-madar-admin=synthetic-session','content-type':'application/json'}}),{},{});
const headers=await response.json();
assert.ok(!Object.keys(headers).some(k=>k.startsWith('oai-authenticated-')));
assert.equal(headers.cookie,'__Host-madar-admin=synthetic-session');
assert.equal(headers['content-type'],'application/json');
console.log('PASS independent deployment: spoofed hosting identity removed; standalone administrator cookie and ordinary headers preserved.');
