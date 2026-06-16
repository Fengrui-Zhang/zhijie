import React, { useMemo, useState } from 'react';
import {
  calculateZiweiDataWithAstrolabe,
  calculateZiweiHoroscopeDataWithAstrolabe,
} from 'taibu-core/ziwei';
import { toZiweiHoroscopeJson } from 'taibu-core/ziwei-horoscope';
import { ZiweiResponse } from '../types';
import { getWuxingColor } from '../utils/wuxing';

interface Props {
  data: ZiweiResponse;
}

type CanonicalPalace = {
  宫位: string;
  干支: string;
  是否身宫?: string;
  是否来因宫?: string;
  主星及四化?: Array<{ 星名: string; 亮度?: string; 四化?: string }>;
  辅星?: Array<{ 星名: string; 亮度?: string; 四化?: string }>;
  杂曜?: Array<{ 星名: string; 亮度?: string; 四化?: string }>;
  神煞?: string[];
  大限?: string;
  宫位索引?: number;
};

type CanonicalChart = {
  基本信息: Record<string, any>;
  十二宫位: CanonicalPalace[];
};

type HoroscopeJson = {
  运限叠宫?: Array<{
    层次: string;
    宫位索引: number;
    干支: string;
    落入本命宫位: string;
  }>;
};

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const GRID_LAYOUT = [
  [5, 6, 7, 8],
  [4, -1, -1, 9],
  [3, -1, -1, 10],
  [2, 1, 0, 11],
];

const branchIndex = (branch: string) => BRANCHES.indexOf(branch);
const normalize = (value: number) => ((value % 12) + 12) % 12;
const triangleSquare = (palaceIndex: number) => {
  const self = normalize(palaceIndex);
  return [self, normalize(self + 6), normalize(self + 4), normalize(self - 4)];
};
const ganzhiYear = (year: number) => {
  const offset = ((year - 1984) % 60 + 60) % 60;
  return `${STEMS[offset % 10]}${BRANCHES[offset % 12]}`;
};
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const Star = ({ star, type }: { star: { 星名: string; 亮度?: string; 四化?: string }; type: 'major' | 'minor' | 'misc' }) => {
  const color = type === 'major' ? 'text-blue-600' : type === 'minor' ? 'text-rose-500' : 'text-stone-500';
  return (
    <span className={`mr-1 inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      {star.星名}
      {star.四化 && <span className="rounded bg-amber-100 px-0.5 text-[10px] text-amber-700">{star.四化}</span>}
      {star.亮度 && <span className="text-[10px] text-stone-400">{star.亮度}</span>}
    </span>
  );
};

const FlowBadge = ({ label, value, className }: { label: string; value?: string; className: string }) => {
  if (!value) return null;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${className}`}>
      {label}{value}
    </span>
  );
};

