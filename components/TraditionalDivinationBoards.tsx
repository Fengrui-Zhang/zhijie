import React from 'react';
import type { DaliurenOutput } from 'taibu-core/daliuren';
import type { TaiyiOutput } from 'taibu-core/taiyi';
import type { XiaoliurenOutput, XiaoliurenStatus } from 'taibu-core/xiaoliuren';
import type { GenericTaibuResponse } from '../types';
import { getWuxingColor } from '../utils/wuxing';

type BoardProps = { data: GenericTaibuResponse };
type GongInfo = DaliurenOutput['gongInfos'][number];
type TaiyiStarSnapshot = TaiyiOutput['coreBoard']['primaryStar'];

const STEM_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const BRANCH_ELEMENT: Record<string, string> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金', 亥: '水', 子: '水',
};
const ELEMENT_HEX: Record<string, string> = {
  木: '#16815f', 火: '#c24132', 土: '#a36f25', 金: '#b68424', 水: '#315f87',
};
const ELEMENT_SOFT: Record<string, string> = {
  木: 'border-emerald-200/80 bg-emerald-50/70 text-emerald-800',
  火: 'border-red-200/80 bg-red-50/70 text-red-800',
  土: 'border-yellow-200/80 bg-yellow-50/70 text-yellow-800',
  金: 'border-amber-200/80 bg-amber-50/70 text-amber-800',
  水: 'border-sky-200/80 bg-sky-50/70 text-sky-900',
};

const toText = (value: unknown, fallback = '—') => {
  if (Array.isArray(value)) return value.filter(Boolean).join('、') || fallback;
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const elementOf = (value?: string) => {
  const char = Array.from(value || '').find((item) => STEM_ELEMENT[item] || BRANCH_ELEMENT[item]);
  return char ? STEM_ELEMENT[char] || BRANCH_ELEMENT[char] : '';
};

const ElementDot = ({ element, label }: { element?: string; label?: string }) => (
  <span
    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 text-[10px] font-bold ${ELEMENT_SOFT[element || ''] || 'border-stone-200 bg-stone-50 text-stone-600'}`}
  >
    {label || element || '·'}
  </span>
);

const SectionTitle = ({ title, note }: { title: string; note?: string }) => (
  <div className="mb-3 flex items-baseline justify-between gap-3">
    <h3 className="font-['STKaiti','KaiTi','Songti_SC','serif'] text-lg font-bold text-stone-900 md:text-xl">{title}</h3>
    {note ? <span className="text-[10px] tracking-wide text-stone-400 md:text-xs">{note}</span> : null}
  </div>
);

const ChartPanel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-[24px] border border-white/75 bg-white/48 p-4 shadow-[0_14px_40px_rgba(73,56,35,0.055)] backdrop-blur-xl md:p-5 ${className}`}>
    {children}
  </section>
);

const BoardMasthead = ({
  title,
  subtitle,
  date,
  meta,
  question,
}: {
  title: string;
  subtitle: string;
  date?: string;
  meta?: string;
  question?: unknown;
}) => (
  <header className="border-b border-stone-200/60 pb-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-300/80 bg-amber-50/70 text-lg text-amber-800 shadow-inner">
          ☯
          <span className="absolute inset-1 rounded-full border border-amber-500/25" />
        </div>
        <div>
          <h2 className="display-title text-2xl font-bold tracking-wide text-stone-950 md:text-3xl">{title}</h2>
          <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
        </div>
      </div>
      <div className="rounded-xl border border-stone-200/70 bg-white/55 px-3 py-2 text-right text-[11px] leading-5 text-stone-500">
        <div>{date || '—'}</div>
        {meta ? <div className="font-semibold text-stone-700">{meta}</div> : null}
      </div>
    </div>
    {question ? (
      <div className="mt-3 flex gap-2 border-l-2 border-amber-400/80 pl-3 text-xs leading-5 text-stone-600">
        <span className="shrink-0 font-bold text-stone-400">占问</span>
        <span className="font-semibold text-stone-800">{toText(question)}</span>
      </div>
    ) : null}
  </header>
);

