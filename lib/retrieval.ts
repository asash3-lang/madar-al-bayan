import type { Evidence, SourceRecord } from './types';

export function normalize(text: string): string {
  return text.normalize('NFKC').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, '').replace(/ـ/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
}
const stop = new Set(['ما','هي','هو','هل','كيف','لماذا','ماذا','عن','في','من','ان','الي','علي','لي','لنا','انا','هذا','هذه','ذلك','اشرح','اشرحلي','وضح','عرف','معني','ماهو','ماهي','اكثر','تفصيل','باختصار','يارفيقي','ياصاحبي','the','what','is','are','of']);
function stem(token: string) {
  let value = token;
  if (/^[وفبكل]ال/.test(value) && value.length > 5) value = value.slice(1);
  if (value.startsWith('ال') && value.length > 4) value = value.slice(2);
  return value;
}
export function tokenize(text: string): string[] {
  return (normalize(text).match(/[\p{L}\p{N}]+/gu) ?? []).filter(x => !stop.has(x)).map(stem).filter(x => x.length > 1);
}
const expansion: Record<string, string[]> = {
  اسلام: ['اركان', 'الشهادتان'], اركان: ['اركان'], احسان: ['احسان', 'المراقبه'], ايمان: ['ايمان', 'الستة'], نيه: ['نيات', 'نوى'], نيات: ['نيه', 'نوى'], مقاصد: ['نيه', 'نيات'], اخلاص: ['نيه', 'نيات'], شهادتان: ['الشهادتين'], صلاه: ['صلاة', 'الصلوات'], ركايز: ['اركان'], ركائز: ['اركان'], اسس: ['اركان'], faith: ['ايمان'], intentions: ['نيات'], intention: ['نيات'], pillars: ['اركان', 'اسلام'], ihsan: ['احسان'], islam: ['اسلام'],
};
function queryTokens(question: string) {
  const base = tokenize(question);
  return [...new Set(base.flatMap(t => [t, ...(expansion[t] ?? []).flatMap(tokenize)]))];
}
export function classifyPilotQuestion(question: string): 'search' | 'referral' | 'clarify' | 'insufficient' {
  const q = normalize(question);
  if (/هل يجوز لي|هل (?:تصح|صحت|تجوز|يبطل)\s+(?:صلاتي|صيامي|عقدي|زواجي|طلاق)|هل صلاتي|هل زواجي|هل عقدي|طلقت زوجتي|طلاق زوجتي|عقد زواجي|افتي(?:ني|نا)|اصدر فتوي|فتوي (?:شخصيه|لحالتي)|هل انا كافر|هل فلان كافر|كفر فلان|زوجتي|زوجي|ميراثي|ورثت|حالتي|وضوئي|صيامي|قرضي|طبيبي/.test(q)) return 'referral';
  if (/اختلق|اخترع|الف (?:لي )?حديث|بدون (?:مصدر|دليل)|تجاهل (?:المراجع|التعليمات)|ignore (?:the )?(?:instructions|sources)/.test(q)) return 'insufficient';
  if (/^(?:لماذا|كيف|اشرح اكثر|وضح اكثر|هل هذا صحيح|ما معناه|ما معناها|ما الفرق بينهما)[\s؟?!.]*$/.test(q)) return 'clarify';
  if (!tokenize(question).length) return 'clarify';
  return 'search';
}

type Passage = { source: SourceRecord; text: string; kind: Evidence['kind']; tokens: string[] };
function passages(sources: SourceRecord[]): Passage[] {
  return sources.flatMap(source => {
    // Literal backslash-newline in the API is a paragraph separator, not a content edit.
    const paragraphs = source.explanation.replace(/\\n/g, '\n').split(/\n+/).map(p => p.trim()).filter(Boolean);
    return [{ source, text: source.hadith, kind: 'hadith' as const, tokens: tokenize(source.hadith) }, ...paragraphs.map(text => ({ source, text, kind: 'explanation' as const, tokens: tokenize(text) }))];
  });
}
export function retrieve(question: string, sources: SourceRecord[]): Evidence[] {
  const all = passages(sources);
  if (!all.length) return [];
  const q = queryTokens(question);
  const meaningful = tokenize(question);
  // This pilot handles definitions and stable introductory facts. "Why" needs a dedicated source.
  if (/\b(?:why)\b|لماذا|ليش|ليه/.test(normalize(question))) return [];
  const avgLength = all.reduce((sum, p) => sum + p.tokens.length, 0) / all.length;
  const frequency = new Map<string, number>();
  for (const p of all) for (const token of new Set(p.tokens)) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  const scored = all.map(p => {
    const counts = new Map<string, number>();
    for (const token of p.tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    let score = 0;
    for (const token of q) {
      const tf = counts.get(token) ?? 0;
      if (!tf) continue;
      const df = frequency.get(token) ?? 0;
      const idf = Math.log(1 + (all.length - df + 0.5) / (df + 0.5));
      score += idf * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * p.tokens.length / avgLength));
    }
    if (p.kind === 'explanation') score *= 1.12;
    const directMatches = meaningful.filter(token => p.tokens.includes(token)).length;
    return { p, score, directMatches };
  }).filter(x => x.score > 0 && (x.directMatches > 0 || meaningful.some(t => expansion[t]))).sort((a,b) => b.score-a.score);
  if (!scored.length) return [];
  // Coverage is a relevance gate for this small pilot, not a probability of truth.
  const known = new Set(all.flatMap(p => p.tokens));
  const unknown = meaningful.filter(t => !known.has(t) && !expansion[t] && !['عدد', 'تعريف', 'دين', 'توضيح', 'بسيط', 'ببساطه', 'خمسه', 'سته', 'الفرق', 'فرق'].includes(t));
  if (unknown.length > 0) return [];
  const selected: Evidence[] = [];
  // An explicit pillars question needs the complete five-pillar witness, not just a paragraph about one pillar.
  const pillarsQuestion = /(?:اركان|ركائز|اسس)\s+(?:دين\s+)?الاسلام/.test(normalize(question));
  if (pillarsQuestion) {
    const witness = sources.find(s => s.id === '65000');
    if (witness) selected.push({source:witness,excerpt:witness.hadith,kind:'hadith',score:scored[0].score});
  }
  const seen = new Set<string>();
  for (const item of selected) seen.add(normalize(item.excerpt));
  for (const {p,score} of scored) {
    const key = normalize(p.text);
    if (seen.has(key) || score < scored[0].score * 0.35) continue;
    seen.add(key);
    selected.push({ source: p.source, excerpt: p.text, kind: p.kind, score: Math.round(score*1000)/1000 });
    if (selected.length === 3) break;
  }
  return selected;
}
