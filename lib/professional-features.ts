import { BaziResponse, ModelType, ZiweiResponse } from '../types';

export const PROFESSIONAL_FEATURE_JOINT = 'joint_bazi_ziwei' as const;
export const JOINT_BAZI_ZIWEI_SESSION_TYPE = 'joint_bazi_ziwei' as const;
export const JOINT_CASE_TAG = '八字+紫薇' as const;

export type ProfessionalFeatureType = typeof PROFESSIONAL_FEATURE_JOINT;

export type JointChartData = {
  feature: typeof PROFESSIONAL_FEATURE_JOINT;
  summaryTitle: string;
  baziCaseId?: string | null;
  ziweiCaseId?: string | null;
  baziChartData: BaziResponse;
  ziweiChartData: ZiweiResponse;
};

export const getProfessionalFeature = (chartParams: unknown): ProfessionalFeatureType | null => {
  if (!chartParams || typeof chartParams !== 'object') return null;
  const feature = (chartParams as Record<string, unknown>).professionalFeature;
  return feature === PROFESSIONAL_FEATURE_JOINT ? PROFESSIONAL_FEATURE_JOINT : null;
};

export const getProfessionalSourceModel = (chartParams: unknown): ModelType => {
  if (!chartParams || typeof chartParams !== 'object') return ModelType.BAZI;
  const value = (chartParams as Record<string, unknown>).sourceModelType;
  return value === ModelType.ZIWEI ? ModelType.ZIWEI : ModelType.BAZI;
};

export const getCaseSpecialTags = (chartParams: unknown): string[] => {
  if (!chartParams || typeof chartParams !== 'object') return [];
  const raw = (chartParams as Record<string, unknown>).specialTags;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

export const appendCaseSpecialTag = (
  chartParams: Record<string, unknown> | null | undefined,
  tag: string
) => {
  const base = chartParams ? { ...chartParams } : {};
  const nextTags = Array.from(new Set([...getCaseSpecialTags(chartParams), tag]));
  return {
    ...base,
    specialTags: nextTags,
  };
};

export const isJointChartData = (value: unknown): value is JointChartData => {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  return (
    input.feature === PROFESSIONAL_FEATURE_JOINT &&
    typeof input.summaryTitle === 'string' &&
    !!input.baziChartData &&
    !!input.ziweiChartData
  );
};
