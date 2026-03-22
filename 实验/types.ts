import type { BaziResponse } from '../types.ts';

export type ExperimentBoard = 'bazi';

export type ExperimentMethodId = 'A' | 'B' | 'C' | 'D' | 'E';

export type RetrievalMode = 'none' | 'flat' | 'hierarchical';

export interface BaziCaseParams {
  year: number;
  month: number;
  day: number;
  hours: number;
  minute: number;
  sex: number;
  name: string;
  province?: string;
  city?: string;
}

export interface ReferencePoint {
  id: string;
  label: string;
  keywords: string[];
  description?: string;
}

export interface CaseReference {
  summary: string;
  conclusion_points: ReferencePoint[];
  evidence_points: ReferencePoint[];
  source_notes: string[];
  raw_reference_text?: string;
}

export interface ExperimentCase {
  id: string;
  name: string;
  board: ExperimentBoard;
  params: BaziCaseParams;
  question: string;
  reference: CaseReference;
}

export interface RetrievedKnowledgeItem {
  id?: string;
  title?: string;
  text: string;
  source: string;
  score: number;
  level?: number;
  parentId?: string | null;
  groupId?: string;
  docId?: string;
}

export interface PromptBundle {
  system: string;
  user: string;
  retrievalMode: RetrievalMode;
  knowledgeQuery: string;
}

export interface MethodDefinition {
  id: ExperimentMethodId;
  label: string;
  retrievalMode: RetrievalMode;
  useChart: boolean;
  useStructuredPrompt: boolean;
}

export interface ExperimentMetrics {
  ctx_chars: number;
  retrieved_chunks: number;
  latency_ms: number;
  output_chars: number;
  conclusion_coverage: number;
  evidence_coverage: number;
}

export interface JudgeScores {
  专业性: number;
  判据充分性: number;
  结论一致性: number;
  结构完整性: number;
  知识匹配有效性: number;
  总分: number;
  评语: string;
}

export interface ExperimentRunResult {
  caseId: string;
  method: ExperimentMethodId;
  methodLabel: string;
  retrievalMode: RetrievalMode;
  prompt: PromptBundle;
  chartData: BaziResponse | null;
  contextText: string;
  retrievedKnowledge: RetrievedKnowledgeItem[];
  output: string;
  metrics: ExperimentMetrics;
  judge: JudgeScores | null;
  rawJudgeResponse?: string;
  error?: string;
}

export interface ExperimentCaseBundle {
  caseInfo: ExperimentCase;
  results: ExperimentRunResult[];
}

export interface MethodSummary {
  method: ExperimentMethodId;
  methodLabel: string;
  avg_ctx_chars: number;
  avg_retrieved_chunks: number;
  avg_latency_ms: number;
  avg_output_chars: number;
  avg_conclusion_coverage: number;
  avg_evidence_coverage: number;
  avg_judge_scores: JudgeScores | null;
}

export interface ExperimentSummary {
  generatedAt: string;
  caseCount: number;
  methods: MethodSummary[];
  cases: Array<{
    caseId: string;
    methodResults: Array<{
      method: ExperimentMethodId;
      metrics: ExperimentMetrics;
      judge: JudgeScores | null;
    }>;
  }>;
  dVsE: {
    avgCtxCharsDelta: number;
    avgRetrievedChunksDelta: number;
    avgKnowledgeMatchDelta: number;
  } | null;
}

export interface RunExperimentOptions {
  caseId?: string;
  methods?: ExperimentMethodId[];
  judge?: boolean;
  markdown?: boolean;
  outputDir?: string;
  concurrency?: number;
}
