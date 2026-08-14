
import React, { useMemo } from 'react';
import { QimenResponse, PalaceData } from '../types';
import { getWuxingColor } from '../utils/wuxing';
import { ChartMasthead, ChartSectionTitle, ChartSurface, ElementBadge, FourPillarsStrip } from './DivinationVisualSystem';

interface Props {
  data: QimenResponse;
}

const GRID_ORDER = [
  '巽', '离', '坤',
  '震', '中', '兑',
  '艮', '坎', '乾'
];

const PALACE_NUMBERS: Record<string, number> = {
  '坎': 1, '坤': 2, '震': 3, '巽': 4, '中': 5, '乾': 6, '兑': 7, '艮': 8, '离': 9
};

const BAGUA_MAP: Record<string, string> = {
  '坎': '☵', '坤': '☷', '震': '☳', '巽': '☴', '中': '', '乾': '☰', '兑': '☱', '艮': '☶', '离': '☲'
};

const PALACE_BY_NUMBER: Record<number, string> = Object.entries(PALACE_NUMBERS).reduce(
  (acc, [key, value]) => {
    acc[value] = key;
    return acc;
  },
  {} as Record<number, string>
);
PALACE_BY_NUMBER[0] = '中';

const LIST_INDEX_MAP = ['坎', '艮', '震', '巽', '离', '坤', '兑', '乾', '中'];

const getCornerClass = (index: number) => {
  if (index === 0) return 'rounded-tl-[23px]';
  if (index === 2) return 'rounded-tr-[23px]';
  if (index === 6) return 'rounded-bl-[23px]';
  if (index === 8) return 'rounded-br-[23px]';
  return '';
};

