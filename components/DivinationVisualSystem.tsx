import React from 'react';
import { getWuxingColor } from '../utils/wuxing';

export const ELEMENT_HEX: Record<string, string> = {
  木: '#16815f', 火: '#c24132', 土: '#a36f25', 金: '#b68424', 水: '#315f87',
};

const STEM_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const BRANCH_ELEMENT: Record<string, string> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金', 亥: '水', 子: '水',
};

export const elementOf = (value?: string) => {
  const char = Array.from(value || '').find((item) => STEM_ELEMENT[item] || BRANCH_ELEMENT[item]);
  return char ? STEM_ELEMENT[char] || BRANCH_ELEMENT[char] : '';
};

export const ChartMasthead = ({
  title,
  subtitle,
  date,
  meta,
  symbol = '☯',
  actions,
}: {
  title: string;
  subtitle?: string;
  date?: string;
  meta?: string;
  symbol?: string;
  actions?: React.ReactNode;
}) => (
  <header className="border-b border-stone-200/65 pb-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-300/80 bg-amber-50/70 font-['STKaiti','KaiTi','Songti_SC','serif'] text-lg text-amber-800 shadow-inner">
          {symbol}
          <span className="absolute inset-1 rounded-full border border-amber-500/25" />
        </div>
        <div className="min-w-0">
          <h2 className="display-title truncate text-2xl font-bold tracking-wide text-stone-950 md:text-3xl">{title}</h2>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-stone-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex items-start gap-2">
        {date || meta ? (
          <div className="rounded-xl border border-stone-200/70 bg-white/55 px-3 py-2 text-right text-[11px] leading-5 text-stone-500">
            {date ? <div>{date}</div> : null}
            {meta ? <div className="font-semibold text-stone-700">{meta}</div> : null}
          </div>
        ) : null}
        {actions}
      </div>
    </div>
  </header>
);

export const FourPillarsStrip = ({ pillars, compact = false }: { pillars: string[]; compact?: boolean }) => {
  const labels = ['年柱', '月柱', '日柱', '时柱'];
  return (
    <div className="grid grid-cols-4 divide-x divide-stone-200/70 overflow-hidden rounded-[18px] border border-stone-200/70 bg-white/56">
      {labels.map((label, index) => {
        const chars = Array.from(pillars[index] || '——');
        return (
          <div key={label} className={compact ? 'px-1 py-2 text-center' : 'px-2 py-3 text-center'}>
            <div className="text-[9px] font-bold tracking-[0.12em] text-stone-400">{label}</div>
            <div className={`mt-1 flex justify-center gap-0.5 font-['STKaiti','KaiTi','Songti_SC','serif'] font-bold ${compact ? 'text-lg' : 'text-xl md:text-2xl'}`}>
              <span className={getWuxingColor(chars[0])}>{chars[0] || '—'}</span>
              <span className={getWuxingColor(chars[1])}>{chars[1] || '—'}</span>
            </div>
            {!compact ? <div className="mt-0.5 text-[9px] text-stone-400">{elementOf(chars[0]) || '—'} · {elementOf(chars[1]) || '—'}</div> : null}
          </div>
        );
      })}
    </div>
  );
};

export const ChartSurface = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-[24px] border border-white/75 bg-white/48 p-4 shadow-[0_14px_40px_rgba(73,56,35,0.055)] backdrop-blur-xl md:p-5 ${className}`}>
    {children}
  </section>
);

export const ChartSectionTitle = ({ title, note }: { title: string; note?: string }) => (
  <div className="mb-3 flex items-baseline justify-between gap-3">
    <h3 className="font-['STKaiti','KaiTi','Songti_SC','serif'] text-lg font-bold text-stone-900 md:text-xl">{title}</h3>
    {note ? <span className="text-[10px] tracking-wide text-stone-400 md:text-xs">{note}</span> : null}
  </div>
);

export const ElementBadge = ({ value, label }: { value?: string; label?: string }) => {
  const element = elementOf(value) || value || '';
  return (
    <span
      className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-current/15 bg-white/70 px-1.5 text-[10px] font-bold"
      style={{ color: ELEMENT_HEX[element] || '#78716c' }}
    >
      {label || element || '·'}
    </span>
  );
};

export const HexagramLines = ({ mark, moving = [] }: { mark: string; moving?: number[] }) => {
  const lines = mark.split('').map((value, index) => ({
    isYang: value === '1',
    position: index + 1,
  })).reverse();
  return (
    <div className="flex w-16 flex-col gap-1.5" aria-label="六爻卦象">
      {lines.map((line) => {
        const isMoving = moving.includes(line.position);
        return (
          <div key={line.position} className="relative flex h-2.5 items-center justify-between">
            {line.isYang ? (
              <span className={`h-full w-full rounded-sm ${isMoving ? 'bg-red-600' : 'bg-stone-800'}`} />
            ) : (
              <>
                <span className={`h-full w-[43%] rounded-sm ${isMoving ? 'bg-red-600' : 'bg-stone-800'}`} />
                <span className={`h-full w-[43%] rounded-sm ${isMoving ? 'bg-red-600' : 'bg-stone-800'}`} />
              </>
            )}
            {isMoving ? <span className="absolute -right-3 h-1.5 w-1.5 rounded-full bg-red-500" /> : null}
          </div>
        );
      })}
    </div>
  );
};
