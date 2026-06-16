import { ModelType } from '../types';
import { DEFAULT_ANALYSIS_MODEL, isAnalysisModel, type AnalysisModel } from './analysis-models';
import type { CaseRelationItem } from './case-relations';

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
  district?: string;
  birthPlace?: string;
  longitude?: number;
  latitude?: number;
  useTrueSolar?: boolean;
  timeInputMode?: 'exact' | 'quick';
  calendarType?: 'solar' | 'lunar' | 'pillars';
  isLeapMonth?: boolean;
  pillars?: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  specialTags?: string[];
  professionalFeature?: string;
  sourceModelType?: string;
  compatibilityChartData?: any;
  rechartSource?: string;
  rechartAt?: string;
  rechartVersion?: number;
};

export interface CaseSessionItem {
  id: string;
  modelType: string;
  title: string;
  caseId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitialAnalysisData {
  content: string;
  model: AnalysisModel;
  generatedAt: string;
}

export interface CaseItem {
  id: string;
  modelType: CaseModelType;
  title: string;
  chartParams: CaseChartParams | null;
  chartData: unknown;
  klineData?: unknown;
  initialAnalysisData?: InitialAnalysisData | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetail extends CaseItem {
  sessions: CaseSessionItem[];
  relations?: CaseRelationItem[];
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

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
  }
  return undefined;
};

const toFiniteNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toCalendarType = (value: unknown): CaseChartParams['calendarType'] => {
  if (value === 'solar' || value === 'lunar' || value === 'pillars') return value;
  return undefined;
};

const toTimeInputMode = (value: unknown): CaseChartParams['timeInputMode'] => {
  if (value === 'exact' || value === 'quick') return value;
  return undefined;
};

const toPillars = (value: unknown): CaseChartParams['pillars'] => {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  const year = toText(input.year);
  const month = toText(input.month);
  const day = toText(input.day);
  const hour = toText(input.hour);
  if (!year || !month || !day || !hour) return undefined;
  return { year, month, day, hour };
};

export const normalizeInitialAnalysisData = (value: unknown): InitialAnalysisData | null => {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const content = toText(input.content);
  const model =
    typeof input.model === 'string'
      ? (isAnalysisModel(input.model) ? input.model : DEFAULT_ANALYSIS_MODEL)
      : null;
  const generatedAt = toText(input.generatedAt);
  if (!content || !model || !generatedAt) return null;
  return { content, model, generatedAt };
};

export const isCaseModelType = (value: unknown): value is CaseModelType =>
  value === ModelType.BAZI || value === ModelType.ZIWEI;

export const normalizeCaseChartParams = (value: unknown): CaseChartParams => {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const specialTags = Array.isArray(input.specialTags)
    ? input.specialTags.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined;
  const result: CaseChartParams = {
    name: toText(input.name),
    sex: toNumber(input.sex),
    year: toNumber(input.year),
    month: toNumber(input.month),
    day: toNumber(input.day),
    hours: toNumber(input.hours),
    minute: toNumber(input.minute),
    province: toText(input.province),
    city: toText(input.city),
    district: toText(input.district),
    birthPlace: toText(input.birthPlace),
    longitude: toFiniteNumber(input.longitude),
    latitude: toFiniteNumber(input.latitude),
    useTrueSolar: toBoolean(input.useTrueSolar),
    timeInputMode: toTimeInputMode(input.timeInputMode),
    calendarType: toCalendarType(input.calendarType),
    isLeapMonth: toBoolean(input.isLeapMonth),
    pillars: toPillars(input.pillars),
    specialTags,
    professionalFeature: toText(input.professionalFeature),
    sourceModelType: toText(input.sourceModelType),
    compatibilityChartData: input.compatibilityChartData,
    rechartSource: toText(input.rechartSource),
    rechartAt: toText(input.rechartAt),
    rechartVersion: toNumber(input.rechartVersion),
  };

  Object.keys(result).forEach((key) => {
    if (result[key as keyof CaseChartParams] === undefined) {
      delete result[key as keyof CaseChartParams];
    }
  });

  return {
    ...result,
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
