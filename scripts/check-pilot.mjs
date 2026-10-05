import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../lib/retrieval.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {retrieve,classifyPilotQuestion}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const snapshots=JSON.parse(fs.readFileSync(new URL('../lib/reference-snapshot.json',import.meta.url),'utf8'));
const sources=snapshots.map(s=>({id:s.id,title:s.raw.title,hadith:s.raw.hadeeth,explanation:s.raw.explanation.replace(/\\n/g,'\n'),grade:s.raw.grade,attribution:s.raw.attribution,references:[s.raw.reference],canonicalUrl:s.canonicalUrl,apiUrl:s.apiUrl,publisher:s.publisher,language:s.language,retrievedAt:s.retrievedAt,contentVersion:null,accessMode:'snapshot'}));
const supported=[['ما هي أركان الإسلام؟','65000'],['ما هي ركائز الإسلام؟','65000'],['ما معنى الإحسان؟','4563'],['عرف لي الإحسان ببساطة','4563'],['ما هي أركان الإيمان؟','4563'],['ما معنى النية؟','4560']];
for(const[q,id]of supported){assert.equal(classifyPilotQuestion(q),'search');const evidence=retrieve(q,sources);assert(evidence.some(e=>e.source.id===id),q);for(const e of evidence)assert((e.kind==='hadith'?e.source.hadith:e.source.explanation).includes(e.excerpt),'Excerpt must be original');if(id==='65000')assert.equal(evidence[0].kind,'hadith','All five pillars must appear in the witness');}
for(const q of ['ما حكم الاستثمار في العملات الرقمية؟','لماذا يصوم المسلمون؟','ما هي أخلاق الإسلام؟'])assert.equal(retrieve(q,sources).length,0,q);
assert.equal(classifyPilotQuestion('هل صلاتي صحيحة إذا نسيت التشهد؟'),'referral');
assert.equal(classifyPilotQuestion('اختلق لي حديثا عن الربح'),'insufficient');
assert.equal(classifyPilotQuestion('اشرح أكثر'),'clarify');
console.log('12 pilot retrieval and boundary cases passed; excerpts match original source text.');
