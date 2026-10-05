/**
 * Local-only publisher starter import. No publisher content ships in Git.
 * Run from the repository root: npm run setup; npm run sources:starter.
 * --empty generates the minimum empty, typed data files without network access.
 * Imports five Hadith records and Quran 1:1 in nine languages; not a full library.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const languages = ['ar', 'en', 'fr', 'es', 'zh', 'hi', 'fa', 'id', 'ur'];
const hadithIds = ['65000', '4563', '4560', '10901', '10951'];
const editions = { ar: 'english_rwwad', en: 'english_rwwad', fr: 'french_rashid', es: 'spanish_garcia', zh: 'chinese_suliman', hi: 'hindi_omari', fa: 'persian_ih', id: 'indonesian_sabiq', ur: 'urdu_junagarhi' };
const stamp = new Date().toISOString();
const files = new Map();
const failures = [];
const provenance = [];
const index = { publisher: 'HadeethEnc.com', retrievedAt: stamp, scope: 'local-starter', counts: Object.fromEntries(languages.map(l => [l, 0])), records: [] };
const stats = { languages: {}, totalHadithTexts: 0, totalExplanations: 0, totalQuranVerses: 0, verifiedAt: stamp, uniqueHadith: 0, uniqueVerses: 0, surahs: 0, publishedAnswers: 0, termCards: 0, icadbCards: 0, binbazAnswers: 0, currentReferences: 0, totalTextRecords: 0, scope: 'local-starter', description: 'Counts describe only this local starter import, never the hosted production library.' };
const put = (name, value) => files.set(name, JSON.stringify(value, null, 2) + '\n');
const exists = async name => fs.access(name).then(() => true, () => false);
for (const language of languages) {
  stats.languages[language] = { hadithTexts: 0, explanations: 0, quranVerses: 0 };
  put(`public/sources/search/${language}.json`, { version: 1, language, averageLength: 1, documents: [], terms: {} });
  put(`public/sources/quran/${language}/index.json`, { terms: {}, meta: { key: editions[language], title: '', description: '', version: '' }, count: 0, scope: 'local-starter', retrievedAt: stamp });
}
put('lib/hadith-index.json', index);
put('lib/reference-snapshot.json', []);
put('lib/library-statistics.json', stats);
async function writeFiles(onlyMissing = false) {
  for (const [name, value] of files) {
    if (onlyMissing && await exists(name)) continue;
    await fs.mkdir(path.dirname(name), { recursive: true });
    await fs.writeFile(name, value);
  }
  for (const language of languages) await fs.mkdir(`public/sources/hadith/${language}`, { recursive: true });
}
if (process.argv.includes('--empty')) {
  await writeFiles(true);
  console.log('Local source schemas ready. No network requests or publisher text imported.');
  process.exit(0);
}
if (!await exists('node_modules')) throw Error('Install dependencies first: pnpm install --frozen-lockfile');
if (await exists('public/sources/starter-manifest.json') && !process.argv.includes('--refresh')) {
  console.log('Starter corpus already exists. Use npm run sources:starter -- --refresh to refresh it.');
  process.exit(0);
}
const allowedHosts = new Set(['hadeethenc.com', 'quranenc.com']);
async function download(url) {
  if (!allowedHosts.has(new URL(url).hostname)) throw Error('Unapproved publisher URL');
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let text;
      if (process.env.HTTPS_PROXY || process.env.https_proxy) {
        // curl honors the explicitly configured system proxy on supported networks.
        const result = await execFileAsync('curl', ['--fail', '--silent', '--show-error', '--max-time', '25', '--proto', '=https', '-H', 'Accept: application/json', '-A', 'MadarAlBayan-StarterImport/1.0', url], {encoding:'utf8', maxBuffer:2000000, timeout:27000});
        text = result.stdout;
      } else {
        const response = await fetch(url, {headers:{Accept:'application/json','User-Agent':'MadarAlBayan-StarterImport/1.0'},redirect:'error',signal:AbortSignal.timeout(25000)});
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        if (Number(response.headers.get('content-length') || 0) > 2000000) throw Error('Publisher response exceeds limit');
        text = await response.text();
      }
      if (Buffer.byteLength(text) > 2000000) throw Error('Publisher response exceeds limit');
      const data = JSON.parse(text);
      provenance.push({ url, retrievedAt: stamp, sha256: createHash('sha256').update(text).digest('hex') });
      return data;
    } catch (error) { last = error; }
  }
  throw last;
}
const { build } = createRequire(import.meta.resolve('wrangler/package.json'))('esbuild');
const bundle = await build({ entryPoints: ['lib/retrieval-terms.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { tokens } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const catalog = await download('https://quranenc.com/api/v1/translations/list');
if (!Array.isArray(catalog.translations)) throw Error('Invalid QuranEnc catalog');
const snapshots = [];
const titles = new Map();
let nextLanguage = 0;
async function importLanguage(language) {
  const buckets = new Map();
  for (const id of hadithIds) {
    const url = `https://hadeethenc.com/api/v1/hadeeths/one/?language=${language}&id=${id}`;
    try {
      const raw = await download(url);
      if (String(raw.id) !== id || !raw.title?.trim() || !raw.hadeeth?.trim() || (language !== 'ar' && !raw.translations?.includes(language))) throw Error('Incomplete or mismatched publisher record');
      const row = { ...raw, id, lang: language, title: raw.title, hadith_text: raw.hadeeth, takhrij: raw.attribution, explanation: raw.explanation ?? '', grade: raw.grade ?? '' };
      const bucket = String(Math.floor(Number(id) / 100));
      if (!buckets.has(bucket)) buckets.set(bucket, {});
      buckets.get(bucket)[id] = row;
      const record = titles.get(id) ?? { id, titles: {}, translations: [] };
      record.titles[language] = raw.title; record.translations.push(language); titles.set(id, record);
      index.counts[language]++; stats.languages[language].hadithTexts++;
      if (raw.explanation?.trim()) stats.languages[language].explanations++;
      if (language === 'ar' && ['65000', '4563', '4560'].includes(id)) snapshots.push({ id, raw, retrievedAt: stamp });
    } catch (error) { failures.push({ publisher: 'HadeethEnc.com', language, id, reason: error.message }); }
  }
  for (const [bucket, records] of buckets) put(`public/sources/hadith/${language}/${bucket}.json`, {
    notice: 'HadeethEnc.com — original publisher wording; all publisher attribution fields retained in each record. Publisher content is not covered by the application source license.',
    version: 'api-starter-' + stamp, retrievedAt: stamp, records,
  });
  try {
    const meta = catalog.translations.find(item => item.key === editions[language]);
    if (!meta || (language !== 'ar' && meta.language_iso_code !== language)) throw Error('Missing matching translation edition');
    const raw = await download(`https://quranenc.com/api/v1/translation/aya/${meta.key}/1/1`);
    const row = raw.result;
    if (Number(row?.sura) !== 1 || Number(row?.aya) !== 1 || !row.arabic_text?.trim() || !row.translation?.trim()) throw Error('Invalid Quran verse identity');
    const record = { ...row, sura: 1, aya: 1, translation: language === 'ar' ? row.arabic_text : row.translation, footnotes: language === 'ar' ? '' : (row.footnotes ?? '') };
    const terms = Object.fromEntries([...new Set(tokens(record.translation))].map(t => [t, ['1:1']]));
    put(`public/sources/quran/${language}/1.json`, { meta, publisherResponse: raw, retrievedAt: stamp, records: { '1:1': record } });
    put(`public/sources/quran/${language}/index.json`, { terms, meta, retrievedAt: stamp, count: 1, scope: 'local-starter' });
    stats.languages[language].quranVerses = 1;
  } catch (error) { failures.push({ publisher: 'QuranEnc.com', language, id: '1:1', reason: error.message }); }
  console.log(`${language}: ${stats.languages[language].hadithTexts} Hadith records; ${stats.languages[language].quranVerses} Quran verse.`);
}
await Promise.all(Array.from({length:3}, async () => {
  while (nextLanguage < languages.length) await importLanguage(languages[nextLanguage++]);
}));
index.records = [...titles.values()].sort((a,b)=>Number(a.id)-Number(b.id)); stats.uniqueHadith = index.records.length;
for (const value of Object.values(stats.languages)) { stats.totalHadithTexts += value.hadithTexts; stats.totalExplanations += value.explanations; stats.totalQuranVerses += value.quranVerses; }
stats.uniqueVerses = stats.totalQuranVerses ? 1 : 0; stats.surahs = stats.uniqueVerses;
stats.currentReferences = Number(stats.totalHadithTexts > 0) + Number(stats.totalQuranVerses > 0);
stats.totalTextRecords = stats.totalHadithTexts + stats.totalQuranVerses;
put('lib/hadith-index.json', index); put('lib/reference-snapshot.json', snapshots); put('lib/library-statistics.json', stats);
put('public/sources/starter-manifest.json', { scope: 'local-starter', retrievedAt: stamp, hadithIds, verses: ['1:1'], languages, failures, provenance, stats });
// Write only after retrieval completes; refresh updates this deliberately bounded corpus.
await writeFiles();
const result = spawnSync(process.execPath, ['scripts/build-fulltext-index.mjs'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Imported ${stats.totalTextRecords} local starter text records. No full production corpus was imported.`);
if (failures.length) { console.error(`${failures.length} publisher requests failed. See public/sources/starter-manifest.json; run with --refresh to retry.`); process.exitCode = 1; }
