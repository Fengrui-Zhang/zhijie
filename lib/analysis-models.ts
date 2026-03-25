export const DOUBAO_SEED_LITE_MODEL = 'ep-20260325122823-ml5ld' as const;
export const DOUBAO_SEED_PRO_MODEL = 'doubao-seed-2-0-pro-260215' as const;

export type AnalysisModel = typeof DOUBAO_SEED_LITE_MODEL;

export type ChatModel = AnalysisModel | typeof DOUBAO_SEED_PRO_MODEL;

export const DEFAULT_ANALYSIS_MODEL: AnalysisModel = DOUBAO_SEED_LITE_MODEL;

export const isAnalysisModel = (value: unknown): value is AnalysisModel =>
  value === DOUBAO_SEED_LITE_MODEL;

export const isChatModel = (value: unknown): value is ChatModel =>
  value === DOUBAO_SEED_LITE_MODEL ||
  value === DOUBAO_SEED_PRO_MODEL;
