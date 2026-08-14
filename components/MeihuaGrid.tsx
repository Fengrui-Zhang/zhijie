import React from 'react';
import type { GuaDetails, MeihuaResponse } from '../types';
import { getWuxingColor } from '../utils/wuxing';
import {
  ChartMasthead,
  ChartSectionTitle,
  ChartSurface,
  FourPillarsStrip,
  HexagramLines,
} from './DivinationVisualSystem';

interface Props { data: MeihuaResponse }

const GuaPanel = ({
  title,
  gua,
  moving = [],
  prominent = false,
}: {
  title: string;
  gua: GuaDetails;
  moving?: number[];
  prominent?: boolean;
}) => {
  const [expanded, setExpanded] = React.useState(false);
  if (!gua?.gua_name) return null;
  return (
    <div className={`relative flex min-h-[250px] min-w-[78%] shrink-0 snap-center flex-col items-center border-stone-200/70 px-4 py-5 text-center md:min-w-0 ${prominent ? 'bg-amber-50/55' : 'bg-white/52'}`}>
      <div className="text-[9px] font-bold tracking-[0.2em] text-stone-400">{title}</div>
      <div className="mt-4 rounded-[18px] border border-stone-200/70 bg-white/70 p-4 shadow-sm">
        <HexagramLines mark={gua.gua_mark} moving={moving} />
      </div>
      <div className={`mt-4 font-['STKaiti','KaiTi','Songti_SC','serif'] text-2xl font-bold ${getWuxingColor(gua.gua_name)}`}>{gua.gua_name}</div>
      <div className="mt-1 text-[10px] font-semibold text-amber-800">{gua.gua_xiongji || '平'}</div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className={`mt-3 text-xs leading-5 text-stone-500 transition hover:text-stone-700 ${expanded ? '' : 'line-clamp-2'}`}
        title={gua.gua_qian}
      >
        {gua.gua_qian || '暂无卦辞'}
      </button>
    </div>
  );
};

const AuxiliaryGua = ({ label, gua }: { label: string; gua: GuaDetails }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/55 p-3">
    <div className="rounded-xl border border-stone-200/70 bg-white/70 p-2"><HexagramLines mark={gua.gua_mark} /></div>
    <div className="min-w-0">
      <div className="text-[9px] font-bold tracking-widest text-stone-400">{label}</div>
      <div className={`mt-0.5 truncate font-['STKaiti','KaiTi','Songti_SC','serif'] text-lg font-bold ${getWuxingColor(gua.gua_name)}`}>{gua.gua_name}</div>
      <div className="text-[10px] text-stone-500">{gua.gua_xiongji || '辅助参看'}</div>
    </div>
  </div>
);

const FlowArrow = () => (
  <div className="flex items-center justify-center text-amber-500" aria-hidden="true">
    <svg viewBox="0 0 28 12" className="h-3 w-7" fill="none">
      <path d="M1 6h23m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

const MeihuaGrid: React.FC<Props> = ({ data }) => {
  const { gua_info, dongyao, sizhu_info } = data;
  const pillars = ['year', 'month', 'day', 'hour'].map((key) => `${(sizhu_info as any)[`${key}_gan`] || ''}${(sizhu_info as any)[`${key}_zhi`] || ''}`);
  const moving = String(dongyao || '').split(/[,、\s]+/).map(Number).filter((value) => value >= 1 && value <= 6);
  const hasChange = data.has_biangua !== '0' && Boolean(gua_info.biangua?.gua_name);

  return (
    <div className="glass-panel mx-auto my-6 w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/75">
      <div className="p-4 md:p-6">
        <ChartMasthead
          title="梅花易数"
          subtitle={`${gua_info.bengua.gua_name} · ${moving.length ? `${moving.join('、')}爻动` : '静卦'}`}
          date={data.gongli}
          meta={data.nongli}
          symbol="☰"
        />
        <div className="mt-4"><FourPillarsStrip pillars={pillars} /></div>

        <ChartSurface className="relative mt-5 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(249,239,210,0.65),rgba(255,255,255,0.45)_65%)]">
          <ChartSectionTitle title="三卦演化" note="本卦为体 · 互卦为过程 · 变卦为归趋" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-['STKaiti','KaiTi','Songti_SC','serif'] text-[180px] text-stone-900/[0.025]">易</div>
          <div className="glass-scrollbar relative flex snap-x snap-mandatory items-stretch overflow-x-auto rounded-[20px] border border-stone-200/70 md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr] md:overflow-hidden">
            <GuaPanel title="本卦" gua={gua_info.bengua} moving={moving} prominent />
            <div className="flex w-8 shrink-0 items-center justify-center border-x border-stone-200/60 bg-white/30 md:w-auto md:px-2"><FlowArrow /></div>
            <GuaPanel title="互卦" gua={gua_info.hugua} />
            <div className="flex w-8 shrink-0 items-center justify-center border-x border-stone-200/60 bg-white/30 md:w-auto md:px-2"><FlowArrow /></div>
            {hasChange ? <GuaPanel title="变卦" gua={gua_info.biangua} /> : <GuaPanel title="静卦" gua={gua_info.bengua} />}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-stone-500">
            <span className="h-2 w-2 rounded-full bg-red-500" />红色卦画表示动爻
          </div>
        </ChartSurface>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <ChartSurface>
            <ChartSectionTitle title="旁通参看" note="错综互见" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <AuxiliaryGua label="错卦" gua={gua_info.cuogua} />
              <AuxiliaryGua label="综卦" gua={gua_info.zonggua} />
            </div>
          </ChartSurface>
          <ChartSurface className="border-amber-200/70 bg-amber-50/35">
            <ChartSectionTitle title="卦意锚点" note={`${gua_info.bengua.gua_xiongji || '平'} · ${moving.length ? `${moving.join('、')}爻动` : '无动爻'}`} />
            <div className="font-['STKaiti','KaiTi','Songti_SC','serif'] text-lg leading-8 text-stone-700">{gua_info.bengua.gua_qian_desc || gua_info.bengua.gua_qian}</div>
            <div className="mt-4 border-t border-amber-200/60 pt-3 text-sm leading-7 text-stone-600">
              <span className="font-bold text-amber-900">决策参考：</span>{gua_info.bengua.gua_description.gua_juece}
            </div>
          </ChartSurface>
        </div>
      </div>
    </div>
  );
};

export default MeihuaGrid;
