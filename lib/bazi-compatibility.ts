import type { BaziResponse } from '../types';

export const BAZI_COMPATIBILITY_PERSON_LIMIT = 6_000;
export const BAZI_COMPATIBILITY_MAX_OUTPUT_TOKENS = 4_096;
export const BAZI_COMPATIBILITY_TIMEOUT_MS = 120_000;

const text = (value: unknown, fallback = '—') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const list = (value: unknown, separator = '、') =>
  Array.isArray(value) && value.length > 0 ? value.map((item) => text(item)).join(separator) : '—';

export function formatBaziCompatibilityChart(
  data: BaziResponse | Record<string, unknown>,
  maxChars = BAZI_COMPATIBILITY_PERSON_LIMIT,
) {
  const chart = data as Partial<BaziResponse>;
  const base = chart.base_info;
  const bazi = chart.bazi_info;
  const detail = chart.detail_info;
  const dayun = chart.dayun_info;
  const start = chart.start_info;

  if (!base || !bazi || !dayun) {
    const fallback = typeof chart.taibuText === 'string'
      ? chart.taibuText
      : JSON.stringify(data, null, 2);
    return fallback.trim().slice(0, maxChars);
  }

  const shensha = detail?.shensha;
  const dayunLines = (dayun.big || []).slice(0, 12).map((pillar, index) => {
    const startYear = dayun.big_start_year?.[index];
    const endYear = dayun.big_end_year?.[index];
    const age = dayun.xu_sui?.[index];
    const god = dayun.big_god?.[index];
    return `${pillar}（${text(god)}，${text(startYear)}-${text(endYear)}，${text(age)}岁起）`;
  });

  return [
    `姓名：${text(base.name)}（${text(base.sex)}）`,
    `公历：${text(base.gongli)}；农历：${text(base.nongli)}`,
    `四柱：${list(bazi.bazi, ' ')}`,
    `天干十神：${list(bazi.tg_cg_god)}`,
    `藏干：${list(bazi.dz_cg)}`,
    `藏干十神：${list(bazi.dz_cg_god)}`,
    `十二长生：${list(bazi.day_cs)}`,
    `纳音：${list(bazi.na_yin)}`,
    `格局：${text(base.zhengge)}`,
    `旬空：${text(bazi.kw)}`,
    `起运：${text(base.qiyun)}；交运：${text(base.jiaoyun)}`,
    base.zhen?.shicha ? `真太阳时校正：${base.zhen.shicha}` : '',
    `四柱神煞：年柱 ${text(shensha?.year)}；月柱 ${text(shensha?.month)}；日柱 ${text(shensha?.day)}；时柱 ${text(shensha?.hour)}`,
    `吉神凶煞：${list(start?.jishen)}`,
    `大运：${dayunLines.join('；') || '—'}`,
  ].filter(Boolean).join('\n').slice(0, maxChars);
}
