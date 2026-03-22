import type { MethodDefinition } from '../types.ts';

export const DEFAULT_EXPERIMENT_MODEL = 'deepseek-reasoner';
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_FLAT_TOP_K = 5;
export const DEFAULT_HIERARCHICAL_TOP_K = 5;
export const DEFAULT_MAX_CONTEXT_CHARS = 3500;
export const DEFAULT_EXPERIMENT_CONCURRENCY = 3;
export const EXPERIMENT_CACHE_VERSION = '2026-03-18-v1';

export const METHOD_DEFINITIONS: MethodDefinition[] = [
  {
    id: 'A',
    label: 'Baseline A：通用大模型直接问',
    retrievalMode: 'none',
    useChart: false,
    useStructuredPrompt: false,
  },
  {
    id: 'B',
    label: 'Baseline B：专业排盘 + 通用提问',
    retrievalMode: 'none',
    useChart: true,
    useStructuredPrompt: false,
  },
  {
    id: 'C',
    label: 'Method C：专业排盘 + 结构化提示词',
    retrievalMode: 'none',
    useChart: true,
    useStructuredPrompt: true,
  },
  {
    id: 'D',
    label: 'Method D：专业排盘 + 结构化提示词 + 普通切块检索',
    retrievalMode: 'flat',
    useChart: true,
    useStructuredPrompt: true,
  },
  {
    id: 'E',
    label: 'Method E：专业排盘 + 结构化提示词 + 层次化知识增强',
    retrievalMode: 'hierarchical',
    useChart: true,
    useStructuredPrompt: true,
  },
];
