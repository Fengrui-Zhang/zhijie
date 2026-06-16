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

const FlowColumn = ({
  title,
  subtitle,
  ganZhi,
  meta,
}: {
  title: string;
  subtitle?: string;
  ganZhi?: string;
  meta?: string;
}) => {
  if (!ganZhi) return null;
  const gan = ganZhi.charAt(0);
  const zhi = ganZhi.charAt(1);
  return (
    <div className="min-w-[78px] rounded-lg border border-blue-100 bg-blue-50/70 p-2 text-center">
      <div className="text-xs font-semibold text-blue-600">{title}</div>
      {subtitle && <div className="mt-0.5 text-[10px] text-stone-400">{subtitle}</div>}
      <div className="mt-2 flex justify-center gap-1 text-xl font-bold">
        <span className={getWuxingColor(gan)}>{gan}</span>
        <span className={getWuxingColor(zhi)}>{zhi}</span>
      </div>
      {meta && <div className="mt-1 text-[10px] text-stone-500">{meta}</div>}
    </div>
  );
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
    className={`shrink-0 rounded-lg border px-3 py-2 text-center transition ${
      active
        ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
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
    <div className="mx-auto my-5 w-full max-w-5xl rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-bold text-stone-900">{base_info.name}（{base_info.sex}）</h3>
        <p className="text-xs text-stone-500">{base_info.gongli}{base_info.nongli ? ` · ${base_info.nongli}` : ''}</p>
        <p className="mt-1 text-xs text-stone-500">起运：{base_info.qiyun || '—'}</p>
        {base_info.zhen && <p className="mt-1 text-xs text-blue-600">真太阳时：{base_info.zhen.city} {base_info.zhen.shicha}</p>}
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[80px_repeat(4,1fr)_repeat(4,86px)] gap-2">
          <div />
          {pillars.map((pillar) => (
            <div key={pillar.label} className="rounded-lg bg-stone-50 p-2 text-center text-sm font-bold text-stone-700">{pillar.label}</div>
          ))}
          <FlowColumn title="大运" subtitle={selectedDayun ? `${selectedDayun.startAge}岁` : undefined} ganZhi={selectedDayun?.ganZhi} meta={selectedDayun?.startYear ? `${selectedDayun.startYear}起` : undefined} />
          <FlowColumn title="流年" subtitle={selectedYear ? `${selectedYear}` : undefined} ganZhi={selectedYearItem?.ganZhi} meta={selectedYearItem?.tenGod} />
          <FlowColumn title="流月" subtitle={selectedMonth ? `${selectedMonth}月` : undefined} ganZhi={selectedMonthItem?.ganZhi} meta={selectedMonthItem?.jieQi} />
          <FlowColumn title="流日" subtitle={selectedDay ? `${selectedDay}日` : undefined} ganZhi={selectedDayItem?.ganZhi} meta={selectedDayItem?.tenGod} />

          {rowLabels.map((row) => (
            <React.Fragment key={row}>
              <div className="flex items-center justify-center rounded-lg bg-stone-50 px-2 text-xs font-semibold text-stone-500">{row}</div>
              {pillars.map((pillar) => {
                const content = row === '主星'
                  ? pillar.tgGod
                  : row === '天干'
                    ? pillar.gan
                    : row === '地支'
                      ? pillar.zhi
                      : row === '藏干'
                        ? pillar.hidden
                        : row === '纳音'
                          ? pillar.nayin
                          : pillar.shensha || '—';
                const colorClass = row === '天干' || row === '地支' ? getWuxingColor(content) : 'text-stone-700';
                return (
                  <div key={`${row}-${pillar.label}`} className="min-h-[42px] rounded-lg border border-stone-100 bg-white p-2 text-center text-xs">
                    <span className={`${row === '天干' || row === '地支' ? 'text-2xl font-bold' : ''} ${colorClass}`}>{content || '—'}</span>
                  </div>
                );
              })}
              <div className="col-span-4" />
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-4 border-t border-stone-100 pt-4">
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
