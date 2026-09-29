import { ModelType } from '../types';
import { normalizeCaseChartParams, type CaseChartParams } from './divination-cases';

type ArchiveRecord = { id: string; modelType: string; chartParams: unknown };

export function caseBirthKey(value: unknown) {
  const p = normalizeCaseChartParams(value);
  return JSON.stringify([
    p.sex, p.year, p.month, p.day, p.hours, p.minute ?? 0,
    p.calendarType || 'solar', Boolean(p.isLeapMonth), p.pillars || null,
    p.province || '', p.city || '', p.district || '', p.birthPlace || '',
    Boolean(p.useTrueSolar), p.longitude ?? null, p.latitude ?? null,
  ]);
}

function legacyArchiveKey(item: ArchiveRecord) {
  const p = normalizeCaseChartParams(item.chartParams);
  if (!p.name || p.sex === undefined || [p.year, p.month, p.day, p.hours].some(v => v === undefined)) return null;
  return `${p.name}\n${caseBirthKey(p)}`;
}

export function groupCaseArchives<T extends ArchiveRecord>(items: T[]): T[][] {
  const linked = new Map<string, T[]>();
  const legacy = new Map<string, T[]>();
  const groups: T[][] = [];
  for (const item of items) {
    const archiveId = normalizeCaseChartParams(item.chartParams).archiveId;
    const key = archiveId || legacyArchiveKey(item);
    if (!key) { groups.push([item]); continue; }
    const map = archiveId ? linked : legacy;
    map.set(key, [...(map.get(key) || []), item]);
  }
  groups.push(...linked.values());
  for (const matches of legacy.values()) {
    // Ambiguous legacy duplicates remain separate; no history is discarded.
    if (matches.length === 2 && new Set(matches.map(item => item.modelType)).size === 2) groups.push(matches);
    else groups.push(...matches.map(item => [item]));
  }
  return groups;
}

export function findCaseArchive<T extends ArchiveRecord>(items: T[], id: string): T[] {
  return groupCaseArchives(items).find(group => group.some(item => item.id === id)) || [];
}

export function archiveRepresentatives<T extends ArchiveRecord & { updatedAt: string }>(items: T[]): T[] {
  return groupCaseArchives(items).map(group => {
    const primary = group.find(item => item.modelType === ModelType.BAZI) || group[0];
    return { ...primary, updatedAt: group.reduce((latest, item) => item.updatedAt > latest ? item.updatedAt : latest, primary.updatedAt) };
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function assertArchiveCanSwitch(params: CaseChartParams) {
  if (params.calendarType === 'pillars') throw new Error('这份档案仅保存了四柱，请先编辑档案补充实际出生日期，再切换排盘。');
  if ([params.sex, params.year, params.month, params.day, params.hours].some(value => value === undefined)) {
    throw new Error('这份档案的出生资料不完整，请先编辑补充后再切换排盘。');
  }
}

export function sharedArchiveParams(previous: unknown, birth: unknown, archiveId: string): CaseChartParams {
  const old = normalizeCaseChartParams(previous);
  return normalizeCaseChartParams({
    specialTags: old.specialTags,
    professionalFeature: old.professionalFeature,
    sourceModelType: old.sourceModelType,
    compatibilityChartData: old.compatibilityChartData,
    rechartSource: old.rechartSource,
    rechartVersion: old.rechartVersion,
    ...normalizeCaseChartParams(birth), archiveId,
  });
}

export function chartWithArchiveName<T>(chart: T, name?: string): T {
  if (!chart || typeof chart !== 'object' || !('base_info' in chart)) return chart;
  const base = chart.base_info;
  if (!base || typeof base !== 'object') return chart;
  return { ...chart, base_info: { ...base, name: name || '匿名' } };
}
