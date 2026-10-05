export type SourceRecord = {
  sourceType?: 'hadith'|'quran'|'tafsir'|'text'; publisherNotice?:string; originalArabic?:string;
  verse?:{sura:number;aya:number};
  id: string; title: string; hadith: string; explanation: string;
  grade: string; attribution: string; references: string[];
  canonicalUrl: string; apiUrl: string; publisher: string; language: string;
  retrievedAt: string; contentVersion: string | null; accessMode: 'live' | 'snapshot';
};
export type Evidence = { source: SourceRecord; excerpt: string; kind: 'explanation' | 'hadith'; score: number };
export type SearchResponse = {
  contextMode?:string;
  queryUnderstanding?:'astra'|'unavailable';
  suggestion?: {text:string;language:string};
  language?: string;
  question: string; status: 'found' | 'insufficient' | 'referral' | 'clarify';
  message: string; evidence: Evidence[]; dataMode: 'live' | 'snapshot' | 'mixed';
  durationMs: number; generationEnabled: boolean;
  analysis: QuestionAnalysis; answer: AnswerClaim[];
  generationStatus: 'disabled' | 'generated' | 'unavailable' | 'not-applicable';
  generatedBy: string | null;
};
export type QuestionAnalysis = {
  topic: string; stance: 'question' | 'affirmation' | 'negation' | 'unclear';
  level: 'A' | 'B' | 'C' | 'D'; reason: string; method: 'pilot-rules' | 'model';
};
export type AnswerClaim = { text: string; evidenceIds: string[] };
export type ReviewDecision = 'pending' | 'approved' | 'referral' | 'rejected';
export type CaseRecord = {
  id: string; question: string; topic: string; level: QuestionAnalysis['level'];
  response: SearchResponse; decision: ReviewDecision; note: string; revision: number;
  createdAt: string; updatedAt: string;
};
export type ReviewEvent = {
  id: string; caseId: string; fromDecision: ReviewDecision | null; toDecision: ReviewDecision;
  note: string; actor: string; createdAt: string;
};
