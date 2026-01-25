
import React, { useMemo, useState } from 'react';
import { BaziResponse } from '../types';
import { getWuxingColor } from '../utils/wuxing';

interface Props {
  data: BaziResponse;
}

const splitList = (value?: string) => {
  if (!value) return [];
  return value.split(/[|、\s]+/).filter(Boolean);
};

const PillarHidden = ({ stems, gods }: { stems: string[]; gods: string[] }) => {
  if (!stems.length) return <div className="text-[10px] text-stone-400">—</div>;
  return (
    <div className="space-y-1 inline-flex flex-col items-center">
      {stems.map((stem, idx) => (
        <div key={`${stem}-${idx}`} className="flex items-center gap-1 text-xs">
          <span className={`font-semibold ${getWuxingColor(stem)}`}>{stem}</span>
          {gods[idx] && (
            <span className="px-1.5 py-0.5 rounded-full border border-stone-200 bg-stone-50 text-[10px] text-stone-600">
              {gods[idx]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const getGanzhiYear = (year: number) => {
  const baseYear = 1984; // 1984 is 甲子
  const offset = ((year - baseYear) % 60 + 60) % 60;
  const stem = STEMS[offset % 10];
  const branch = BRANCHES[offset % 12];
  return `${stem}${branch}`;
};

const BaziGrid: React.FC<Props> = ({ data }) => {
  const { base_info, bazi_info, dayun_info, detail_info, start_info } = data;
  const shensha = detail_info?.shensha;
  const jishen = start_info?.jishen;
  const dayunShensha = detail_info?.dayunshensha || [];
  const [expandedDayunIdx, setExpandedDayunIdx] = useState<number | null>(null);
  const [shenshaExpanded, setShenshaExpanded] = useState(false);
  const pillarShensha = shensha ?? (jishen ? {
    year: jishen[0] || '',
    month: jishen[1] || '',
    day: jishen[2] || '',
    hour: jishen[3] || '',
  } : undefined);

  const pillars = [
    {
      key: 'year',
      label: '年柱',
      bazi: bazi_info.bazi[0],
      tgGod: bazi_info.tg_cg_god[0],
      hidden: bazi_info.dz_cg[0],
      hiddenGod: bazi_info.dz_cg_god?.[0],
      nayin: bazi_info.na_yin[0],
    },
    {
      key: 'month',
      label: '月柱',
      bazi: bazi_info.bazi[1],
      tgGod: bazi_info.tg_cg_god[1],
      hidden: bazi_info.dz_cg[1],
      hiddenGod: bazi_info.dz_cg_god?.[1],
      nayin: bazi_info.na_yin[1],
    },
    {
      key: 'day',
      label: '日柱',
      bazi: bazi_info.bazi[2],
      tgGod: bazi_info.tg_cg_god[2],
      hidden: bazi_info.dz_cg[2],
      hiddenGod: bazi_info.dz_cg_god?.[2],
      nayin: bazi_info.na_yin[2],
    },
    {
      key: 'hour',
      label: '时柱',
      bazi: bazi_info.bazi[3],
      tgGod: bazi_info.tg_cg_god[3],
      hidden: bazi_info.dz_cg[3],
      hiddenGod: bazi_info.dz_cg_god?.[3],
      nayin: bazi_info.na_yin[3],
    },
  ];

  const yearsInfoByIndex = useMemo(() => {
    const map: Record<number, { year_char: string }[]> = {};
    if (!dayun_info) return map;
    Object.keys(dayun_info).forEach((key) => {
      if (!key.startsWith('years_info')) return;
      const idx = Number(key.replace('years_info', ''));
      if (Number.isNaN(idx)) return;
      const value = dayun_info[key];
      if (Array.isArray(value)) {
        map[idx] = value as { year_char: string }[];
      }
    });
    return map;
  }, [dayun_info]);
  const hasYearsInfo = Object.keys(yearsInfoByIndex).length > 0;

  const getYearListForDayun = (idx: number) => {
    const startYear = dayun_info.big_start_year?.[idx];
    const endYear = dayun_info.big_end_year?.[idx];
    if (Number.isFinite(startYear) && Number.isFinite(endYear) && endYear >= startYear && endYear - startYear <= 30) {
      return Array.from({ length: endYear - startYear + 1 }, (_, i) => ({
        year_char: getGanzhiYear(startYear + i),
      }));
    }
    return yearsInfoByIndex[idx] || [];
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-5 bg-white p-3 md:p-4 rounded-xl shadow-sm border border-stone-200">
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-stone-800">{base_info.name} ({base_info.sex})</h3>
        <p className="text-xs text-stone-500">{base_info.nongli}</p>
        <p className="text-xs text-stone-500">
          格局: {base_info.zhengge} | {base_info.qiyun}
          {base_info.zhen && <span className="block text-amber-600 mt-1">真太阳时: {base_info.zhen.city} ({base_info.zhen.shicha})</span>}
        </p>
      </div>

      {/* Four Pillars (Compact Grid) */}
      <div className="border border-stone-200 rounded-lg overflow-hidden mb-3">
        <div className="grid grid-cols-5 text-[11px] text-stone-400 bg-stone-50 border-b border-stone-200">
          <div className="px-2 py-1.5">四柱</div>
          {pillars.map((p) => (
            <div key={p.key} className="px-2 py-1.5 text-center">{p.label}</div>
          ))}
        </div>

        <div className="grid grid-cols-5 border-b border-stone-100">
          <div className="px-2 py-1.5 text-[11px] text-stone-400">主星</div>
          {pillars.map((p) => (
            <div key={p.key} className="px-2 py-1.5 text-xs text-center text-stone-700">{p.tgGod}</div>
          ))}
        </div>

        <div className="grid grid-cols-5 border-b border-stone-100">
          <div className="px-2 py-2 text-[11px] text-stone-400">天干</div>
          {pillars.map((p) => {
            const gan = p.bazi.charAt(0);
            return (
              <div key={p.key} className="px-2 py-2 text-center text-xl font-bold font-serif">
                <span className={getWuxingColor(gan)}>{gan}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-5 border-b border-stone-100">
          <div className="px-2 py-2 text-[11px] text-stone-400">地支</div>
          {pillars.map((p) => {
            const zhi = p.bazi.charAt(1);
            return (
              <div key={p.key} className="px-2 py-2 text-center text-xl font-bold font-serif">
                <span className={getWuxingColor(zhi)}>{zhi}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-5 border-b border-stone-100">
          <div className="px-2 py-2 text-[11px] text-stone-400">藏干</div>
          {pillars.map((p) => (
            <div key={p.key} className="px-2 py-2 text-center">
              <PillarHidden
                stems={splitList(p.hidden)}
                gods={splitList(p.hiddenGod)}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5">
          <div className="px-2 py-1.5 text-[11px] text-stone-400">纳音</div>
          {pillars.map((p) => (
            <div key={p.key} className="px-2 py-1.5 text-[11px] text-center text-stone-500">{p.nayin}</div>
          ))}
        </div>
      </div>

      {pillarShensha && (
        <div className="border-t border-stone-100 pt-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold text-stone-700">神煞</div>
            <button
              type="button"
              onClick={() => setShenshaExpanded((prev) => !prev)}
              className="text-[11px] text-amber-600 hover:text-amber-700"
            >
              {shenshaExpanded ? '收起' : '展开'}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs text-stone-600">
            <div className="text-stone-400 flex items-center">四柱神煞</div>
            {(['year', 'month', 'day', 'hour'] as const).map((key, idx) => {
              const label = ['年柱', '月柱', '日柱', '时柱'][idx];
              const list = (pillarShensha[key] || '').split(/\s+/).filter(Boolean);
              const visible = shenshaExpanded ? list : list.slice(0, 2);
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div className="text-stone-400">{label}</div>
                  <div className="space-y-1 text-center">
                    {(visible.length ? visible : ['—']).map((item, i) => (
                      <div key={`${key}-${i}`} className="whitespace-nowrap">{item}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dayun */}
      <div className="border-t border-stone-100 pt-4">
        <div className="text-sm font-bold text-stone-700 mb-2">大运</div>
        <div className="flex overflow-x-auto gap-2 pb-2">
          {dayun_info.big.map((dy, idx) => {
             const gan = dy.charAt(0);
             const zhi = dy.charAt(1);
             const shenshaText = dayunShensha[idx]?.shensha?.trim();
             return (
               <button
                 key={idx}
                 type="button"
                 onClick={() => setExpandedDayunIdx(expandedDayunIdx === idx ? null : idx)}
                 className={`flex flex-col items-center min-w-[70px] p-2 rounded border transition ${expandedDayunIdx === idx ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-100 hover:bg-stone-100'}`}
               >
                  <div className="text-sm font-semibold flex gap-0.5">
                    <span className={getWuxingColor(gan)}>{gan}</span>
                    <span className={getWuxingColor(zhi)}>{zhi}</span>
                  </div>
                  <div className="text-[10px] text-stone-400">{dayun_info.xu_sui[idx]}岁</div>
                  <div className="text-[10px] text-stone-300">{dayun_info.big_start_year[idx]}</div>
                  {shenshaText && (
                    <div className="mt-1 text-[10px] text-amber-700 line-clamp-2 text-center">
                      {shenshaText}
                    </div>
                  )}
               </button>
             );
          })}
        </div>

        {(hasYearsInfo || expandedDayunIdx !== null) && expandedDayunIdx !== null && (
          <div className="mt-3 rounded-lg border border-stone-100 bg-stone-50 p-3">
            <div className="text-xs font-bold text-stone-700 mb-2">
              大运 {dayun_info.big[expandedDayunIdx]}（{dayun_info.big_start_year[expandedDayunIdx]} - {dayun_info.big_end_year[expandedDayunIdx]}）
            </div>
            {dayunShensha[expandedDayunIdx]?.shensha && (
              <div className="text-xs text-amber-700 mb-2">
                大运神煞: {dayunShensha[expandedDayunIdx].shensha}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {getYearListForDayun(expandedDayunIdx).map((item, index) => {
                const gan = item.year_char?.charAt(0) || '';
                const zhi = item.year_char?.charAt(1) || '';
                const yearValue = dayun_info.big_start_year?.[expandedDayunIdx] !== undefined
                  ? dayun_info.big_start_year[expandedDayunIdx] + index
                  : undefined;
                return (
                  <div
                    key={`${expandedDayunIdx}-${index}`}
                    className="flex flex-col items-center gap-0.5 min-w-[46px] px-2 py-1 rounded bg-white border border-stone-200"
                  >
                    <div className="flex items-center gap-1">
                      <div className={`text-sm font-semibold ${getWuxingColor(gan)}`}>{gan}</div>
                      <div className={`text-sm font-semibold ${getWuxingColor(zhi)}`}>{zhi}</div>
                    </div>
                    {yearValue && (
                      <div className="text-[10px] text-stone-400">{yearValue}</div>
                    )}
                  </div>
                );
              })}
              {getYearListForDayun(expandedDayunIdx).length === 0 && (
                <span className="text-xs text-stone-400">该大运未提供流年信息</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BaziGrid;
