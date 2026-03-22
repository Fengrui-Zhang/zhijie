export const DEEPSEEK_REASONER_MODEL = 'deepseek-reasoner' as const;
export const DEEPSEEK_CHAT_MODEL = 'deepseek-chat' as const;
export const DOUBAO_SEED_LITE_MODEL = 'doubao-seed-2-0-lite-260215' as const;

export type AnalysisModel =
  | typeof DEEPSEEK_REASONER_MODEL
  | typeof DOUBAO_SEED_LITE_MODEL;

export type ChatModel = AnalysisModel | typeof DEEPSEEK_CHAT_MODEL;

export const DEFAULT_ANALYSIS_MODEL: AnalysisModel = DEEPSEEK_REASONER_MODEL;

export const ANALYSIS_MODEL_OPTIONS: Array<{
  value: AnalysisModel;
  label: string;
}> = [
  { value: DEEPSEEK_REASONER_MODEL, label: 'DeepSeek R1' },
  { value: DOUBAO_SEED_LITE_MODEL, label: '豆包 Lite' },
];

export const isAnalysisModel = (value: unknown): value is AnalysisModel =>
  value === DEEPSEEK_REASONER_MODEL || value === DOUBAO_SEED_LITE_MODEL;

export const isChatModel = (value: unknown): value is ChatModel =>
  value === DEEPSEEK_REASONER_MODEL ||
  value === DEEPSEEK_CHAT_MODEL ||
  value === DOUBAO_SEED_LITE_MODEL;
