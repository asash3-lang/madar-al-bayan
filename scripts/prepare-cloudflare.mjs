/** Prepare an independent deployment configuration. Does not publish or create resources. */
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
const {values}=parseArgs({args:process.argv.slice(2).filter(v=>v!=='--'),options:{'database-id':{type:'string'},'database-name':{type:'string',default:'madar-al-bayan'},'worker-name':{type:'string',default:'madar-al-bayan'}},strict:true});
if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(values['database-id']??'') || values['database-id']==='00000000-0000-4000-8000-000000000000') throw Error('Supply the real ID returned for your own D1 database.');
for(const k of ['database-name','worker-name']) if(!/^[a-z][a-z0-9-]{0,62}$/.test(values[k])) throw Error(`Invalid ${k}`);
const config=JSON.parse(await readFile('dist/server/wrangler.json','utf8'));
config.name=values['worker-name'];delete config.topLevelName;
config.d1_databases=[{binding:'DB',database_name:values['database-name'],database_id:values['database-id'],migrations_dir:'../../drizzle'}];
config.assets={...config.assets,binding:'ASSETS'};
config.vars={};
await writeFile('dist/server/wrangler.production.json',JSON.stringify(config,null,2)+'\n');
console.log('Prepared dist/server/wrangler.production.json for your independent Worker. No resources were created and nothing was deployed.');
