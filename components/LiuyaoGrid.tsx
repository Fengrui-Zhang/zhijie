import React from 'react';
import type { LiuyaoResponse } from '../types';
import { getWuxingColor } from '../utils/wuxing';
import {
  ChartMasthead,
  ChartSectionTitle,
  ChartSurface,
  ElementBadge,
  FourPillarsStrip,
  HexagramLines,
} from './DivinationVisualSystem';

interface Props { data: LiuyaoResponse }

const LineGraphic = ({ isYang, muted = false, moving = false }: { isYang: boolean; muted?: boolean; moving?: boolean }) => {
  const color = moving ? 'bg-red-600' : muted ? 'bg-stone-500' : 'bg-stone-800';
  return isYang ? (
    <div className={`h-2.5 w-full rounded-sm ${color}`} />
  ) : (
    <div className="flex h-2.5 w-full justify-between">
      <div className={`h-full w-[43%] rounded-sm ${color}`} />
      <div className={`h-full w-[43%] rounded-sm ${color}`} />
    </div>
  );
};

const ChangeArrow = ({ moving }: { moving: boolean }) => (
  <svg viewBox="0 0 28 12" className={`mx-auto h-3 w-7 ${moving ? 'text-red-500' : 'text-stone-300'}`} fill="none" aria-hidden="true">
    <path d="M1 6h23m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GuaSummary = ({
  label,
  name,
  gong,
  mark,
  moving,
  muted = false,
}: {
  label: string;
  name: string;
  gong: string;
  mark: string;
  moving: number[];
  muted?: boolean;
}) => (
  <div className={`flex items-center justify-center gap-4 px-4 py-4 ${muted ? 'bg-white/40' : 'bg-amber-50/48'}`}>
    <div className="rounded-[16px] border border-stone-200/70 bg-white/72 p-3 shadow-sm"><HexagramLines mark={mark} moving={muted ? [] : moving} /></div>
    <div className="text-left">
      <div className="text-[9px] font-bold tracking-[0.2em] text-stone-400">{label}</div>
      <div className={`mt-1 font-['STKaiti','KaiTi','Songti_SC','serif'] text-2xl font-bold ${getWuxingColor(name)}`}>{name}</div>
      <div className="mt-0.5 text-[10px] text-stone-500">{gong}</div>
    </div>
  </div>
);

