import { ModelType } from '../types';

export const CASE_MODEL_TYPES = [ModelType.BAZI, ModelType.ZIWEI] as const;

export type CaseModelType = (typeof CASE_MODEL_TYPES)[number];

export type CaseChartParams = {
  name?: string;
  sex?: number;
  year?: number;
  month?: number;
  day?: number;
  hours?: number;
  minute?: number;
  province?: string;
  city?: string;
};

export interface CaseSessionItem {
  id: string;
  modelType: string;
  title: string;
  caseId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseItem {
  id: string;
  modelType: CaseModelType;
  title: string;
  chartParams: CaseChartParams | null;
  chartData: unknown;
  klineData?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetail extends CaseItem {
  sessions: CaseSessionItem[];
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toText = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

export const isCaseModelType = (value: unknown): value is CaseModelType =>
  value === ModelType.BAZI || value === ModelType.ZIWEI;

export const normalizeCaseChartParams = (value: unknown): CaseChartParams => {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    name: toText(input.name),
    sex: toNumber(input.sex),
    year: toNumber(input.year),
    month: toNumber(input.month),
    day: toNumber(input.day),
    hours: toNumber(input.hours),
    minute: toNumber(input.minute),
    province: toText(input.province),
    city: toText(input.city),
  };
};

export const buildCaseIdentityKey = (modelType: CaseModelType, chartParams: unknown) => {
  const params = normalizeCaseChartParams(chartParams);
  return [
    modelType,
    params.name || '',
    params.sex ?? '',
    params.year ?? '',
    params.month ?? '',
    params.day ?? '',
    params.hours ?? '',
    params.minute ?? '',
    params.province || '',
    params.city || '',
  ].join('|');
};

export const buildCaseTitle = (
  modelType: CaseModelType,
  chartParams: unknown,
  fallback = ''
) => {
  const params = normalizeCaseChartParams(chartParams);
  if (params.name) return params.name;

  const dateParts = [params.year, params.month, params.day].every((part) => part !== undefined)
    ? `${params.year}年${params.month}月${params.day}日`
    : '';
  const timeParts = [params.hours, params.minute].every((part) => part !== undefined)
    ? `${String(params.hours).padStart(2, '0')}:${String(params.minute).padStart(2, '0')}`
    : '';
  const label = modelType === ModelType.BAZI ? '八字命例' : '紫微命例';

  if (dateParts && timeParts) return `${label} · ${dateParts} ${timeParts}`;
  if (dateParts) return `${label} · ${dateParts}`;
  if (fallback.trim()) return fallback.trim();
  return label;
};

export const buildCaseDateTimeValue = (chartParams: unknown) => {
  const params = normalizeCaseChartParams(chartParams);
  if (
    params.year === undefined ||
    params.month === undefined ||
    params.day === undefined ||
    params.hours === undefined ||
    params.minute === undefined
  ) {
    return '';
  }

  const year = String(params.year).padStart(4, '0');
  const month = String(params.month).padStart(2, '0');
  const day = String(params.day).padStart(2, '0');
  const hours = String(params.hours).padStart(2, '0');
  const minute = String(params.minute).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minute}`;
};

export const buildCaseSessionTitle = (
  modelType: CaseModelType,
  caseTitle: string,
  question: string
) => {
  const trimmedQuestion = question.trim();
  if (trimmedQuestion) {
    return `${caseTitle} - ${trimmedQuestion.slice(0, 20)}`;
  }

  const prefix = modelType === ModelType.BAZI ? '八字分析' : '紫微分析';
  return `${prefix} - ${caseTitle}`;
};
