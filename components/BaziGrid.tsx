import React, { useMemo, useState } from 'react';
import { calculateBaziLiuRiData, calculateBaziLiuYueData } from 'taibu-core/bazi';
import { BaziResponse } from '../types';
import { getWuxingColor } from '../utils/wuxing';

interface Props {
  data: BaziResponse;
}

const splitList = (value?: string | string[]) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value.split(/[|、\s]+/).filter(Boolean);
};

const labelForPillar = ['年柱', '月柱', '日柱', '时柱'];
const rowLabels = ['主星', '天干', '地支', '藏干', '纳音', '神煞'];

const hiddenText = (stems?: string, gods?: string) => {
  const stemList = splitList(stems);
  const godList = splitList(gods);
  if (!stemList.length) return '—';
  return stemList.map((stem, index) => `${stem}${godList[index] ? `(${godList[index]})` : ''}`).join(' ');
};

const ChipButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 rounded-2xl border px-3 py-2 text-center transition ${
      active
        ? 'glass-panel-dark border-transparent text-amber-200 shadow-[0_14px_30px_rgba(28,25,23,0.18)]'
        : 'glass-chip border-white/60 text-stone-700 hover:bg-white/75 hover:text-stone-900'
    }`}
  >
    {children}
  </button>
);

const BaziGrid: React.FC<Props> = ({ data }) => {
  const { base_info, bazi_info, dayun_info, detail_info, start_info } = data;
  const dayunList = dayun_info.list || [];
  const [selectedDayunIndex, setSelectedDayunIndex] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const pillars = labelForPillar.map((label, index) => {
    const value = bazi_info.bazi[index] || '';
    const key = ['year', 'month', 'day', 'hour'][index] as keyof BaziResponse['detail_info']['shensha'];
    return {
      label,
      ganZhi: value,
      gan: value.charAt(0),
      zhi: value.charAt(1),
      tgGod: bazi_info.tg_cg_god[index] || '',
      hidden: hiddenText(bazi_info.dz_cg[index], bazi_info.dz_cg_god?.[index]),
      nayin: bazi_info.na_yin[index] || '',
      shensha: detail_info.shensha?.[key] || start_info?.jishen?.[index] || '',
    };
  });

  const selectedDayun = selectedDayunIndex !== null ? dayunList[selectedDayunIndex] : null;
  const selectedYearItem = useMemo(() => {
    if (!selectedDayun || selectedYear === null) return null;
    return selectedDayun.liunianList?.find((item: any) => item.year === selectedYear) || null;
  }, [selectedDayun, selectedYear]);
  const fortuneContext = (detail_info as any).fortuneContext;
  const liuyueList = useMemo(() => {
    if (!selectedYear || !fortuneContext) return [];
    return calculateBaziLiuYueData(selectedYear, fortuneContext);
  }, [fortuneContext, selectedYear]);
  const selectedMonthItem = selectedMonth ? liuyueList.find((item: any) => item.month === selectedMonth) : null;
  const liuriList = useMemo(() => {
    if (!selectedMonthItem || !fortuneContext) return [];
    return calculateBaziLiuRiData(selectedMonthItem.startDate, selectedMonthItem.endDate, fortuneContext);
  }, [fortuneContext, selectedMonthItem]);
  const selectedDayItem = selectedDay ? liuriList.find((item: any) => item.day === selectedDay) : null;
  const tableColumns = useMemo(() => {
    const natalColumns = pillars.map((pillar) => ({
      kind: 'natal' as const,
      key: pillar.label,
      title: pillar.label,
      subtitle: '',
      ganZhi: pillar.ganZhi,
      values: {
        主星: pillar.tgGod,
        天干: pillar.gan,
        地支: pillar.zhi,
        藏干: pillar.hidden,
        纳音: pillar.nayin,
        神煞: pillar.shensha || '—',
      },
    }));
    const flowColumns = [
      selectedDayun ? {
        kind: 'flow' as const,
        key: 'dayun',
        title: '大运',
        subtitle: `${selectedDayun.startAge}岁 · ${selectedDayun.startYear}`,
        ganZhi: selectedDayun.ganZhi,
        values: {
          主星: selectedDayun.tenGod || '—',
          天干: selectedDayun.ganZhi?.charAt(0) || '',
          地支: selectedDayun.ganZhi?.charAt(1) || '',
          藏干: hiddenText(
            selectedDayun.hiddenStems?.map((item: any) => item.stem).join(' '),
            selectedDayun.hiddenStems?.map((item: any) => item.tenGod).join(' '),
          ),
          纳音: selectedDayun.naYin || selectedDayun.nayin || '—',
          神煞: selectedDayun.shenSha?.join(' ') || '—',
        },
      } : null,
      selectedYearItem ? {
        kind: 'flow' as const,
        key: 'liunian',
        title: '流年',
        subtitle: `${selectedYearItem.year}年 · ${selectedYearItem.age}岁`,
        ganZhi: selectedYearItem.ganZhi,
        values: {
          主星: selectedYearItem.tenGod || '—',
          天干: selectedYearItem.gan || selectedYearItem.ganZhi?.charAt(0) || '',
          地支: selectedYearItem.zhi || selectedYearItem.ganZhi?.charAt(1) || '',
          藏干: hiddenText(
            selectedYearItem.hiddenStems?.map((item: any) => item.stem).join(' '),
            selectedYearItem.hiddenStems?.map((item: any) => item.tenGod).join(' '),
          ),
          纳音: selectedYearItem.naYin || selectedYearItem.nayin || '—',
          神煞: selectedYearItem.shenSha?.join(' ') || '—',
        },
      } : null,
      selectedMonthItem ? {
        kind: 'flow' as const,
        key: 'liuyue',
        title: '流月',
        subtitle: `${selectedMonthItem.month}月 · ${selectedMonthItem.jieQi || ''}`,
        ganZhi: selectedMonthItem.ganZhi,
        values: {
          主星: selectedMonthItem.tenGod || '—',
          天干: selectedMonthItem.gan || selectedMonthItem.ganZhi?.charAt(0) || '',
          地支: selectedMonthItem.zhi || selectedMonthItem.ganZhi?.charAt(1) || '',
          藏干: hiddenText(
            selectedMonthItem.hiddenStems?.map((item: any) => item.stem).join(' '),
            selectedMonthItem.hiddenStems?.map((item: any) => item.tenGod).join(' '),
          ),
          纳音: selectedMonthItem.naYin || '—',
          神煞: selectedMonthItem.shenSha?.join(' ') || '—',
        },
      } : null,
      selectedDayItem ? {
        kind: 'flow' as const,
        key: 'liuri',
        title: '流日',
        subtitle: `${selectedDayItem.date}`,
        ganZhi: selectedDayItem.ganZhi,
        values: {
          主星: selectedDayItem.tenGod || '—',
          天干: selectedDayItem.gan || selectedDayItem.ganZhi?.charAt(0) || '',
          地支: selectedDayItem.zhi || selectedDayItem.ganZhi?.charAt(1) || '',
          藏干: hiddenText(
            selectedDayItem.hiddenStems?.map((item: any) => item.stem).join(' '),
            selectedDayItem.hiddenStems?.map((item: any) => item.tenGod).join(' '),
          ),
          纳音: selectedDayItem.naYin || '—',
          神煞: selectedDayItem.shenSha?.join(' ') || '—',
        },
      } : null,
    ].filter(Boolean);
    return [...natalColumns, ...flowColumns];
  }, [liuriList, liuyueList, pillars, selectedDayItem, selectedDayun, selectedMonthItem, selectedYearItem]);

  const selectDayun = (index: number) => {
    const next = selectedDayunIndex === index ? null : index;
    setSelectedDayunIndex(next);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
  };

  const selectYear = (year: number) => {
    setSelectedYear((current) => current === year ? null : year);
    setSelectedMonth(null);
    setSelectedDay(null);
  };

  const selectMonth = (month: number) => {
    setSelectedMonth((current) => current === month ? null : month);
    setSelectedDay(null);
  };

  return (
    <div className="mx-auto my-5 w-full max-w-6xl rounded-[30px] border border-white/60 bg-white/35 p-4 shadow-[0_18px_48px_rgba(28,25,23,0.08)] backdrop-blur-xl md:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-stone-100/80 pb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">四柱八字</div>
          <h3 className="mt-1 text-2xl font-bold text-stone-900">{base_info.name}（{base_info.sex}）</h3>
        </div>
        <div className="text-right text-xs leading-6 text-stone-500">
          <div>{base_info.gongli}{base_info.nongli ? ` · ${base_info.nongli}` : ''}</div>
          <div>起运：{base_info.qiyun || '—'}</div>
          {base_info.zhen && <div className="text-amber-700">真太阳时：{base_info.zhen.city} {base_info.zhen.shicha}</div>}
        </div>
      </div>

      <div className="glass-panel-soft overflow-x-auto rounded-[26px] border border-white/60">
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-center">
          <thead>
            <tr>
              <th className="w-20 border-b border-white/60 bg-white/35 p-3 text-xs font-semibold text-stone-400">四柱</th>
              {tableColumns.map((column) => (
                <th
                  key={column.key}
                  className={`border-b border-l border-white/60 p-3 ${
                    column.kind === 'flow' ? 'bg-amber-50/70 text-amber-800' : 'bg-white/35 text-stone-800'
                  }`}
                >
                  <div className="text-base font-bold">{column.title}</div>
                  {column.subtitle && <div className="mt-1 text-[10px] font-normal text-stone-500">{column.subtitle}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((row) => (
              <tr key={row}>
                <th className="border-b border-white/60 bg-white/30 p-3 text-xs font-semibold text-stone-500">{row}</th>
                {tableColumns.map((column) => {
                  const content = column.values[row as keyof typeof column.values] || '—';
                  const colorClass = row === '天干' || row === '地支' ? getWuxingColor(String(content)) : 'text-stone-700';
                  return (
                    <td key={`${row}-${column.key}`} className="border-b border-l border-white/60 bg-white/20 p-3 align-middle">
                      <div
                        className={`mx-auto max-w-[150px] whitespace-normal break-keep text-center leading-5 ${
                          row === '天干' || row === '地支' ? `text-3xl font-bold ${colorClass}` : 'text-xs text-stone-700'
                        }`}
                      >
                        {content}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-4 border-t border-stone-100/80 pt-4">
        <section>
          <div className="mb-2 text-sm font-bold text-stone-800">大运</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dayunList.map((item: any, index: number) => (
              <ChipButton key={`${item.ganZhi}-${index}`} active={selectedDayunIndex === index} onClick={() => selectDayun(index)}>
                <div className="text-sm font-bold">{item.ganZhi}</div>
                <div className="text-[10px] opacity-70">{item.startAge}岁 · {item.startYear}</div>
              </ChipButton>
            ))}
          </div>
        </section>

        {selectedDayun && (
          <section>
            <div className="mb-2 text-sm font-bold text-stone-800">流年</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(selectedDayun.liunianList || []).map((item: any) => (
                <ChipButton key={item.year} active={selectedYear === item.year} onClick={() => selectYear(item.year)}>
                  <div className="text-xs">{item.year}</div>
                  <div className="text-sm font-bold">{item.ganZhi}</div>
                  <div className="text-[10px] opacity-70">{item.age}岁</div>
                </ChipButton>
              ))}
            </div>
          </section>
        )}

        {selectedYear && liuyueList.length > 0 && (
          <section>
            <div className="mb-2 text-sm font-bold text-stone-800">{selectedYear}年流月</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {liuyueList.map((item: any) => (
                <ChipButton key={item.month} active={selectedMonth === item.month} onClick={() => selectMonth(item.month)}>
                  <div className="text-xs">{item.month}月</div>
                  <div className="text-sm font-bold">{item.ganZhi}</div>
                </ChipButton>
              ))}
            </div>
          </section>
        )}

        {selectedMonth && liuriList.length > 0 && (
          <section>
            <div className="mb-2 text-sm font-bold text-stone-800">{selectedYear}年{selectedMonth}月流日</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {liuriList.map((item: any) => (
                <ChipButton key={item.date} active={selectedDay === item.day} onClick={() => setSelectedDay((current) => current === item.day ? null : item.day)}>
                  <div className="text-xs">{item.day}日</div>
                  <div className="text-sm font-bold">{item.ganZhi}</div>
                </ChipButton>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BaziGrid;