const QimenGrid: React.FC<Props> = ({ data }) => {
  
  const gridCells = useMemo(() => {
    const map: Record<string, PalaceData> = {};
    const pending: PalaceData[] = [];

    const isCenterCandidate = (item: PalaceData) => {
      const hasStar = Boolean(item.tianpan?.jiuxing);
      const hasDoor = Boolean(item.renpan?.bamen);
      const hasDeity = Boolean(item.shenpan?.bashen);
      const isCenterDoor = item.renpan?.bamen === '中门';
      return isCenterDoor || (!hasStar && !hasDoor && !hasDeity);
    };

    data.gong_pan.forEach((item: any) => {
      if (!map['中'] && isCenterCandidate(item)) {
        map['中'] = item as PalaceData;
      }
    });
    
    data.gong_pan.forEach((item: any, index: number) => {
      let keyByList = '';
      if (LIST_INDEX_MAP[index]) {
        keyByList = LIST_INDEX_MAP[index];
      }

      let keyByIndex = '';
      if (item.gong_pan_index !== undefined && item.gong_pan_index !== null) {
        const rawIndex =
          typeof item.gong_pan_index === 'number'
            ? item.gong_pan_index
            : Number.parseInt(String(item.gong_pan_index), 10);
        if (!Number.isNaN(rawIndex)) {
          keyByIndex = PALACE_BY_NUMBER[rawIndex] || '';
        }
      }

      if (keyByIndex && !map[keyByIndex] && keyByIndex !== '中') {
        map[keyByIndex] = item as PalaceData;
        return;
      }

      const desc = item.description?.luo_gong_desc || "";
      let keyByDesc = "";
      for (const k of GRID_ORDER) {
        if (desc.includes(k) || (k === '中' && (desc.includes('中宫') || desc.includes('中门')))) {
          keyByDesc = k;
          break;
        }
      }

      if (keyByDesc && !map[keyByDesc]) {
        map[keyByDesc] = item as PalaceData;
        return;
      }

      if (keyByList && !map[keyByList] && keyByList !== '中') {
        map[keyByList] = item as PalaceData;
        return;
      }

      pending.push(item as PalaceData);
    });

    const missing = GRID_ORDER.filter(key => !map[key]);
    missing.forEach((key, index) => {
      if (pending[index]) {
        map[key] = pending[index];
      }
    });
    
    return GRID_ORDER.map(key => ({ key, data: map[key] }));
  }, [data]);

  const pillars = [
    { label: '年', value: `${data.sizhu_info.year_gan}${data.sizhu_info.year_zhi}` },
    { label: '月', value: `${data.sizhu_info.month_gan}${data.sizhu_info.month_zhi}` },
    { label: '日', value: `${data.sizhu_info.day_gan}${data.sizhu_info.day_zhi}` },
    { label: '时', value: `${data.sizhu_info.hour_gan}${data.sizhu_info.hour_zhi}` },
  ];

  const dunInfo = `${data.dunju} · ${data.xunshou}`;
  const zhifuInfo = `值符: ${data.zhifu_info?.zhifu_name || '-'}   值使: ${data.zhifu_info?.zhishi_name || '-'}`;

  return (
    <div className="glass-panel mx-auto my-6 w-full max-w-5xl select-none overflow-hidden rounded-[28px] border border-white/75">
      <div className="p-4 md:p-6">
        <ChartMasthead
          title="奇门遁甲"
          subtitle={`${dunInfo} · ${data.panlei || data.dingju || '转盘奇门'}`}
          date={data.gongli}
          meta={data.nongli}
          symbol="☷"
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <FourPillarsStrip pillars={pillars.map((pillar) => pillar.value)} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['值符', data.zhifu_info?.zhifu_name, '金'],
              ['值使', data.zhifu_info?.zhishi_name, '木'],
              ['旬首', data.xunshou, '水'],
              ['空马', `${data.kongwang_info?.kongwang_name || '—'} · ${data.maxing_info?.maxing_name || '—'}`, '火'],
            ].map(([label, value, element]) => (
              <div key={label} className="rounded-[15px] border border-stone-200/70 bg-white/52 px-2 py-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-stone-400"><ElementBadge value={element} />{label}</div>
                <div className="mt-1 truncate font-['STKaiti','KaiTi','Songti_SC','serif'] text-base font-bold text-stone-800">{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        <ChartSurface className="relative mt-5 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(249,239,210,0.65),rgba(255,255,255,0.45)_62%)]">
          <ChartSectionTitle title="九宫遁甲盘" note={`${zhifuInfo} · 上天盘 / 下地盘`} />
          <div className="pointer-events-none absolute inset-[12%] rotate-45 border border-amber-700/10" />
          <div className="relative grid grid-cols-3 gap-px overflow-hidden rounded-[22px] border border-amber-900/30 bg-stone-300/70 shadow-[0_18px_40px_rgba(28,25,23,0.07)]">
            {gridCells.map((cell, idx) => {
              const pData = cell.data;
              const cornerClass = getCornerClass(idx);
              if (!pData) return <div key={idx} className={`min-h-[148px] bg-white/55 md:min-h-[180px] ${cornerClass}`}></div>;

              const isKong = pData.is_kongwang == 1 || pData.is_kongwang == '1';
              const isMa = pData.is_maxing == 1 || pData.is_maxing == '1';
              const palaceColor = getWuxingColor(cell.key);

              const tpStem = pData.tianpan?.sanqiliuyi || '';
              const dpStem = pData.dipan?.sanqiliuyi || '';
              const tpColor = getWuxingColor(tpStem);
              const dpColor = getWuxingColor(dpStem);

              const bashen = pData.shenpan?.bashen || '';
              const bashenLabel = bashen === '值符' ? `○${bashen}` : bashen;
              const bashenStyle =
                bashen === '值符' ? 'text-blue-600' : 'text-stone-700';

              return (
                <div
                  key={idx}
                  className={`relative min-h-[148px] bg-white/80 px-2 py-2 font-['STKaiti','KaiTi','Songti_SC','serif'] text-stone-900 md:min-h-[180px] md:p-3 ${cornerClass}`}
                >
                  <div className="absolute left-2 top-2 flex items-center gap-1 text-[9px] text-stone-400 md:left-3 md:top-3 md:text-xs">
                    <span className={`font-bold ${palaceColor}`}>
                      {cell.key}{PALACE_NUMBERS[cell.key] || ''}宫
                    </span>
                    <span className="hidden text-base text-stone-300 md:inline">{BAGUA_MAP[cell.key]}</span>
                  </div>

                  <div className="absolute right-2 top-2 max-w-[42px] truncate text-[9px] font-semibold md:right-3 md:top-3 md:max-w-none md:text-sm">
                    <span className={bashenStyle}>{bashenLabel || ''}</span>
                  </div>

                  <div className="absolute left-2 top-8 flex flex-col items-start gap-0.5 text-base md:left-3 md:top-11 md:text-2xl">
                    <span className={`${tpColor} font-bold`}>
                      {tpStem || '-'}
                    </span>
                    <span className="hidden font-sans text-[10px] text-stone-400 md:inline">天盘</span>
                  </div>

                  <div className="absolute bottom-2 left-2 flex flex-col items-start gap-0.5 text-base md:bottom-3 md:left-3 md:text-2xl">
                    <span className={`${dpColor} font-bold`}>
                      {dpStem || '-'}
                    </span>
                    <span className="hidden font-sans text-[10px] text-stone-400 md:inline">地盘</span>
                  </div>

                  <div className="absolute inset-x-5 top-[38%] flex flex-col items-center gap-0.5 md:inset-x-0 md:top-[31%]">
                    <span className="max-w-full truncate text-xs font-semibold text-stone-600 md:text-xl">
                      {pData.tianpan?.jiuxing || '-'}
                    </span>
                    <span
                      className={`text-xl font-bold md:text-3xl ${
                        ['开', '休', '生'].includes(pData.renpan?.bamen)
                          ? 'text-emerald-600'
                          : ['死', '惊', '伤'].includes(pData.renpan?.bamen)
                            ? 'text-red-600'
                            : 'text-stone-900'
                      }`}
                    >
                      {pData.renpan?.bamen || '-'}
                    </span>
                    <span className="hidden font-sans text-[8px] tracking-widest text-stone-400 md:inline">星 · 门</span>
                  </div>

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl text-stone-900 opacity-[0.025] md:text-8xl md:opacity-[0.035]">
                    {BAGUA_MAP[cell.key]}
                  </div>

                  {isKong && (
                    <div className="absolute right-2 top-2 translate-y-6 rounded-full border border-stone-300/70 bg-white/70 px-1 text-[9px] text-stone-400 backdrop-blur-md md:right-3 md:top-3">
                      空
                    </div>
                  )}

                  {isMa && (
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold text-red-600 md:bottom-3 md:right-3 md:text-xs">
                      马
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ChartSurface>
      </div>
    </div>
  );
};

export default QimenGrid;