const LiuyaoGrid: React.FC<Props> = ({ data }) => {
  const { gua_info, sizhu_info, shensha_info, kongwang } = data;
  const ben = gua_info.bengua;
  const bian = gua_info.biangua;
  const pillars = ['year', 'month', 'day', 'hour'].map((key) => `${(sizhu_info as any)[`${key}_gan`] || ''}${(sizhu_info as any)[`${key}_zhi`] || ''}`);
  const movingPositions = String(data.dongyao || '').split(/[,、\s]+/).map(Number).filter((value) => value >= 1 && value <= 6);
  const lines = [6, 5, 4, 3, 2, 1].map((position) => {
    const key = `gua_yao${position}`;
    const index = position - 1;
    const isYang = ben.gua_mark[index] === '1';
    const changedYang = bian ? bian.gua_mark[index] === '1' : undefined;
    return {
      position,
      isYang,
      changedYang,
      moving: Boolean(bian && isYang !== changedYang),
      liuqin: (ben.gua_yao_info.liuqin as any)[key],
      liushen: (ben.gua_yao_info.liushen as any)[key],
      changedLiuqin: bian ? (bian.gua_yao_info.liuqin as any)[key] : '',
      isShi: ben.gua_yao_info.shiying.shi_yao_position === String(position),
      isYing: ben.gua_yao_info.shiying.ying_yao_position === String(position),
      fushen: ben.gua_yao_info.fushen?.has_fushen === '1'
        ? ben.gua_yao_info.fushen.fushen_arr.find((item) => item.fushen_yao_position === String(position))?.fushen
        : '',
    };
  });

  return (
    <div className="glass-panel mx-auto my-6 w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/75">
      <div className="p-4 md:p-6">
        <ChartMasthead
          title="六爻纳甲"
          subtitle={`${ben.gua_name}${bian ? ` → ${bian.gua_name}` : ''} · ${movingPositions.length ? `${movingPositions.join('、')}爻动` : '静卦'}`}
          date={data.gongli}
          meta={`${data.nongli} · 旬空 ${kongwang}`}
          symbol="☵"
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <FourPillarsStrip pillars={pillars} />
          <div className="grid grid-cols-4 gap-2">
            {[
              ['驿马', shensha_info.yima, '木'],
              ['桃花', shensha_info.taohua, '火'],
              ['贵人', shensha_info.guiren, '金'],
              ['日禄', shensha_info.rilu, '水'],
            ].map(([label, value, element]) => (
              <div key={label} className="rounded-[15px] border border-stone-200/70 bg-white/52 px-2 py-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-stone-400"><ElementBadge value={element} />{label}</div>
                <div className={`mt-1 truncate font-['STKaiti','KaiTi','Songti_SC','serif'] text-base font-bold ${getWuxingColor(value)}`}>{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        <ChartSurface className="mt-5 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(249,239,210,0.62),rgba(255,255,255,0.46)_66%)]">
          <ChartSectionTitle title="纳甲卦盘" note="六神 · 六亲 · 世应 · 动变" />
          <div className="grid overflow-hidden rounded-[20px] border border-stone-200/70 md:grid-cols-[1fr_auto_1fr]">
            <GuaSummary label="本卦" name={ben.gua_name} gong={ben.gua_gong} mark={ben.gua_mark} moving={movingPositions} />
            <div className="flex h-10 items-center justify-center border-y border-stone-200/60 bg-white/32 md:h-auto md:w-12 md:border-x md:border-y-0">
              <div className="rotate-90 md:rotate-0"><ChangeArrow moving={movingPositions.length > 0} /></div>
            </div>
            {bian ? <GuaSummary label="变卦" name={bian.gua_name} gong={bian.gua_gong} mark={bian.gua_mark} moving={[]} muted /> : <div className="flex items-center justify-center bg-white/40 p-5 text-sm text-stone-400">静卦无变</div>}
          </div>

          <div className="mt-4 space-y-2 md:hidden">
            {lines.map((line) => {
              const positionLabel = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][line.position - 1];
              return (
                <div
                  key={line.position}
                  className={`rounded-[16px] border px-3 py-2.5 ${line.moving ? 'border-red-200/80 bg-red-50/55' : 'border-stone-200/70 bg-white/54'}`}
                >
                  <div className="grid grid-cols-[42px_minmax(0,1fr)_36px] items-center gap-2.5">
                    <div className="text-center">
                      <div className="text-[9px] font-bold tracking-wide text-stone-400">{positionLabel}</div>
                      <div className="mt-0.5 text-xs font-bold text-stone-600">{line.liushen}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className={`truncate font-['STKaiti','KaiTi','Songti_SC','serif'] text-sm font-bold ${getWuxingColor(line.liuqin)}`}>{line.liuqin}</div>
                        {bian ? <div className={`truncate text-right font-['STKaiti','KaiTi','Songti_SC','serif'] text-xs ${getWuxingColor(line.changedLiuqin)}`}>变 · {line.changedLiuqin || '—'}</div> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1"><LineGraphic isYang={line.isYang} moving={line.moving} /></div>
                        {bian ? <>
                          <ChangeArrow moving={line.moving} />
                          <div className="w-[42%] min-w-0"><LineGraphic isYang={Boolean(line.changedYang)} muted moving={line.moving} /></div>
                        </> : null}
                      </div>
                      {line.fushen ? <div className={`mt-1.5 truncate text-[9px] ${getWuxingColor(line.fushen)}`}>伏神 · {line.fushen}</div> : null}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      {line.isShi ? <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">世</span> : null}
                      {line.isYing ? <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">应</span> : null}
                      {!line.isShi && !line.isYing ? <span className="text-[9px] text-stone-300">—</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-scrollbar mt-4 hidden overflow-x-auto rounded-[20px] border border-stone-200/70 bg-white/54 md:block">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[54px_92px_140px_100px_50px_54px_100px_140px] border-b border-stone-200/70 bg-white/48 px-2 py-2 text-center text-[9px] font-bold tracking-wider text-stone-400">
                <div>六神</div><div>伏神</div><div>本卦爻象</div><div>卦画</div><div>世应</div><div>动</div><div>变画</div><div>变卦爻象</div>
              </div>
              {lines.map((line) => (
                <div key={line.position} className={`grid min-h-12 grid-cols-[54px_92px_140px_100px_50px_54px_100px_140px] items-center border-b border-stone-200/60 px-2 text-center last:border-b-0 ${line.moving ? 'bg-red-50/45' : 'hover:bg-white/45'}`}>
                  <div className="text-xs font-bold text-stone-600">{line.liushen}</div>
                  <div className={`truncate text-[10px] ${getWuxingColor(line.fushen || '')}`}>{line.fushen || '—'}</div>
                  <div className={`font-['STKaiti','KaiTi','Songti_SC','serif'] text-sm font-bold ${getWuxingColor(line.liuqin)}`}>{line.liuqin}</div>
                  <div className="px-3"><LineGraphic isYang={line.isYang} moving={line.moving} /></div>
                  <div className="flex justify-center gap-0.5">
                    {line.isShi ? <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">世</span> : null}
                    {line.isYing ? <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">应</span> : null}
                  </div>
                  <div>{bian ? <ChangeArrow moving={line.moving} /> : null}</div>
                  <div className="px-3">{typeof line.changedYang === 'boolean' ? <LineGraphic isYang={line.changedYang} muted moving={line.moving} /> : null}</div>
                  <div className={`font-['STKaiti','KaiTi','Songti_SC','serif'] text-sm ${getWuxingColor(line.changedLiuqin)}`}>{line.changedLiuqin || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </ChartSurface>

        <ChartSurface className="mt-5 border-amber-200/70 bg-amber-50/35">
          <ChartSectionTitle title="卦辞与决策" note={ben.gua_xiongji || '本卦参断'} />
          <div className="font-['STKaiti','KaiTi','Songti_SC','serif'] text-lg leading-8 text-stone-700">{ben.gua_qian}</div>
          <div className="mt-3 border-t border-amber-200/60 pt-3 text-sm leading-7 text-stone-600"><span className="font-bold text-amber-900">决策参考：</span>{ben.gua_description.gua_juece}</div>
        </ChartSurface>
      </div>
    </div>
  );
};

export default LiuyaoGrid;
