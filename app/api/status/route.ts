import {modelSettings} from '@/lib/runtime-model';
import statistics from '@/lib/library-statistics.json';
import {sourceHealth} from '@/lib/source-health';
import {DEFAULT_CONTEXT_MODEL} from '@/lib/context-ranking';
export async function GET(){const s=modelSettings();return Response.json({generationConfigured:false,sourceCount:statistics.totalTextRecords,referenceCount:statistics.currentReferences,model:s.key?(s.model||DEFAULT_CONTEXT_MODEL):null,...await sourceHealth()},{headers:{'Cache-Control':'no-store'}});}
