
import React from 'react';
import { LiuyaoResponse, LiuyaoGuaInfo } from '../types';
import { getWuxingColor } from '../utils/wuxing';

interface Props {
  data: LiuyaoResponse;
}

const YaoLine = ({ 
  index, 
  isYang, 
  liuqin, 
  liushen, 
  isShi, 
  isYing, 
  fushen,
  isBian,
  bianLiuqin,
  bianIsYang
}: any) => {
  const textColor = getWuxingColor(liuqin);
  const bianColor = getWuxingColor(bianLiuqin);

  return (
    <div className="flex items-center gap-0 h-10 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors px-2">
       {/* 1. Liushen (Six Gods) - Fixed width, always rendered to maintain structure */}
       <div className="w-12 shrink-0 text-xs text-stone-500 font-bold text-center">
          {liushen || ''}
       </div>

       {/* 2. Fushen (Hidden Spirit) */}
       <div className="w-20 shrink-0 text-[10px] text-stone-400 text-right pr-2">
         {fushen && (
           <span className={`${getWuxingColor(fushen)}`}>{fushen}</span>
         )}
       </div>

       {/* 3. Liuqin (Six Relatives) */}
       <div className={`w-28 shrink-0 text-sm font-serif font-bold text-center ${textColor}`}>
          {liuqin}
       </div>

       {/* 4. The Line Graphic (Main) */}
       <div className="w-20 shrink-0 flex justify-center items-center px-1">
          {isYang ? (
            <div className="w-full h-3 bg-stone-800 rounded-sm"></div>
          ) : (
            <div className="w-full h-3 flex justify-between">
              <div className="w-[45%] h-full bg-stone-800 rounded-sm"></div>
              <div className="w-[45%] h-full bg-stone-800 rounded-sm"></div>
            </div>
          )}
       </div>

       {/* 5. Shi/Ying Marker */}
       <div className="w-10 shrink-0 flex justify-center">
          {isShi && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold">世</span>}
          {isYing && <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded font-bold">应</span>}
       </div>

       {/* 6. Transformation Indicator */}
       <div className="w-12 shrink-0 flex justify-center text-stone-300">
          {isBian !== undefined ? '→' : ''}
       </div>

       {/* 7. Changed Line Graphic */}
       {isBian !== undefined ? (
         <div className="w-20 shrink-0 flex justify-center items-center px-1 opacity-80">
            {bianIsYang ? (
              <div className="w-full h-3 bg-stone-600 rounded-sm"></div>
            ) : (
              <div className="w-full h-3 flex justify-between">
                <div className="w-[45%] h-full bg-stone-600 rounded-sm"></div>
                <div className="w-[45%] h-full bg-stone-600 rounded-sm"></div>
              </div>
            )}
         </div>
       ) : (
         <div className="w-20 shrink-0" />
       )}

       {/* 8. Changed Liuqin */}
       {isBian !== undefined ? (
         <div className={`w-28 shrink-0 text-sm font-serif text-center opacity-80 ${bianColor}`}>
            {bianLiuqin}
         </div>
       ) : (
         <div className="w-28 shrink-0" />
       )}
    </div>
  );
};

const LiuyaoGrid: React.FC<Props> = ({ data }) => {
  const { gua_info, sizhu_info, shensha_info, kongwang } = data;
  const ben = gua_info.bengua;
  const bian = gua_info.biangua;

  // Prepare Lines Data (6 down to 1)
  const lines = [6, 5, 4, 3, 2, 1].map(i => {
    const key = `gua_yao${i}`;
    const benIdx = 6 - i;
    const isYangBen = ben.gua_mark[benIdx] === '1'; 
    const isYangBian = bian ? bian.gua_mark[benIdx] === '1' : undefined;

    return {
      index: i,
      isYang: isYangBen,
      isYangBian: isYangBian,
      liuqin: (ben.gua_yao_info.liuqin as any)[key],
      liushen: (ben.gua_yao_info.liushen as any)[key],
      liuqinBian: bian ? (bian.gua_yao_info.liuqin as any)[key] : '',
      isShi: ben.gua_yao_info.shiying.shi_yao_position === i.toString(),
      isYing: ben.gua_yao_info.shiying.ying_yao_position === i.toString(),
      fushen: ben.gua_yao_info.fushen?.has_fushen === '1' 
        ? ben.gua_yao_info.fushen.fushen_arr.find(f => f.fushen_yao_position === i.toString())?.fushen 
        : null
    };
  });

  return (
    <div className="w-full max-w-4xl mx-auto my-6 bg-white p-6 rounded-xl shadow-lg border border-stone-200 overflow-x-auto">
      
      {/* Header Info */}
      <div className="flex flex-wrap justify-between items-center mb-6 bg-stone-50 p-3 rounded-lg text-sm text-stone-600 border border-stone-100">
         <div className="flex gap-6">
            <span className="font-serif font-bold text-stone-800">{sizhu_info.year_gan}{sizhu_info.year_zhi}年 {sizhu_info.month_gan}{sizhu_info.month_zhi}月 {sizhu_info.day_gan}{sizhu_info.day_zhi}日</span>
            <span className="font-bold text-red-700 bg-red-50 px-2 rounded">旬空: {kongwang}</span>
         </div>
         <div className="flex gap-4 text-xs font-semibold">
            <span className="text-blue-700">驿马:{shensha_info.yima}</span>
            <span className="text-pink-700">桃花:{shensha_info.taohua}</span>
            <span className="text-amber-800">贵人:{shensha_info.guiren}</span>
            <span className="text-emerald-800">日禄:{shensha_info.rilu}</span>
         </div>
      </div>

      <div className="flex justify-between items-end px-8 mb-4">
         <div className="text-center w-[200px]">
            <div className="text-xs text-stone-400 font-bold uppercase mb-1">本卦</div>
            <div className="font-bold text-2xl text-stone-800 border-b-2 border-stone-800 pb-1">{ben.gua_name}</div>
            <div className="text-xs text-stone-500 mt-1">{ben.gua_gong}</div>
         </div>
         {bian && (
            <div className="text-center w-[200px]">
              <div className="text-xs text-stone-400 font-bold uppercase mb-1">变卦</div>
              <div className="font-bold text-2xl text-stone-600 border-b-2 border-stone-400 pb-1">{bian.gua_name}</div>
              <div className="text-xs text-stone-400 mt-1">{bian.gua_gong}</div>
            </div>
         )}
      </div>

      {/* Hexagram Lines Container */}
      <div className="border border-stone-200 rounded-lg overflow-hidden bg-white mb-6 min-w-[600px]">
         <div className="bg-stone-50 flex text-[10px] font-bold text-stone-400 py-1 px-2 border-b border-stone-200">
            <div className="w-12 text-center">六神</div>
            <div className="w-20 text-right pr-2">伏神</div>
            <div className="w-28 text-center">本卦爻象</div>
            <div className="w-20 text-center">卦画</div>
            <div className="w-10 text-center">世应</div>
            <div className="w-12 text-center">动</div>
            <div className="w-20 text-center">变画</div>
            <div className="w-28 text-center">变卦爻象</div>
         </div>
         {lines.map(line => (
           <YaoLine 
             key={line.index}
             index={line.index}
             isYang={line.isYang}
             liuqin={line.liuqin}
             liushen={line.liushen}
             isShi={line.isShi}
             isYing={line.isYing}
             fushen={line.fushen}
             isBian={line.isYangBian}
             bianLiuqin={line.liuqinBian}
             bianIsYang={line.isYangBian}
           />
         ))}
      </div>

      <div className="mt-4 text-sm text-stone-600 bg-amber-50 p-4 rounded-lg border border-amber-100">
         <div className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <span className="text-lg">📜</span> 卦辞详情:
         </div>
         <div className="italic text-stone-700 leading-relaxed">"{ben.gua_qian}"</div>
         <div className="mt-3 text-xs text-stone-500 border-t border-amber-200/50 pt-2">
           <span className="font-bold">决策参考: </span>{ben.gua_description.gua_juece}
         </div>
      </div>

    </div>
  );
};

export default LiuyaoGrid;