const FourPillars = ({ value }: { value?: string | string[] }) => {
  const labels = ['年柱', '月柱', '日柱', '时柱'];
  const pillars = (Array.isArray(value) ? value : String(value || '').split(/\s+/)).filter(Boolean).slice(0, 4);
  if (!pillars.length) return null;
  return (
    <div className="grid grid-cols-4 divide-x divide-stone-200/70 overflow-hidden rounded-[18px] border border-stone-200/70 bg-white/56">
      {labels.map((label, index) => {
        const chars = Array.from(pillars[index] || '——');
        return (
          <div key={label} className="relative px-2 py-3 text-center">
            <div className="text-[9px] font-bold tracking-[0.14em] text-stone-400">{label}</div>
            <div className="mt-1.5 flex justify-center gap-1 font-['STKaiti','KaiTi','Songti_SC','serif'] text-xl font-bold md:text-2xl">
              <span className={getWuxingColor(chars[0])}>{chars[0] || '—'}</span>
              <span className={getWuxingColor(chars[1])}>{chars[1] || '—'}</span>
            </div>
            <div className="mt-1 text-[9px] text-stone-400">{elementOf(chars[0]) || '—'} · {elementOf(chars[1]) || '—'}</div>
          </div>
        );
      })}
    </div>
  );
};

const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const DALIUREN_POSITIONS: Record<number, { row: number; col: number }> = {
  5: { row: 1, col: 1 }, 6: { row: 1, col: 2 }, 7: { row: 1, col: 3 }, 8: { row: 1, col: 4 },
  4: { row: 2, col: 1 }, 9: { row: 2, col: 4 }, 3: { row: 3, col: 1 }, 10: { row: 3, col: 4 },
  2: { row: 4, col: 1 }, 1: { row: 4, col: 2 }, 0: { row: 4, col: 3 }, 11: { row: 4, col: 4 },
};
const WANG_SHUAI_COLOR: Record<string, string> = {
  旺: 'text-red-700', 相: 'text-amber-700', 休: 'text-sky-700', 囚: 'text-stone-500', 死: 'text-stone-400',
};

const buildGongInfos = (chart: DaliurenOutput): GongInfo[] => {
  if (Array.isArray(chart.gongInfos) && chart.gongInfos.length) return chart.gongInfos;
  return DIZHI.map((diZhi, index) => ({
    diZhi,
    tianZhi: chart.tianDiPan?.tianPan?.[diZhi] || chart.tianDiPan?.tianPan?.[String(index)] || '—',
    tianJiang: chart.tianDiPan?.tianJiang?.[diZhi] || chart.tianDiPan?.tianJiang?.[String(index)] || '—',
    tianJiangShort: chart.tianDiPan?.tianJiang?.[diZhi] || chart.tianDiPan?.tianJiang?.[String(index)] || '—',
    dunGan: '', changSheng: '', wuXing: '', wangShuai: '休', jianChu: '',
  }));
};

const lessonParts = (value?: string[]) => {
  const pair = Array.from(value?.[0] || '');
  return { upper: pair[0] || '—', lower: pair.slice(1).join('') || '—', general: value?.[1] || '—' };
};

const CompassSeal = ({ label, sublabel }: { label: string; sublabel?: string }) => (
  <div className="relative flex h-full min-h-[112px] flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle,rgba(251,248,239,0.95)_0%,rgba(244,237,219,0.58)_64%,rgba(255,255,255,0.18)_100%)] text-center">
    <div className="absolute h-24 w-24 rounded-full border border-amber-600/20" />
    <div className="absolute h-16 w-16 rotate-45 border border-amber-600/15" />
    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-stone-800 text-2xl text-amber-100 shadow-lg">☯</div>
    <div className="relative mt-2 max-w-[150px] px-2 font-['STKaiti','KaiTi','Songti_SC','serif'] text-sm font-bold text-stone-800">{label}</div>
    {sublabel ? <div className="relative mt-0.5 text-[9px] text-amber-800">{sublabel}</div> : null}
  </div>
);

