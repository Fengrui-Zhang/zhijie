
import React, { useMemo } from 'react';
import { QimenResponse, PalaceData } from '../types';
import { getWuxingColor } from '../utils/wuxing';

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
    <div className="w-full max-w-4xl mx-auto my-6 select-none">
      <div className="rounded-2xl border border-stone-200 bg-white shadow-lg">
        <div className="px-5 py-4 border-b border-stone-200">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 text-stone-800">
              {pillars.map((pillar) => (
                <div key={pillar.label} className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{pillar.label}</span>
                  <span className="text-2xl font-semibold tracking-wider text-stone-800">
                    {pillar.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-right text-sm text-stone-600 leading-snug">
              <div className="font-semibold text-stone-700">{dunInfo}</div>
              <div className="text-stone-500">{zhifuInfo}</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-stone-400">
            {data.gongli} · {data.nongli}
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-3 gap-0 border border-stone-800 bg-stone-800">
            {gridCells.map((cell, idx) => {
              const pData = cell.data;
              if (!pData) return <div key={idx} className="bg-white min-h-[170px]"></div>;

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
                  className="relative bg-white min-h-[170px] border border-stone-800 px-2 py-2 font-['STKaiti','KaiTi','Songti_SC','serif'] text-stone-900"
                >
                  <div className="absolute left-2 top-2 text-xs text-stone-400">
                    <span className={`font-semibold ${palaceColor}`}>
                      {cell.key}
                    </span>
                  </div>

                  <div className="absolute right-2 top-2 text-sm font-semibold">
                    <span className={bashenStyle}>{bashenLabel || ''}</span>
                  </div>

                  <div className="absolute left-2 top-10 flex flex-col items-start gap-1 text-lg">
                    <span className={`${tpColor} font-semibold`}>
                      {tpStem || '-'}
                    </span>
                    <span className="text-[11px] text-stone-400">天盘</span>
                  </div>

                  <div className="absolute left-2 bottom-3 flex flex-col items-start gap-1 text-lg">
                    <span className={`${dpColor} font-semibold`}>
                      {dpStem || '-'}
                    </span>
                    <span className="text-[11px] text-stone-400">地盘</span>
                  </div>

                  <div className="absolute inset-x-0 top-[34%] flex flex-col items-center gap-1">
                    <span className="text-xl font-semibold">
                      {pData.tianpan?.jiuxing || '-'}
                    </span>
                    <span
                      className={`text-2xl font-bold ${
                        ['开', '休', '生'].includes(pData.renpan?.bamen)
                          ? 'text-emerald-600'
                          : 'text-stone-900'
                      }`}
                    >
                      {pData.renpan?.bamen || '-'}
                    </span>
                  </div>

                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-6xl text-stone-900 opacity-[0.03]">
                    {BAGUA_MAP[cell.key]}
                  </div>

                  {isKong && (
                    <div className="absolute top-2 right-2 translate-y-6 rounded-full border border-stone-300 bg-white px-1 text-[10px] text-stone-400">
                      空
                    </div>
                  )}

                  {isMa && (
                    <div className="absolute bottom-2 right-2 text-xs text-red-600">
                      马
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QimenGrid;
