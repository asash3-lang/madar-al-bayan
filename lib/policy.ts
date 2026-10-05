import {normalize, classifyPilotQuestion} from './retrieval';
import type {QuestionAnalysis, ReviewDecision, SearchResponse} from './types';
export function analyzeQuestion(question: string): QuestionAnalysis {
  const q=normalize(question), policy=classifyPilotQuestion(question);
  const sensitive=/تكفير|الفرق (?:الاسلاميه|الدينيه)|طائفه|مذهب|الخلاف|الخلافه|قتال|حروب|مرتد|الجهاد/.test(q);
  const level=policy==='referral'?'D':sensitive?'C':/معني|اشرح|كيف|لماذا|ليش|ليه/.test(q)?'B':'A';
  const topic=/احسان/.test(q)?'الإحسان':/نيه|نيات|اخلاص/.test(q)?'النيات':/نصيحه/.test(q)?'النصيحة':/جار|ضيف|خيرا|اخلاق|لسان/.test(q)?'أخلاق التواصل':/ايمان/.test(q)?'الإيمان':/اسلام/.test(q)?'التعريف بالإسلام':'موضوع خارج المكتبة المحدودة';
  const stance=/^(?:هل|ما|ماذا|كيف|لماذا|لم|ليش)|[؟?]/.test(q)?'question':/(?:^|\s)(?:ليس|ليست|لا|لن|غير)(?:\s|$)/.test(q)?'negation':q.length>6?'affirmation':'unclear';
  return {topic, stance, level, method:'pilot-rules',reason:level==='D'?'حالة شخصية أو حكم على شخص؛ يلزم مختص.':level==='C'?'موضوع حساس خارج نطاق الإجابة المباشرة لهذه النسخة.':level==='B'?'شرح مفهوم عام يحتاج إسنادًا ومراجعة.':'تعريف أو معلومة أساسية ضمن نطاق التجربة.'};
}
export function canReview(response: SearchResponse, decision: ReviewDecision, note: string): string | null {
  if(decision!=='pending' && note.trim().length<10) return 'اكتب سبب القرار في عشرة أحرف على الأقل.';
  if(decision==='approved' && (response.status!=='found'||!response.evidence.length||['C','D'].includes(response.analysis.level))) return 'لا يمكن اعتماد حالة بلا دليل كافٍ أو تحتاج مختصًا. اختر الإحالة أو أبقها قيد المراجعة.';
  return null;
}
