
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

const QimenGrid: React.FC<Props> = ({ data }) => {
  
  const gridCells = useMemo(() => {
    const map: Record<string, PalaceData> = {};
    
    data.gong_pan.forEach((item: any) => {
      const desc = item.description?.luo_gong_desc || "";
      let key = "";
      for (const k of GRID_ORDER) {
        if (desc.includes(k) || (k === '中' && (desc.includes('中宫') || desc.includes('中门')))) {
          key = k;
          break;
        }
      }
      if (key) {
        map[key] = item as PalaceData;
      }
    });
    
    return GRID_ORDER.map(key => ({ key, data: map[key] }));
  }, [data]);

  return (
    <div className="w-full max-w-2xl mx-auto my-6 select-none">
      <div className="grid grid-cols-3 gap-0.5 bg-stone-900 border-2 border-stone-900 shadow-2xl rounded overflow-hidden">
        {gridCells.map((cell, idx) => {
            const pData = cell.data;
            if (!pData) return <div key={idx} className="bg-stone-100 min-h-[140px]"></div>;

            const isKong = pData.is_kongwang == 1 || pData.is_kongwang == "1";
            const isMa = pData.is_maxing == 1 || pData.is_maxing == "1";
            const palaceColor = getWuxingColor(cell.key);
            
            // Stems
            const tpStem = pData.tianpan?.sanqiliuyi || '';
            const dpStem = pData.dipan?.sanqiliuyi || '';
            const tpColor = getWuxingColor(tpStem);
            const dpColor = getWuxingColor(dpStem);

            return (
              <div key={idx} className="relative bg-[#fdfbf7] p-1 min-h-[140px] flex flex-col hover:bg-white transition-colors">
                
                {/* 1. Header: Deity (Center Top) */}
                <div className="flex justify-center items-start h-6">
                   <span className={`text-sm font-bold ${pData.shenpan?.bashen === '值符' ? 'text-amber-600' : 'text-stone-800'}`}>
                     {pData.shenpan?.bashen || ''}
                   </span>
                </div>

                {/* 2. Body: Star (Left) vs Door (Right) */}
                <div className="flex justify-between items-center flex-1 px-2">
                   {/* Left: Star */}
                   <div className="flex flex-col items-center w-1/2 border-r border-stone-100/50">
                      <span className="text-[10px] text-stone-400 scale-90 mb-0.5">星</span>
                      <span className={`font-semibold text-indigo-900 ${pData.tianpan?.jiuxing === '天禽' ? 'text-amber-700' : ''}`}>
                        {pData.tianpan?.jiuxing || '-'}
                      </span>
                   </div>

                   {/* Right: Door */}
                   <div className="flex flex-col items-center w-1/2">
                      <span className="text-[10px] text-stone-400 scale-90 mb-0.5">门</span>
                      <span className={`font-semibold ${['开','休','生'].includes(pData.renpan?.bamen) ? 'text-red-700' : 'text-stone-600'}`}>
                        {pData.renpan?.bamen || '-'}
                      </span>
                   </div>
                </div>

                {/* 3. Footer: Stems (Center Bottom) */}
                <div className="mt-2 flex flex-col items-center justify-center bg-stone-50/50 rounded py-1">
                   <div className="flex items-center gap-2 text-lg leading-none">
                      {/* Tianpan */}
                      <div className={`font-bold relative ${tpColor}`}>
                        {tpStem}
                        {/* Parasitic Stem */}
                        {pData.tianpan?.jiuxing_tianqin_sanqiliuyi && (
                          <span className="absolute -top-2 -right-2 text-[10px] text-stone-400 scale-75">
                            {pData.tianpan.jiuxing_tianqin_sanqiliuyi}
                          </span>
                        )}
                      </div>
                      <span className="text-stone-300 text-xs">|</span>
                      {/* Dipan */}
                      <div className={`font-bold relative ${dpColor}`}>
                        {dpStem}
                         {pData.dipan?.jiuxing_tianqin_sanqiliuyi && (
                          <span className="absolute -top-2 -right-2 text-[10px] text-stone-400 scale-75">
                            {pData.dipan.jiuxing_tianqin_sanqiliuyi}
                          </span>
                        )}
                      </div>
                   </div>
                </div>

                {/* Decorations / Status */}
                
                {/* Palace Name & Number (Bottom Left) */}
                <div className={`absolute bottom-0.5 left-1 text-[10px] font-bold flex gap-0.5 ${palaceColor}`}>
                   <span>{cell.key}</span>
                   <span className="text-stone-300 font-normal">{PALACE_NUMBERS[cell.key]}</span>
                </div>

                {/* Bagua Icon (Background Watermark) */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl text-stone-900 opacity-[0.03] pointer-events-none font-serif">
                   {BAGUA_MAP[cell.key]}
                </div>
                
                {/* Kong Wang (Empty) */}
                {isKong && (
                  <div className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center bg-stone-100 rounded-bl text-[10px] text-stone-400 border-l border-b border-stone-200" title="空亡">
                    ⭕
                  </div>
                )}
                
                {/* Ma Xing (Horse Star) */}
                {isMa && (
                   <div className="absolute bottom-0 right-0 w-5 h-5 flex items-center justify-center text-blue-600 font-bold text-xs" title="马星">
                      🐴
                   </div>
                )}

              </div>
            );
        })}
      </div>
    </div>
  );
};

export default QimenGrid;
