import { Lunar, Solar } from 'lunar-javascript';
import { normalizeCaseChartParams, type CaseItem } from './divination-cases';
import { HIDDEN_STEMS } from './bazi-character-analysis';

const record = (value: unknown): Record<string, any> => value && typeof value === 'object' ? value as Record<string, any> : {};
const text = (value: unknown) => typeof value === 'string' ? value : '';
export function getCaseCardPreview(item: CaseItem) {
  const params = normalizeCaseChartParams(item.chartParams);
  const data = record(item.chartData);
  const base = record(data.base_info);
  const canonical = record(record(data.taibuJson).基本信息);
  let pillars: string[] = Array.isArray(data.bazi_info?.bazi) ? data.bazi_info.bazi.slice(0, 4) : [];
  if (!pillars.length && typeof canonical.四柱 === 'string') pillars = canonical.四柱.trim().split(/\s+/);
  if (!pillars.length && data.sizhu_info) pillars = ['year', 'month', 'day', 'hour'].map((key) => `${data.sizhu_info[`${key}_gan`] || ''}${data.sizhu_info[`${key}_zhi`] || ''}`);
  if (!pillars.length && params.pillars) pillars = ['year', 'month', 'day', 'hour'].map((key) => params.pillars![key as keyof typeof params.pillars]);
  pillars = Array.from({ length: 4 }, (_, index) => text(pillars[index]) || '—');
  let solar = text(canonical.阳历) || text(base.gongli);
  let lunar = text(canonical.农历) || text(base.nongli);
  if (params.calendarType !== 'pillars' && params.year && params.month && params.day) {
    try {
      const date = params.calendarType === 'lunar'
        ? Lunar.fromYmdHms(params.year, params.isLeapMonth ? -params.month : params.month, params.day, params.hours || 0, params.minute || 0, 0).getSolar()
        : Solar.fromYmdHms(params.year, params.month, params.day, params.hours || 0, params.minute || 0, 0);
      solar = date.toYmdHms().slice(0, 16);
      const ld = date.getLunar();
      lunar = `${ld.getYearInChinese()}年${ld.getMonthInChinese()}月${ld.getDayInChinese()} ${solar.slice(-5)}`;
    } catch { /* Preserve recorded dates for historical entries. */ }
  }
  const location = params.birthPlace || [params.province, params.city, params.district].filter(Boolean).join('');
  const trueSolar = text(base.zhen?.shicha) || text(canonical.真太阳时?.真太阳时);
  return {
    name: params.name || item.title,
    sex: params.sex === 0 ? '乾造' : params.sex === 1 ? '坤造' : '',
    pillars,
    hidden: pillars.map((pillar) => HIDDEN_STEMS[pillar[1]] || []),
    solar: solar || '未记录', lunar: lunar || '未记录', location, trueSolar,
    chartTime: params.rechartAt || item.createdAt,
  };
}
