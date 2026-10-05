import rawSnapshot from './reference-snapshot.json';
const snapshot = rawSnapshot as {id:string;raw:unknown;retrievedAt:string}[];
import type { SourceRecord } from './types';

export const SOURCE_IDS = ['65000', '4563', '4560'] as const;
const ttlMs = 10 * 60 * 1000;
const memory = new Map<string, {record: SourceRecord; expires: number}>();
const inFlight = new Map<string, Promise<SourceRecord>>();
function stringValue(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing source field: ${name}`);
  return value;
}
function stringReferences(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}
export function parseSource(raw: unknown, id: string, accessMode: SourceRecord['accessMode'], retrievedAt: string): SourceRecord {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid source response');
  const obj = raw as Record<string, unknown>;
  if (String(obj.id) !== id) throw new Error('Source id mismatch');
  const references = stringReferences(obj.reference);
  if (!references.length) throw new Error('Missing original references');
  return { id, title: stringValue(obj.title, 'title'), hadith: stringValue(obj.hadeeth, 'hadeeth'), explanation: stringValue(obj.explanation, 'explanation').replace(/\\n/g, '\n'), grade: stringValue(obj.grade, 'grade'), attribution: stringValue(obj.attribution, 'attribution'), references,
    canonicalUrl: `https://hadeethenc.com/ar/browse/hadith/${id}`, apiUrl: `https://hadeethenc.com/api/v1/hadeeths/one/?language=ar&id=${id}`,
    publisher: 'HadeethEnc.com', language: 'ar', retrievedAt, contentVersion: null, accessMode };
}
export function snapshotSources(): SourceRecord[] {
  return snapshot.map(item => parseSource(item.raw, item.id, 'snapshot', item.retrievedAt));
}
async function loadSource(id: string): Promise<SourceRecord> {
  const cached = memory.get(id);
  if (cached && cached.expires > Date.now()) return cached.record;
  const existing = inFlight.get(id);
  if (existing) return existing;
  const operation = (async () => {
    try {
      const response = await fetch(`https://hadeethenc.com/api/v1/hadeeths/one/?language=ar&id=${id}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6500), redirect: 'manual' });
      if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
      const declaredLength = Number(response.headers.get('content-length') ?? 0);
      if (declaredLength > 200000) throw new Error('Source response too large');
      const text = await response.text();
      if (text.length > 200000) throw new Error('Source response too large');
      const record = parseSource(JSON.parse(text), id, 'live', new Date().toISOString());
      memory.set(id, { record, expires: Date.now() + ttlMs });
      return record;
    } catch {
      const item = snapshot.find(x => x.id === id);
      if (!item) throw new Error('No available reference');
      return parseSource(item.raw, id, 'snapshot', item.retrievedAt);
    }
  })();
  inFlight.set(id, operation);
  try { return await operation; } finally { inFlight.delete(id); }
}
export async function loadSources(): Promise<SourceRecord[]> {
  return Promise.all(SOURCE_IDS.map(loadSource));
}
