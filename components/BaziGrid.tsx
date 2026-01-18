
import React from 'react';
import { BaziResponse } from '../types';
import { getWuxingColor } from '../utils/wuxing';

interface Props {
  data: BaziResponse;
}

const Pillar = ({ label, gan, zhi, god, nayin, hidden }: any) => {
  const ganColor = getWuxingColor(gan);
  const zhiColor = getWuxingColor(zhi);

  return (
    <div className="flex flex-col items-center bg-amber-50/50 p-2 rounded border border-amber-100 min-w-[70px]">
      <div className="text-xs text-stone-400 mb-1">{label}</div>
      <div className="text-xs text-stone-500">{god}</div>
      <div className={`text-xl font-bold my-1 font-serif ${ganColor}`}>{gan}</div>
      <div className={`text-xl font-bold my-1 font-serif ${zhiColor}`}>{zhi}</div>
      <div className="text-[10px] text-stone-400 mt-1">{hidden}</div>
      <div className="text-[10px] text-stone-400 scale-90">{nayin}</div>
    </div>
  );
};

const BaziGrid: React.FC<Props> = ({ data }) => {
  const { base_info, bazi_info, dayun_info } = data;

  return (
    <div className="w-full max-w-2xl mx-auto my-6 bg-white p-4 rounded-xl shadow-sm border border-stone-200">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-stone-800">{base_info.name} ({base_info.sex})</h3>
        <p className="text-xs text-stone-500">{base_info.nongli}</p>
        <p className="text-xs text-stone-500">
          格局: {base_info.zhengge} | {base_info.qiyun}
          {base_info.zhen && <span className="block text-amber-600 mt-1">真太阳时: {base_info.zhen.city} ({base_info.zhen.shicha})</span>}
        </p>
      </div>

      {/* Four Pillars */}
      <div className="flex justify-around mb-6">
        <Pillar 
          label="年柱" 
          gan={bazi_info.bazi[0].charAt(0)} 
          zhi={bazi_info.bazi[0].charAt(1)} 
          god={bazi_info.tg_cg_god[0]} // Approximation from API list
          nayin={bazi_info.na_yin[0]}
          hidden={bazi_info.dz_cg[0]}
        />
        <Pillar 
          label="月柱" 
          gan={bazi_info.bazi[1].charAt(0)} 
          zhi={bazi_info.bazi[1].charAt(1)} 
          god={bazi_info.tg_cg_god[1]}
          nayin={bazi_info.na_yin[1]}
          hidden={bazi_info.dz_cg[1]}
        />
        <Pillar 
          label="日柱" 
          gan={bazi_info.bazi[2].charAt(0)} 
          zhi={bazi_info.bazi[2].charAt(1)} 
          god={bazi_info.tg_cg_god[2]}
          nayin={bazi_info.na_yin[2]}
          hidden={bazi_info.dz_cg[2]}
        />
        <Pillar 
          label="时柱" 
          gan={bazi_info.bazi[3].charAt(0)} 
          zhi={bazi_info.bazi[3].charAt(1)} 
          god={bazi_info.tg_cg_god[3]}
          nayin={bazi_info.na_yin[3]}
          hidden={bazi_info.dz_cg[3]}
        />
      </div>

      {/* Dayun */}
      <div className="border-t border-stone-100 pt-4">
        <div className="text-sm font-bold text-stone-700 mb-2">大运</div>
        <div className="flex overflow-x-auto gap-2 pb-2">
          {dayun_info.big.map((dy, idx) => {
             const gan = dy.charAt(0);
             const zhi = dy.charAt(1);
             return (
               <div key={idx} className="flex flex-col items-center min-w-[50px] bg-stone-50 p-1 rounded">
                  <div className="text-sm font-semibold flex gap-0.5">
                    <span className={getWuxingColor(gan)}>{gan}</span>
                    <span className={getWuxingColor(zhi)}>{zhi}</span>
                  </div>
                  <div className="text-[10px] text-stone-400">{dayun_info.xu_sui[idx]}岁</div>
                  <div className="text-[10px] text-stone-300">{dayun_info.big_start_year[idx]}</div>
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default BaziGrid;