const DaliurenPlate = ({
  chart,
  keName,
  transmissions,
}: {
  chart: DaliurenOutput;
  keName: string;
  transmissions: ReadonlyArray<readonly [string, string[] | undefined]>;
}) => {
  const gongInfos = buildGongInfos(chart);
  const transmissionByBranch = new Map(transmissions.map(([label, value]) => [value?.[0], label]));
  const emptySet = new Set(chart.dateInfo?.kongWang || []);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[620px] p-[5%]">
      <div className="pointer-events-none absolute inset-[2.5%] rounded-full border border-amber-700/25" />
      <div className="pointer-events-none absolute inset-[6%] rounded-full border border-stone-300/70" />
      <div className="relative grid h-full w-full grid-cols-4 grid-rows-4 overflow-hidden rounded-[12%] border border-amber-800/30 bg-white/60 shadow-[0_20px_50px_rgba(95,66,27,0.08)]">
        {gongInfos.map((gong, index) => {
          const position = DALIUREN_POSITIONS[index];
          if (!position) return null;
          const transmit = transmissionByBranch.get(gong.tianZhi);
          const empty = emptySet.has(gong.tianZhi);
          const element = gong.wuXing || elementOf(gong.tianZhi);
          return (
            <div
              key={gong.diZhi || index}
              style={{ gridRow: position.row, gridColumn: position.col }}
              className={`relative flex min-h-0 flex-col items-center justify-center border border-stone-300/65 px-1 py-1 font-['STKaiti','KaiTi','Songti_SC','serif'] ${transmit ? 'bg-amber-50/90' : 'bg-white/58'} ${empty ? 'opacity-45' : ''}`}
            >
              <div className="absolute left-1 top-1 text-[8px] font-bold text-stone-500 md:text-[10px]">{gong.tianJiangShort || gong.tianJiang}</div>
              {transmit ? <span className="absolute right-1 top-1 rounded-full bg-stone-800 px-1.5 py-0.5 text-[7px] font-bold text-amber-100 md:text-[9px]">{transmit}</span> : null}
              <div className={`text-xl font-bold md:text-3xl ${getWuxingColor(gong.tianZhi)}`}>{gong.tianZhi}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[8px] text-stone-400 md:text-[10px]">
                <span>{gong.dunGan || gong.changSheng || '·'}</span>
                <span className="text-stone-300">/</span>
                <b className={getWuxingColor(gong.diZhi)}>{gong.diZhi}</b>
                <span className={WANG_SHUAI_COLOR[gong.wangShuai] || ''}>{gong.wangShuai}</span>
              </div>
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ELEMENT_HEX[element] || '#a8a29e' }} />
            </div>
          );
        })}
        <div className="col-span-2 row-span-2" style={{ gridRow: '2 / span 2', gridColumn: '2 / span 2' }}>
          <CompassSeal label={keName} sublabel={chart.dateInfo?.yueJiangName ? `${chart.dateInfo.yueJiangName}加时` : undefined} />
        </div>
      </div>
      {DIZHI.map((branch, index) => {
        const angle = (index / 12) * Math.PI * 2 + Math.PI / 2;
        const x = 50 + 47.5 * Math.cos(angle);
        const y = 50 + 47.5 * Math.sin(angle);
        return (
          <span key={branch} className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-xs font-bold md:text-sm ${getWuxingColor(branch)}`} style={{ left: `${x}%`, top: `${y}%` }}>
            {branch}
          </span>
        );
      })}
    </div>
  );
};

export function DaliurenBoard({ data }: BoardProps) {
  const chart = data.detail_info?.daliuren as unknown as DaliurenOutput | undefined;
  if (!chart) return null;
  const keName = toText(data.base_info?.keName, '大六壬课盘');
  const lessons = [
    ['四课', chart.siKe?.siKe], ['三课', chart.siKe?.sanKe], ['二课', chart.siKe?.erKe], ['一课', chart.siKe?.yiKe],
  ] as const;
  const transmissions = [
    ['初传', chart.sanChuan?.chu], ['中传', chart.sanChuan?.zhong], ['末传', chart.sanChuan?.mo],
  ] as const;
  const tags = [...new Set([chart.keTi?.method, ...(chart.keTi?.subTypes || []), ...(chart.keTi?.extraTypes || [])].filter(Boolean))];
  return (
    <div className="glass-panel overflow-hidden rounded-[28px] border border-white/75">
      <div className="p-4 md:p-6">
        <BoardMasthead
          title="大六壬"
          subtitle={keName}
          date={chart.dateInfo?.solarDate || toText(data.base_info?.gongli)}
          meta={`${chart.dateInfo?.yueJiangName || data.base_info?.yueJiang || '月将'} · ${chart.dateInfo?.diurnal ? '昼占' : '夜占'} · 旬空${toText(chart.dateInfo?.kongWang)}`}
          question={data.base_info?.question}
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <div className="space-y-3">
            <FourPillars value={chart.dateInfo?.bazi} />
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => <span key={tag} className="rounded-full border border-amber-200/75 bg-amber-50/65 px-2.5 py-1 text-[10px] font-bold text-amber-800">{tag}</span>)}
              <span className="rounded-full border border-stone-200 bg-white/55 px-2.5 py-1 text-[10px] text-stone-500">驿马 {toText(chart.dateInfo?.yiMa)}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <SectionTitle title="四课" note="四课 → 一课" />
              <div className="grid grid-cols-4 overflow-hidden rounded-[18px] border border-stone-200/70 bg-white/52">
                {lessons.map(([label, value]) => {
                  const part = lessonParts(value);
                  const element = elementOf(part.upper);
                  return (
                    <div key={label} className="relative border-r border-stone-200/70 px-1 py-3 text-center last:border-r-0">
                      <ElementDot element={element} label={element} />
                      <div className={`mt-2 font-['STKaiti','KaiTi','Songti_SC','serif'] text-2xl font-bold ${getWuxingColor(part.upper)}`}>{part.upper}</div>
                      <div className={`text-base font-bold ${getWuxingColor(part.lower)}`}>{part.lower}</div>
                      <div className="mt-2 text-[9px] font-bold text-stone-400">{part.general}</div>
                      <div className="mt-0.5 text-[9px] text-stone-400">{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <SectionTitle title="三传" note={`取传 · ${chart.sanChuan?.method || '—'}`} />
              <div className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-stone-200/70 bg-white/52">
                {transmissions.map(([label, value], index) => {
                  const element = elementOf(value?.[0]);
                  return (
                    <div key={label} className="relative border-r border-stone-200/70 px-2 py-3 text-center last:border-r-0">
                      <div className="text-[9px] font-bold tracking-widest text-stone-400">{label}</div>
                      <div className={`mt-1 font-['STKaiti','KaiTi','Songti_SC','serif'] text-3xl font-bold ${getWuxingColor(value?.[0] || '')}`}>{value?.[0] || '—'}</div>
                      <div className="mt-1 text-[10px] font-bold text-stone-700">{value?.[1] || '—'}</div>
                      <div className="mt-1 text-[9px] text-stone-500">{[value?.[2], value?.[3]].filter(Boolean).join(' · ') || '—'}</div>
                      {index < 2 ? <span className="absolute -right-1.5 top-1/2 z-10 flex h-3 w-3 -translate-y-1/2 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">›</span> : null}
                      <span className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ELEMENT_HEX[element] || '#a8a29e' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <ChartPanel className="bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(249,245,235,0.46))]">
            <SectionTitle title="十二宫天地盘" note="天将 · 天盘 · 地盘 · 旺衰" />
            <DaliurenPlate chart={chart} keName={keName} transmissions={transmissions} />
          </ChartPanel>
          <ChartPanel>
            <SectionTitle title="课传关系" note="以课定体 · 以传定用" />
            <div className="space-y-3">
              {transmissions.map(([label, value], index) => (
                <div key={label} className="relative flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/58 p-3">
                  <ElementDot element={elementOf(value?.[0])} label={value?.[0]} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-bold tracking-widest text-stone-400">{label}</div>
                    <div className="mt-0.5 text-sm font-bold text-stone-800">{value?.[1]} · {value?.[2] || '—'}</div>
                  </div>
                  <div className="text-xs font-semibold text-stone-500">{value?.[3] || ''}</div>
                  {index < 2 ? <div className="absolute -bottom-3 left-6 h-3 w-px bg-amber-400/70" /> : null}
                </div>
              ))}
            </div>
            {chart.shenSha?.length ? (
              <div className="mt-5 border-t border-stone-200/70 pt-4">
                <div className="mb-2 text-xs font-bold text-stone-700">神煞参看</div>
                <div className="flex flex-wrap gap-1.5">
                  {chart.shenSha.slice(0, 16).map((item) => (
                    <span key={`${item.name}-${item.value}`} title={item.description} className="rounded-full border border-stone-200/75 bg-white/60 px-2 py-1 text-[10px] text-stone-600">
                      <b className={getWuxingColor(item.value)}>{item.name}</b> · {item.value}
                    </span>
                  ))}
                </div>
                {chart.shenSha.length > 16 ? (
                  <details className="mt-3 text-xs text-stone-500">
                    <summary className="cursor-pointer font-semibold text-amber-800">查看全部 {chart.shenSha.length} 项神煞</summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {chart.shenSha.slice(16).map((item) => <span key={`${item.name}-${item.value}`} className="rounded-full bg-stone-100/80 px-2 py-1">{item.name} · {item.value}</span>)}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
          </ChartPanel>
        </div>
      </div>
    </div>
  );
}

const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];
const PALACE_NAMES: Record<number, string> = { 1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 5: '中五宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫' };
const PALACE_TRIGRAM: Record<number, string> = { 1: '☵', 2: '☷', 3: '☳', 4: '☴', 5: '☯', 6: '☰', 7: '☱', 8: '☶', 9: '☲' };
const CHINESE_PALACE_NUMBERS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const SCALE_STYLE: Record<string, string> = {
  年盘: 'bg-emerald-600 text-white', 月盘: 'bg-red-600 text-white', 日盘: 'bg-amber-600 text-white', 时盘: 'bg-sky-700 text-white',
};
const taiyiPalaceNumber = (star: TaiyiStarSnapshot) => {
  const value = star.number as unknown;
  return typeof value === 'number' ? value : CHINESE_PALACE_NUMBERS[String(value)] || star.index;
};

const TaiyiStarToken = ({ star, primary }: { star: TaiyiStarSnapshot; primary: TaiyiStarSnapshot }) => {
  const active = star.scale === primary.scale && taiyiPalaceNumber(star) === taiyiPalaceNumber(primary);
  return (
    <div className={`relative z-10 flex items-center gap-1.5 rounded-lg border px-1.5 py-1 ${active ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-white/80 bg-white/68'}`}>
      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${SCALE_STYLE[star.scaleLabel] || 'bg-stone-600 text-white'}`}>{star.scaleLabel?.replace('盘', '')}</span>
      <span className={`truncate text-[10px] font-bold md:text-xs ${getWuxingColor(star.wuXing)}`}>{star.taiyiName}</span>
    </div>
  );
};

export function TaiyiBoard({ data }: BoardProps) {
  const chart = data.detail_info?.taiyi as unknown as TaiyiOutput | undefined;
  if (!chart?.coreBoard) return null;
  const primary = chart.coreBoard.primaryStar;
  const primaryPalace = taiyiPalaceNumber(primary);
  const stars = [chart.coreBoard.yearStar, chart.coreBoard.monthStar, chart.coreBoard.dayStar, chart.coreBoard.hourStar, chart.coreBoard.minuteRefinement?.refinedStar].filter(Boolean) as TaiyiStarSnapshot[];
  const context = chart.datetimeContext;
  const favorable = chart.derivedIndicators?.favorableSignals || [];
  const caution = chart.derivedIndicators?.cautionSignals || [];
  const pillars = [context?.yearGanZhi, context?.monthGanZhi, context?.dayGanZhi, context?.hourGanZhi].filter(Boolean) as string[];
  return (
    <div className="glass-panel overflow-hidden rounded-[28px] border border-white/75">
      <div className="p-4 md:p-6">
        <BoardMasthead
          title="太乙神数"
          subtitle={`${chart.boardMeta?.modeLabel || '时盘'} · 九星观测 · 主星 ${primary.taiyiName}`}
          date={context?.solarDateTime || toText(data.base_info?.gongli)}
          meta={`${context?.lunarDate || '—'} · ${context?.xiu || '—'}宿${context?.xiuLuck || ''}`}
          question={data.base_info?.question}
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <FourPillars value={pillars} />
          <div className="grid grid-cols-4 gap-2">
            {stars.slice(0, 4).map((star) => (
              <div key={star.scale} className="rounded-[15px] border border-stone-200/70 bg-white/52 px-2 py-2 text-center">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold ${SCALE_STYLE[star.scaleLabel] || 'bg-stone-600 text-white'}`}>{star.scaleLabel}</span>
                <div className={`mt-1 font-['STKaiti','KaiTi','Songti_SC','serif'] text-base font-bold md:text-xl ${getWuxingColor(star.wuXing)}`}>{star.taiyiName}</div>
                <div className="text-[9px] text-stone-400">{PALACE_NAMES[taiyiPalaceNumber(star)]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <ChartPanel className="relative overflow-hidden bg-[radial-gradient(circle_at_center,rgba(249,239,210,0.72),rgba(255,255,255,0.42)_58%)]">
            <SectionTitle title="洛书九宫盘" note="戴九履一 · 左三右七" />
            <div className="relative mx-auto max-w-[620px] p-3 md:p-8">
              <div className="pointer-events-none absolute inset-0 rounded-full border border-amber-700/10" />
              <div className="pointer-events-none absolute inset-[7%] rotate-45 border border-amber-700/10" />
              <div className="relative grid grid-cols-3 overflow-hidden rounded-2xl border border-amber-800/35 bg-white/62 shadow-[0_22px_45px_rgba(95,66,27,0.08)]">
                {LUOSHU_ORDER.map((number) => {
                  const palaceStars = stars.filter((star) => taiyiPalaceNumber(star) === number);
                  const active = primaryPalace === number;
                  return (
                    <div key={number} className={`relative min-h-[104px] border border-stone-300/65 p-2 md:min-h-[142px] md:p-3 ${active ? 'bg-amber-50/85' : 'bg-white/52'}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold text-stone-500 md:text-xs">{PALACE_NAMES[number]}</span>
                        <span className="font-['STKaiti','KaiTi','Songti_SC','serif'] text-lg text-stone-300 md:text-2xl">{PALACE_TRIGRAM[number]}</span>
                      </div>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-5xl text-stone-900/[0.035] md:text-7xl">{number}</div>
                      <div className="mt-2 space-y-1">
                        {palaceStars.map((star) => <TaiyiStarToken key={`${star.scale}-${taiyiPalaceNumber(star)}`} star={star} primary={primary} />)}
                      </div>
                      {active ? <span className="absolute bottom-1.5 right-2 text-[8px] font-bold tracking-widest text-amber-700">主星宫</span> : null}
                    </div>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-center text-stone-400"><div className="text-lg">☲</div><div className="text-[9px]">南</div></div>
              <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-stone-400"><div className="text-[9px]">北</div><div className="text-lg">☵</div></div>
              <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-center text-stone-400"><div className="text-lg">☳</div><div className="text-[9px]">东</div></div>
              <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-center text-stone-400"><div className="text-lg">☱</div><div className="text-[9px]">西</div></div>
            </div>
          </ChartPanel>

          <div className="space-y-4">
            <ChartPanel className="overflow-hidden border-amber-200/70 bg-amber-50/45">
              <div className="text-center">
                <div className="text-[9px] font-bold tracking-[0.2em] text-amber-800">{primary.scaleLabel}主星</div>
                <div className={`mt-1 font-['STKaiti','KaiTi','Songti_SC','serif'] text-4xl font-bold ${getWuxingColor(primary.wuXing)}`}>{primary.taiyiName}</div>
                <div className="mt-1 text-xs font-semibold text-stone-600">{primary.taiyiType} · {primary.wuXing} · {primary.positionDesc}</div>
                <div className="mt-2 text-[10px] text-stone-500">北斗 {primary.beidouName} · 奇门 {primary.qimenName}</div>
              </div>
              <div className="mt-4 border-t border-amber-200/70 pt-3 text-xs leading-6 text-stone-600">
                {chart.derivedIndicators?.elementRelation || '结合日干五行与所问事项综合判断。'}
                {chart.derivedIndicators?.directionalHint ? <div className="font-bold text-amber-800">方位提示：{chart.derivedIndicators.directionalHint}</div> : null}
              </div>
            </ChartPanel>
            <ChartPanel className="border-emerald-200/70 bg-emerald-50/35">
              <div className="mb-2 text-sm font-bold text-emerald-800">吉势</div>
              <ul className="space-y-2 text-xs leading-5 text-stone-600">
                {favorable.map((item) => <li key={item} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />{item}</li>)}
              </ul>
            </ChartPanel>
            <ChartPanel className="border-red-200/70 bg-red-50/30">
              <div className="mb-2 text-sm font-bold text-red-800">慎察</div>
              <ul className="space-y-2 text-xs leading-5 text-stone-600">
                {caution.map((item) => <li key={item} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />{item}</li>)}
              </ul>
            </ChartPanel>
          </div>
        </div>
        {chart.judgementAnchors?.primarySong ? (
          <div className="mt-5 border-t border-stone-200/70 pt-4 text-center">
            <div className="mb-2 text-xs font-bold tracking-[0.18em] text-stone-400">主星歌诀</div>
            <p className="font-['STKaiti','KaiTi','Songti_SC','serif'] text-sm leading-7 text-stone-600">{chart.judgementAnchors.primarySong}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const XIAOLIUREN_PALACES: Array<{ name: XiaoliurenStatus; element: string; direction: string; nature: string; cue: string }> = [
  { name: '大安', element: '木', direction: '东方', nature: '吉', cue: '安稳守成' },
  { name: '留连', element: '水', direction: '北方', nature: '凶', cue: '迟滞反复' },
  { name: '速喜', element: '火', direction: '南方', nature: '吉', cue: '迅速有喜' },
  { name: '赤口', element: '金', direction: '西方', nature: '凶', cue: '口舌争执' },
  { name: '小吉', element: '水', direction: '北方', nature: '吉', cue: '和合可成' },
  { name: '空亡', element: '土', direction: '中央', nature: '凶', cue: '虚耗无着' },
];

const polarPoint = (angle: number, radius: number) => {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: 180 + radius * Math.cos(radians), y: 180 + radius * Math.sin(radians) };
};
const ringPath = (index: number) => {
  const start = index * 60 - 30;
  const end = start + 60;
  const a = polarPoint(start, 148);
  const b = polarPoint(end, 148);
  const c = polarPoint(end, 72);
  const d = polarPoint(start, 72);
  return `M ${a.x} ${a.y} A 148 148 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A 72 72 0 0 0 ${d.x} ${d.y} Z`;
};

const XiaoliurenWheel = ({ chart }: { chart: XiaoliurenOutput }) => {
  const markers = [
    { label: '月', value: chart.monthStatus, color: '#16815f' },
    { label: '日', value: chart.dayStatus, color: '#b68424' },
    { label: '时', value: chart.hourStatus, color: '#c24132' },
  ];
  return (
    <svg viewBox="-12 -12 384 384" className="mx-auto h-auto w-full max-w-[520px]" role="img" aria-label="小六壬六宫轮盘">
      <circle cx="180" cy="180" r="164" fill="rgba(255,255,255,.38)" stroke="rgba(157,113,47,.28)" />
      {XIAOLIUREN_PALACES.map((palace, index) => {
        const labelPoint = polarPoint(index * 60, 110);
        const active = palace.name === chart.hourStatus;
        return (
          <g key={palace.name}>
            <path
              d={ringPath(index)}
              fill={active ? `${ELEMENT_HEX[palace.element]}20` : 'rgba(255,255,255,.58)'}
              stroke={active ? ELEMENT_HEX[palace.element] : 'rgba(120,103,79,.28)'}
              strokeWidth={active ? 2.2 : 1}
            />
            <text x={labelPoint.x} y={labelPoint.y - 3} textAnchor="middle" fill={ELEMENT_HEX[palace.element]} fontSize="18" fontWeight="700" fontFamily="STKaiti, KaiTi, serif">{palace.name}</text>
            <text x={labelPoint.x} y={labelPoint.y + 17} textAnchor="middle" fill="#a8a29e" fontSize="9">{index + 1} · {palace.element}</text>
          </g>
        );
      })}
      <circle cx="180" cy="180" r="62" fill="#292723" />
      <circle cx="180" cy="180" r="52" fill="none" stroke="rgba(243,211,139,.32)" />
      <text x="180" y="191" textAnchor="middle" fill="#f5d98e" fontSize="38">☯</text>
      <text x="180" y="218" textAnchor="middle" fill="#d6d3d1" fontSize="10">时落 · {chart.result?.name}</text>
      {markers.map((marker, markerIndex) => {
        const index = XIAOLIUREN_PALACES.findIndex((palace) => palace.name === marker.value);
        const point = polarPoint(Math.max(index, 0) * 60, 164 + markerIndex * 8);
        return (
          <g key={marker.label}>
            <circle cx={point.x} cy={point.y} r="8" fill={marker.color} stroke="white" strokeWidth="2" />
            <text x={point.x} y={point.y + 3} textAnchor="middle" fill="white" fontSize="8" fontWeight="700">{marker.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

export function XiaoliurenBoard({ data }: BoardProps) {
  const chart = data.detail_info?.xiaoliuren as unknown as XiaoliurenOutput | undefined;
  if (!chart?.result) return null;
  const steps = [
    ['月上起', chart.monthStatus, `农历${chart.input?.lunarMonth}月`, '#16815f'],
    ['日上落', chart.dayStatus, `农历${chart.input?.lunarDay}日`, '#b68424'],
    ['时上落', chart.hourStatus, chart.input?.shichen, '#c24132'],
  ] as const;
  return (
    <div className="glass-panel overflow-hidden rounded-[28px] border border-white/75">
      <div className="p-4 md:p-6">
        <BoardMasthead
          title="小六壬"
          subtitle={`六宫时课 · 时落 ${chart.result.name}`}
          date={toText(data.base_info?.gongli)}
          meta={`农历 ${chart.input?.lunarMonth || '—'}月${chart.input?.lunarDay || '—'}日 · ${chart.input?.shichen || '—'}`}
          question={data.base_info?.question}
        />
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(290px,0.85fr)]">
          <ChartPanel className="bg-[radial-gradient(circle_at_center,rgba(249,239,210,0.65),rgba(255,255,255,0.45)_62%)]">
            <SectionTitle title="六宫课盘" note="大安起 · 顺行六宫" />
            <XiaoliurenWheel chart={chart} />
            <div className="mt-2 grid grid-cols-3 gap-2 border-t border-stone-200/70 pt-3">
              {steps.map(([label, status, basis, color], index) => (
                <div key={label} className="relative text-center">
                  <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: color }}>{index + 1}</div>
                  <div className="mt-1 text-[9px] font-bold text-stone-400">{label}</div>
                  <div className="font-['STKaiti','KaiTi','Songti_SC','serif'] text-lg font-bold" style={{ color }}>{status}</div>
                  <div className="text-[9px] text-stone-400">{basis}</div>
                  {index < 2 ? <div className="absolute right-[-8px] top-3 h-px w-4 bg-stone-300" /> : null}
                </div>
              ))}
            </div>
          </ChartPanel>

          <div className="space-y-4">
            <ChartPanel>
              <SectionTitle title="起课信息" note="月 → 日 → 时" />
              <div className="relative space-y-3">
                {steps.map(([label, status, basis, color], index) => (
                  <div key={label} className="relative flex items-center gap-3 border-b border-stone-200/65 pb-3 last:border-b-0 last:pb-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>{label.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] text-stone-400">{label} · {basis}</div>
                      <div className="font-['STKaiti','KaiTi','Songti_SC','serif'] text-xl font-bold" style={{ color }}>落于 {status}</div>
                    </div>
                    {index < 2 ? <div className="absolute -bottom-3 left-4 h-3 w-px bg-stone-300" /> : null}
                  </div>
                ))}
              </div>
            </ChartPanel>
            <ChartPanel className={`${chart.result.nature === '吉' ? 'border-emerald-200/75 bg-emerald-50/35' : 'border-red-200/75 bg-red-50/30'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-bold tracking-[0.18em] text-stone-400">本宫释义</div>
                  <div className="mt-1 font-['STKaiti','KaiTi','Songti_SC','serif'] text-4xl font-bold" style={{ color: ELEMENT_HEX[chart.result.element] || '#292524' }}>{chart.result.name}</div>
                </div>
                <div className="flex gap-1"><ElementDot element={chart.result.element} /><ElementDot label={chart.result.nature} /></div>
              </div>
              <div className="mt-1 text-xs font-semibold text-stone-500">{chart.result.element} · {chart.result.direction} · {chart.result.nature}</div>
              <p className="mt-3 text-sm leading-7 text-stone-600">{chart.result.description}</p>
              {chart.result.poem ? <blockquote className="mt-3 border-l-2 border-amber-500/70 pl-3 font-['STKaiti','KaiTi','Songti_SC','serif'] text-sm leading-7 text-stone-600">{chart.result.poem}</blockquote> : null}
            </ChartPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
