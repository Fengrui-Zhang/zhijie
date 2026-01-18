
import React from 'react';
import { MeihuaResponse, GuaDetails } from '../types';
import { getWuxingColor } from '../utils/wuxing';

interface Props {
  data: MeihuaResponse;
}

// Helper to draw hexagram lines
const HexagramSymbol = ({ mark }: { mark: string }) => {
  const lines = mark.split('').map(m => m === '1'); // 1=Yang, 0=Yin
  
  return (
    <div className="flex flex-col gap-1 w-12 my-2">
      {/* Draw top to bottom, assume string is Top->Bottom or standard */}
      {lines.map((isYang, i) => (
        <div key={i} className="h-2 w-full flex justify-between">
           {isYang ? (
             <div className="w-full bg-stone-800 h-full rounded-sm"></div>
           ) : (
             <>
               <div className="w-[45%] bg-stone-800 h-full rounded-sm"></div>
               <div className="w-[45%] bg-stone-800 h-full rounded-sm"></div>
             </>
           )}
        </div>
      ))}
    </div>
  );
};

const GuaCard = ({ title, gua }: { title: string, gua: GuaDetails }) => {
  if (!gua || !gua.gua_name) return null;

  // Try to determine color from Name (e.g., Qian, Dui = Metal)
  // This is a heuristic based on the presence of Trigram names in the Hexagram name
  // or assuming the user wants to see the element of the main trigrams. 
  // Since we only have the composite name, we color the name if it contains keywords.
  const nameColor = getWuxingColor(gua.gua_name);

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded shadow-sm border border-stone-200 min-w-[100px]">
      <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">{title}</div>
      <HexagramSymbol mark={gua.gua_mark} />
      <div className={`font-bold text-lg mt-2 ${nameColor}`}>{gua.gua_name}</div>
      <div className="text-xs text-stone-500 mt-1">{gua.gua_xiongji}</div>
      <div className="text-[10px] text-stone-400 mt-2 text-center line-clamp-2" title={gua.gua_qian}>
        {gua.gua_qian}
      </div>
    </div>
  );
};

const MeihuaGrid: React.FC<Props> = ({ data }) => {
  const { gua_info, dongyao, sizhu_info } = data;

  return (
    <div className="w-full max-w-2xl mx-auto my-6">
       {/* Four Pillars Visualization for Meihua */}
       <div className="grid grid-cols-4 gap-2 mb-6 bg-stone-50 p-3 rounded text-center">
         {['year', 'month', 'day', 'hour'].map((t, i) => {
            const k = t as keyof typeof sizhu_info;
            // The API for Meihua returns flattened sizhu_info keys like year_gan, year_zhi
            const gan = (sizhu_info as any)[`${t}_gan`];
            const zhi = (sizhu_info as any)[`${t}_zhi`];
            return (
               <div key={i} className="flex flex-col items-center">
                  <div className="text-[10px] text-stone-400 uppercase">{t}</div>
                  <div className="font-bold font-serif text-lg flex gap-1">
                     <span className={getWuxingColor(gan)}>{gan}</span>
                     <span className={getWuxingColor(zhi)}>{zhi}</span>
                  </div>
               </div>
            )
         })}
       </div>

       <div className="flex justify-center items-stretch gap-4 md:gap-8">
          <GuaCard title="本卦" gua={gua_info.bengua} />
          <div className="flex items-center text-stone-300">➜</div>
          <GuaCard title="互卦" gua={gua_info.hugua} />
          <div className="flex items-center text-stone-300">➜</div>
          <GuaCard title="变卦" gua={gua_info.biangua} />
       </div>
       
       <div className="mt-6 bg-stone-50 p-4 rounded text-sm text-stone-600 border border-stone-100 text-center">
         <span className="font-bold">动爻: </span> {dongyao ? `${dongyao}爻动` : '无动爻'}
         <div className="mt-2 text-xs text-stone-500">
           {gua_info.bengua.gua_description.gua_juece}
         </div>
       </div>
    </div>
  );
};

export default MeihuaGrid;