const PalaceCard = ({
  palace,
  selected,
  square,
  flowTypes,
  showMisc,
  onClick,
}: {
  palace: CanonicalPalace;
  selected: boolean;
  square: boolean;
  flowTypes: string[];
  showMisc: boolean;
  onClick: () => void;
}) => {
  const highlight = selected
    ? 'border-blue-500 bg-blue-50 shadow-sm'
    : square
      ? 'border-green-400 bg-green-50'
      : flowTypes.length
        ? 'border-purple-300 bg-purple-50/60'
        : 'border-stone-200 bg-stone-50 hover:bg-white';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-[132px] flex-col rounded-lg border-2 p-2 text-left transition ${highlight}`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-bold text-stone-900">
          {palace.宫位}
          {palace.是否身宫 === '是' && <span className="ml-1 rounded bg-orange-100 px-1 py-0.5 text-[10px] text-orange-600">身宫</span>}
          {palace.是否来因宫 === '是' && <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-600">来因宫</span>}
        </div>
        <div className="text-xs text-stone-500">{palace.干支}</div>
      </div>
      <div className="flex-1 leading-5">
        {(palace.主星及四化 || []).map((star, index) => <Star key={`m-${index}`} star={star} type="major" />)}
        {(palace.辅星 || []).map((star, index) => <Star key={`a-${index}`} star={star} type="minor" />)}
        {showMisc && (palace.杂曜 || []).map((star, index) => <Star key={`x-${index}`} star={star} type="misc" />)}
      </div>
      {flowTypes.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 border-t border-stone-200/70 pt-1">
          {flowTypes.includes('decadal') && <FlowBadge label="限" value="" className="bg-purple-100 text-purple-600" />}
          {flowTypes.includes('yearly') && <FlowBadge label="年" value="" className="bg-blue-100 text-blue-600" />}
          {flowTypes.includes('monthly') && <FlowBadge label="月" value="" className="bg-green-100 text-green-600" />}
          {flowTypes.includes('daily') && <FlowBadge label="日" value="" className="bg-orange-100 text-orange-600" />}
        </div>
      )}
      {palace.神煞?.length ? <div className="mt-1 text-[10px] text-stone-500">神煞：{palace.神煞.join('、')}</div> : null}
    </button>
  );
};

const ZiweiGrid: React.FC<Props> = ({ data }) => {
  const canonical = data.taibuJson as CanonicalChart | undefined;
  const palaces = canonical?.十二宫位 || [];
  const basic = canonical?.基本信息 || {};
  const lifePalace = palaces.find((item) => item.宫位 === '命宫');
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null | undefined>(undefined);
  const [showMisc, setShowMisc] = useState(true);
  const [selectedDecadalIndex, setSelectedDecadalIndex] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const astrolabe = useMemo(() => {
    if (!data.calcInput) return null;
    try {
      return calculateZiweiDataWithAstrolabe(data.calcInput as any).astrolabe;
    } catch {
      return null;
    }
  }, [data.calcInput]);

  const getHoroscope = (date: Date): HoroscopeJson | null => {
    if (!astrolabe) return null;
    try {
      return toZiweiHoroscopeJson(
        calculateZiweiHoroscopeDataWithAstrolabe(astrolabe, { targetDate: date }),
        { detailLevel: 'full' },
      ) as HoroscopeJson;
    } catch {
      return null;
    }
  };

  const birthYear = Number(String(basic.阳历 || data.base_info.gongli).match(/\d{4}/)?.[0] || new Date().getFullYear());
  const decadalList = useMemo(() => palaces
    .map((palace) => {
      const match = palace.大限?.match(/(\d+)[~-](\d+)/u);
      if (!match || typeof palace.宫位索引 !== 'number') return null;
      return {
        palace,
        index: palace.宫位索引,
        startAge: Number(match[1]),
        endAge: Number(match[2]),
        ganZhi: palace.干支,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => left.startAge - right.startAge), [palaces]);

  const selectedDecadal = decadalList.find((item) => item.index === selectedDecadalIndex) || null;
  const displayDecadal = selectedDecadal || decadalList[0] || null;
  const yearlyList = useMemo(() => {
    if (!displayDecadal) return [];
    return Array.from({ length: displayDecadal.endAge - displayDecadal.startAge + 1 }, (_, index) => {
      const year = birthYear + displayDecadal.startAge + index;
      const horoscope = getHoroscope(new Date(year, 5, 15));
      const yearly = horoscope?.运限叠宫?.find((item) => item.层次 === '流年');
      return {
        year,
        ganZhi: yearly?.干支 || ganzhiYear(year),
        palaceIndex: yearly?.宫位索引,
      };
    });
  }, [birthYear, displayDecadal, astrolabe]);

  const monthlyList = useMemo(() => {
    if (!selectedYear) return [];
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const horoscope = getHoroscope(new Date(selectedYear, index, 15));
      const monthly = horoscope?.运限叠宫?.find((item) => item.层次 === '流月');
      return { month, ganZhi: monthly?.干支 || '', palaceIndex: monthly?.宫位索引 };
    });
  }, [selectedYear, astrolabe]);

  const dailyList = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    return Array.from({ length: daysInMonth(selectedYear, selectedMonth) }, (_, index) => {
      const day = index + 1;
      const horoscope = getHoroscope(new Date(selectedYear, selectedMonth - 1, day));
      const daily = horoscope?.运限叠宫?.find((item) => item.层次 === '流日');
      return { day, ganZhi: daily?.干支 || '', palaceIndex: daily?.宫位索引 };
    });
  }, [selectedYear, selectedMonth, astrolabe]);

  const activePalaceIndex = selectedPalaceIndex === undefined ? lifePalace?.宫位索引 ?? null : selectedPalaceIndex;
  const squareIndexes = activePalaceIndex === null || activePalaceIndex === undefined ? [] : triangleSquare(activePalaceIndex);
  const flowIndexes = {
    decadal: selectedDecadal?.index,
    yearly: yearlyList.find((item) => item.year === selectedYear)?.palaceIndex,
    monthly: monthlyList.find((item) => item.month === selectedMonth)?.palaceIndex,
    daily: dailyList.find((item) => item.day === selectedDay)?.palaceIndex,
  };
  const palaceByBranch = (index: number) => palaces.find((item) => branchIndex(item.干支?.slice(-1) || '') === index);

  if (!canonical) {
    return <div className="mx-auto my-6 max-w-3xl rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-500">紫微排盘数据格式异常</div>;
  }

  return (
    <div className="mx-auto my-6 w-full max-w-6xl rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex justify-end gap-2">
        <button type="button" onClick={() => setShowMisc((value) => !value)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
          {showMisc ? '隐藏杂曜' : '显示杂曜'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {GRID_LAYOUT.map((row, rowIndex) => row.map((branch, colIndex) => {
          if (branch === -1) {
            if (rowIndex === 1 && colIndex === 1) {
              const pillars = String(basic.四柱 || '').split(/\s+/);
              return (
                <div key="center" className="col-span-2 row-span-2 flex flex-col justify-center rounded-lg border border-stone-200 bg-white p-3 text-center">
                  <div className="mb-3 grid grid-cols-4 gap-2 text-xs">
                    {['年柱', '月柱', '日柱', '时柱'].map((label, index) => {
                      const value = pillars[index] || data.base_info.gongli?.split(' ')[index] || '';
                      return (
                        <div key={label}>
                          <div className="text-stone-400">{label}</div>
                          <div className="text-base font-bold">
                            <span className={getWuxingColor(value.charAt(0))}>{value.charAt(0) || '*'}</span>
                            <span className={getWuxingColor(value.charAt(1))}>{value.charAt(1) || '*'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-stone-100 py-2 text-sm text-stone-700">
                    <div>阳历 {basic.阳历 || data.base_info.gongli}</div>
                    <div>农历 {basic.农历 || data.base_info.nongli}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>命主：<span className="font-bold text-purple-600">{basic.命主 || data.base_info.mingzhu}</span></div>
                    <div>身主：<span className="font-bold">{basic.身主 || data.base_info.shenzhu}</span></div>
                    <div>命宫：<span className="text-blue-600">{data.base_info.minggong}</span></div>
                    <div>身宫：<span className="text-orange-500">{data.base_info.shengong}</span></div>
                  </div>
                  {basic.真太阳时 && <div className="mt-2 text-xs text-blue-600">真太阳时 {basic.真太阳时.真太阳时}</div>}
                  <div className="mt-2"><span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">{basic.五行局 || data.base_info.mingju}</span></div>
                </div>
              );
            }
            return null;
          }
          const palace = palaceByBranch(branch);
          if (!palace || typeof palace.宫位索引 !== 'number') return null;
          const flowTypes = Object.entries(flowIndexes).filter(([, value]) => value === palace.宫位索引).map(([key]) => key);
          return (
            <PalaceCard
              key={`${branch}-${palace.宫位}`}
              palace={palace}
              selected={activePalaceIndex === palace.宫位索引}
              square={squareIndexes.includes(palace.宫位索引) && activePalaceIndex !== palace.宫位索引}
              flowTypes={flowTypes}
              showMisc={showMisc}
              onClick={() => setSelectedPalaceIndex(activePalaceIndex === palace.宫位索引 ? null : palace.宫位索引)}
            />
          );
        }))}
      </div>

      <div className="mt-5 space-y-4 border-t border-stone-100 pt-4">
        <section>
          <div className="mb-2 text-sm font-bold text-stone-800">大限</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {decadalList.map((item) => (
              <button key={item.index} type="button" onClick={() => {
                setSelectedDecadalIndex((current) => current === item.index ? null : item.index);
                setSelectedYear(null);
                setSelectedMonth(null);
                setSelectedDay(null);
              }} className={`shrink-0 rounded-lg border px-3 py-2 text-center ${selectedDecadalIndex === item.index ? 'border-blue-500 bg-blue-500 text-white' : 'border-stone-200 bg-white text-stone-700'}`}>
                <div className="text-xs">{item.palace.宫位}</div>
                <div className="text-sm font-bold">{item.ganZhi}</div>
                <div className="text-[10px] opacity-70">{item.startAge}-{item.endAge}岁</div>
              </button>
            ))}
          </div>
        </section>

        {displayDecadal && (
          <section>
            <div className="mb-2 text-sm font-bold text-stone-800">流年</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {yearlyList.map((item) => (
                <button key={item.year} type="button" onClick={() => {
                  setSelectedYear((current) => current === item.year ? null : item.year);
                  setSelectedMonth(null);
                  setSelectedDay(null);
                }} className={`shrink-0 rounded-lg border px-3 py-2 text-center ${selectedYear === item.year ? 'border-blue-500 bg-blue-500 text-white' : 'border-stone-200 bg-white text-stone-700'}`}>
                  <div className="text-xs">{item.year}</div>
                  <div className="text-sm font-bold">{item.ganZhi}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedYear && (
          <section>
            <div className="mb-2 text-sm font-bold text-stone-800">{selectedYear}年流月</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {monthlyList.map((item) => (
                <button key={item.month} type="button" onClick={() => {
                  setSelectedMonth((current) => current === item.month ? null : item.month);
                  setSelectedDay(null);
                }} className={`shrink-0 rounded-lg border px-3 py-2 text-center ${selectedMonth === item.month ? 'border-blue-500 bg-blue-500 text-white' : 'border-stone-200 bg-white text-stone-700'}`}>
                  <div className="text-xs">{item.month}月</div>
                  <div className="text-sm font-bold">{item.ganZhi || '-'}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedMonth && (
          <section>
            <div className="mb-2 text-sm font-bold text-stone-800">{selectedYear}年{selectedMonth}月流日</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dailyList.map((item) => (
                <button key={item.day} type="button" onClick={() => setSelectedDay((current) => current === item.day ? null : item.day)} className={`shrink-0 rounded-lg border px-3 py-2 text-center ${selectedDay === item.day ? 'border-blue-500 bg-blue-500 text-white' : 'border-stone-200 bg-white text-stone-700'}`}>
                  <div className="text-xs">{item.day}日</div>
                  <div className="text-sm font-bold">{item.ganZhi || '-'}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ZiweiGrid;
