/** Check tracked release boundaries. This is a targeted check, not a full security audit. */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
const files = execFileSync('git', ['ls-files', '-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
if (!files.length) throw new Error('No tracked release files to inspect.');
const denied = /(?:^public\/sources\/|^lib\/(?:hadith-index|reference-snapshot|library-statistics)\.json$|^(?:node_modules|dist|\.wrangler|\.sites-runtime)\/|(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$|\.(?:pem|key|db|sqlite|sqlite3)$)/;
const secret = /(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{24,}|re_[A-Za-z0-9]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;
const failures=[];
for (const file of files) {
  if (lstatSync(file).isSymbolicLink()) {failures.push(`${file}: symlink is not a self-contained release file`);continue;}
  if (denied.test(file) && file!=='.env.example') failures.push(`${file}: excluded runtime/content category`);
  if (/\.(png|jpg|jpeg|gif|ico|woff2?)$/i.test(file)) continue;
  const text=readFileSync(file,'utf8');
  if (secret.test(text)) failures.push(`${file}: credential-shaped value; inspect privately`);
  if (file.endsWith('.md')) {
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const link=match[1].split('#')[0];
      if (!link || /^(?:https?:\/\/|mailto:)/.test(link)) continue;
      if (!existsSync(path.resolve(path.dirname(file),link))) failures.push(`${file}: missing local link ${link}`);
    }
  }
}
const hosting=JSON.parse(readFileSync('.openai/hosting.json','utf8'));
if (hosting.project_id) failures.push('.openai/hosting.json: production project identity included');
if (failures.length) {console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS release boundaries: ${files.length} tracked files; no forbidden runtime/corpus categories, credential-pattern findings or missing documentation targets.`);
console.log('Scope: candidate tracked files and selected patterns only; not a complete security or license audit.');
