import {
  DEFAULT_ANALYSIS_MODEL,
  isAnalysisModel,
} from './analysis-models';
import {
  type InitialAnalysisData,
  normalizeInitialAnalysisData,
} from './divination-cases';

const THINKING_START = '[[THINKING]]';
const THINKING_END = '[[/THINKING]]';
const DISCLAIMER_TEXT = 'AI 命理分析仅供娱乐，请大家切勿过分当真。命运掌握在自己手中，要相信科学，理性看待。';

type StoredMessageLike = {
  role: string;
  content: string;
  createdAt?: string | Date | null;
  timestamp?: string | Date | null;
};

const parseModelContent = (content: string) => {
  const start = content.indexOf(THINKING_START);
  const end = content.indexOf(THINKING_END);
  if (start !== -1 && end !== -1 && end > start) {
    const reasoning = content.slice(start + THINKING_START.length, end).trim();
    const answer = content.slice(end + THINKING_END.length).trim();
    return { reasoning, answer };
  }
  return { reasoning: '', answer: content };
};

const stripDisclaimer = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.endsWith(DISCLAIMER_TEXT)) {
    return trimmed.slice(0, -DISCLAIMER_TEXT.length).trim();
  }
  return trimmed;
};

const extractQuestionFromMessages = (messages: StoredMessageLike[]) => {
  const firstUserMessage = messages.find((msg) => msg.role === 'user');
  if (!firstUserMessage) return '';

  const questionLine = firstUserMessage.content.match(/(?:^|\n)问题:\s*(.+)$/m);
  if (questionLine?.[1]) {
    return questionLine[1].trim();
  }

  if (firstUserMessage.content.startsWith('问题:')) {
    return firstUserMessage.content.replace(/^问题:\s*/, '').trim();
  }

  return '';
};

const resolveGeneratedAt = (
  message: StoredMessageLike | undefined,
  fallback: string | Date
) => {
  const candidate = message?.createdAt ?? message?.timestamp ?? fallback;
  if (candidate instanceof Date) {
    return candidate.toISOString();
  }
  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate;
  }
  return new Date(fallback).toISOString();
};

export const deriveInitialAnalysisFromSession = (
  chartParams: unknown,
  messages: StoredMessageLike[],
  fallbackUpdatedAt: string | Date
): InitialAnalysisData | null => {
  const params = chartParams && typeof chartParams === 'object'
    ? (chartParams as Record<string, unknown>)
    : {};

  const snapshot = normalizeInitialAnalysisData({
    content: params.baseAnalysisContent,
    model: params.baseAnalysisModel,
    generatedAt: params.baseAnalysisGeneratedAt,
  });
  if (snapshot) return snapshot;

  const storedQuestion = typeof params.question === 'string' ? params.question.trim() : '';
  const inferredQuestion = extractQuestionFromMessages(messages);
  if (storedQuestion || inferredQuestion) return null;

  const firstModelMessage = messages.find((msg) => {
    if (msg.role !== 'model') return false;
    return stripDisclaimer(parseModelContent(msg.content).answer).trim().length > 0;
  });
  if (!firstModelMessage) return null;

  const model = isAnalysisModel(params.analysisModel)
    ? params.analysisModel
    : DEFAULT_ANALYSIS_MODEL;
  const content = stripDisclaimer(parseModelContent(firstModelMessage.content).answer).trim();
  if (!content) return null;

  return {
    content,
    model,
    generatedAt: resolveGeneratedAt(firstModelMessage, fallbackUpdatedAt),
  };
};
