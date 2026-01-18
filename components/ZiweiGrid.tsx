
import React from 'react';
import { ZiweiResponse, ZiweiPalace } from '../types';

interface Props {
  data: ZiweiResponse;
}

const PalaceCard = ({ p }: { p: ZiweiPalace }) => {
  if (!p) return null;
  // Main Stars
  const stars = [];
  if (p.ziweixing) stars.push({ name: p.ziweixing, bright: p.ziweixing_xingyao, color: 'text-purple-700' });
  if (p.tianfuxing) stars.push({ name: p.tianfuxing, bright: p.tianfuxing_xingyao, color: 'text-purple-700' });
  
  // Try to find other stars in the object keys that end in 'xing' (simplified logic)
  // The API structure is flat for specific named stars. 
  // We'll just show the main ones for simplicity in this grid.

  return (
    <div className="border border-stone-200 bg-white p-2 text-xs flex flex-col h-[120px] justify-between relative shadow-sm hover:shadow-md transition-shadow">
      
      {/* Stars Section */}
      <div className="flex flex-col gap-0.5">
        {stars.map((s, i) => (
          <div key={i} className={`font-bold ${s.color} flex justify-between`}>
             <span>{s.name}</span>
             <span className="text-[10px] text-stone-400 font-normal">{s.bright}</span>
          </div>
        ))}
        {/* Placeholder for Minor Stars if we parsed them */}
        {p.yearganxing && <div className="text-[10px] text-stone-600">{p.yearganxing}</div>}
      </div>

      {/* Footer Info */}
      <div className="border-t border-stone-100 pt-1 mt-1">
        <div className="flex justify-between items-end">
           <span className="font-bold text-sm text-red-800 bg-red-50 px-1 rounded">{p.minggong}</span>
           <span className="font-mono text-stone-400 text-lg leading-none opacity-30 absolute bottom-1 right-1">{p.yinshou?.charAt(1)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
           <span>{p.daxian}</span>
           <span>{p.yinshou}</span>
        </div>
      </div>
    </div>
  );
};

const ZiweiGrid: React.FC<Props> = ({ data }) => {
  const { base_info, detail_info } = data;
  const palaces = detail_info.xiantian_info.gong_pan;

  // Ziwei charts are usually 4x4 with center empty, or just 12 boxes. 
  // Order is strictly Snake-like or clockwise depending on branch. 
  // The API returns a list. We will render a responsive grid.
  // Traditional Layout: 
  // Si  Wu  Wei  Shen
  // Chen         You
  // Mao          Xu
  // Yin  Chou Zi Hai
  
  // Map branches to grid positions for a CSS Grid representation?
  // Easier: Just a 3x4 or 4x3 grid for Mobile/Web responsively.
  
  return (
    <div className="w-full max-w-3xl mx-auto my-6">
      <div className="bg-purple-50 p-3 rounded mb-4 text-center border border-purple-100">
         <h3 className="font-bold text-purple-900">{base_info.name} - {base_info.mingju}</h3>
         <p className="text-xs text-purple-700">命宫: {base_info.minggong} | 身宫: {base_info.shengong} | 命主: {base_info.mingzhu}</p>
      </div>
      
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 bg-stone-100 p-2 rounded">
         {palaces.map((p, idx) => (
           <PalaceCard key={idx} p={p} />
         ))}
      </div>
    </div>
  );
};

export default ZiweiGrid;
