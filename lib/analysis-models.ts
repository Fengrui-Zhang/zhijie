export const DEEPSEEK_FLASH_MODEL = 'deepseek-v4-flash' as const;
export const DEEPSEEK_PRO_MODEL = 'deepseek-v4-pro' as const;

export type AnalysisModel = typeof DEEPSEEK_FLASH_MODEL;

export type ChatModel = AnalysisModel | typeof DEEPSEEK_PRO_MODEL;

export const DEFAULT_ANALYSIS_MODEL: AnalysisModel = DEEPSEEK_FLASH_MODEL;
export const DEFAULT_REASONING_MODEL = DEEPSEEK_PRO_MODEL;

export const isAnalysisModel = (value: unknown): value is AnalysisModel =>
  value === DEEPSEEK_FLASH_MODEL;

export const isChatModel = (value: unknown): value is ChatModel =>
  value === DEEPSEEK_FLASH_MODEL ||
  value === DEEPSEEK_PRO_MODEL;

export const resolveChatModel = (value: unknown): ChatModel => {
  if (value === DEEPSEEK_PRO_MODEL) {
    return DEEPSEEK_PRO_MODEL;
  }
  return DEEPSEEK_FLASH_MODEL;
};
