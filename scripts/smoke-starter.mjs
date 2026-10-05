/** Verify downloaded starter identities, language coverage and indexes. No AI calls. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const read = async name => JSON.parse(await fs.readFile(name, 'utf8'));
const manifest = await read('public/sources/starter-manifest.json');
assert.equal(manifest.scope, 'local-starter');
assert.deepEqual(manifest.failures, [], 'Refresh failed downloads before running starter smoke checks.');
const counts = await read('lib/library-statistics.json');
assert.equal(counts.scope, 'local-starter');
let hadithTotal = 0, quranTotal = 0;
for (const language of manifest.languages) {
  const index = await read(`public/sources/search/${language}.json`);
  assert.equal(index.language, language);
  for (const id of manifest.hadithIds) {
    const file = await read(`public/sources/hadith/${language}/${Math.floor(Number(id)/100)}.json`);
    const record = file.records[id];
    assert.equal(record.id, id); assert.equal(record.lang, language);
    assert.equal(record.hadith_text, record.hadeeth, 'Original publisher wording must remain unchanged.');
    assert.ok(record.hadith_text.trim()); assert.ok(index.documents.some(doc => doc.id === id)); hadithTotal++;
  }
  const verse = await read(`public/sources/quran/${language}/1.json`);
  assert.equal(verse.records['1:1'].sura, 1); assert.equal(verse.records['1:1'].aya, 1);
  assert.ok(verse.records['1:1'].translation.trim()); quranTotal++;
}
assert.equal(counts.totalHadithTexts, hadithTotal); assert.equal(counts.totalQuranVerses, quranTotal);
const { build } = createRequire(import.meta.resolve('wrangler/package.json'))('esbuild');
const bundle = await build({stdin:{contents:"export {rankSources} from './lib/source-search';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'worker-fixture',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'runtime',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const env={};'}));}}]});
const { rankSources } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
assert.ok(rankSources('What is Islam?', 'en').some(row=>row.id==='4563'));
console.log(`PASS starter: ${hadithTotal} unchanged Hadith records, ${quranTotal} verses, ${manifest.languages.length} language indexes and English retrieval.`);
