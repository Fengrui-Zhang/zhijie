export const DEEPSEEK_PRO_MODEL = 'deepseek-v4-pro' as const;

export type AnalysisModel = typeof DEEPSEEK_PRO_MODEL;

export type ChatModel = AnalysisModel;

export const DEFAULT_ANALYSIS_MODEL: AnalysisModel = DEEPSEEK_PRO_MODEL;
export const DEFAULT_REASONING_MODEL = DEEPSEEK_PRO_MODEL;

export const isAnalysisModel = (value: unknown): value is AnalysisModel =>
  value === DEEPSEEK_PRO_MODEL;

export const isChatModel = (value: unknown): value is ChatModel =>
  value === DEEPSEEK_PRO_MODEL;

export const resolveChatModel = (value: unknown): ChatModel => {
  return DEEPSEEK_PRO_MODEL;
};
