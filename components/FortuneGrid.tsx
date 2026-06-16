'use client';

import React, { useMemo, useState } from 'react';
import type { GenericTaibuResponse } from '../types';

type Props = {
  data: GenericTaibuResponse;
  onDateChange?: (date: Date) => void;
  onAsk?: (question: string) => void;
  isAsking?: boolean;
};

type DimensionKey = 'overall' | 'career' | 'love' | 'wealth' | 'health' | 'social';
type InterpretationMode = 'colloquial' | 'professional' | 'technical';

const SCORE_ITEMS: Array<{ key: DimensionKey; label: string; icon: string; color: string }> = [
  { key: 'overall', label: '综合运势', icon: '☆', color: 'text-orange-500' },
  { key: 'career', label: '事业运', icon: '▣', color: 'text-blue-500' },
  { key: 'love', label: '感情运', icon: '♡', color: 'text-pink-500' },
  { key: 'wealth', label: '财运', icon: '▤', color: 'text-emerald-500' },
  { key: 'health', label: '健康运', icon: '⌁', color: 'text-red-500' },
  { key: 'social', label: '人际运', icon: '♙', color: 'text-purple-500' },
];

const MODE_LABELS: Record<InterpretationMode, string> = {
  colloquial: '白话',
  professional: '专业',
  technical: '术语',
};

const MODE_PREFIX: Record<InterpretationMode, string> = {
  colloquial: '',
  professional: '从日主与流运关系看，',
  technical: '以十神、五行与日课结构参断，',
};

const LEVEL_VALUE: Record<string, number> = {
  大吉: 92,
  吉: 78,
  中吉: 65,
  平: 52,
  小凶: 40,
  凶: 30,
};

const levelValue = (level: string) => LEVEL_VALUE[level] || 52;

const levelTone = (level: string) => {
  if (level === '大吉' || level === '吉' || level === '中吉') return 'text-emerald-700';
  if (level === '平') return 'text-amber-700';
  return 'text-red-600';
};

const levelDot = (level: string) => {
  if (level === '大吉' || level === '吉' || level === '中吉') return 'bg-emerald-500';
  if (level === '平') return 'bg-stone-400';
  return 'bg-red-500';
};

const levelBar = (level: string) => {
  if (level === '大吉' || level === '吉' || level === '中吉') return 'bg-emerald-500';
  if (level === '平') return 'bg-amber-500';
  return 'bg-red-500';
};

const parseDate = (value?: string) => {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};

const formatDateZh = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
};

const shiftDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const shiftMonth = (year: number, month: number, offset: number) => {
  const next = new Date(year, month - 1 + offset, 1);
  return next;
};

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const ChipList = ({ items, tone = 'neutral', limit }: { items: string[]; tone?: 'good' | 'bad' | 'neutral'; limit?: number }) => {
  const shown = typeof limit === 'number' ? items.slice(0, limit) : items;
  if (!shown.length) return <span className="text-sm text-stone-400">暂无</span>;
  const cls = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : tone === 'bad'
      ? 'border-red-200 bg-red-50 text-red-600'
      : 'border-stone-200 bg-white/65 text-stone-600';
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((item) => (
        <span key={item} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${cls}`}>{item}</span>
      ))}
      {typeof limit === 'number' && items.length > limit && (
        <span className="rounded-lg border border-stone-200 bg-white/50 px-2.5 py-1 text-xs text-stone-400">+{items.length - limit}</span>
      )}
    </div>
  );
};

const ShareDialog = ({
  open,
  title,
  lines,
  onClose,
}: {
  open: boolean;
  title: string;
  lines: string[];
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const text = [title, ...lines].filter(Boolean).join('\n');
  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_30px_90px_rgba(28,25,23,0.22)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-lg font-bold text-stone-800">分享摘要</div>
          <button type="button" onClick={onClose} className="rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-500 hover:bg-stone-50">
            关闭
          </button>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-stone-50/80 p-4 text-sm leading-7 text-stone-700">
          <div className="mb-2 text-base font-bold text-stone-900">{title}</div>
          {lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <button type="button" onClick={handleCopy} className="mt-4 w-full rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-amber-200 transition hover:bg-stone-800">
          {copied ? '已复制' : '复制摘要'}
        </button>
      </div>
    </div>
  );
};

const ScoreBars = ({ fortune }: { fortune: any }) => (
  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
    {SCORE_ITEMS.map((item) => {
      const level = String(fortune?.[item.key] || '平');
      const value = fortune?._chart?.[item.key] || fortune?.chartValueMap?.[item.key] || levelValue(level);
      return (
        <div key={item.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-lg leading-none ${item.color}`}>{item.icon}</span>
              <span className="text-sm font-semibold text-stone-600">{item.label}</span>
            </div>
            <span className={`text-sm font-bold ${levelTone(level)}`}>{level}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className={`h-full rounded-full ${levelBar(level)} transition-all duration-700`} style={{ width: `${Math.max(8, Math.min(100, value))}%` }} />
          </div>
        </div>
      );
    })}
  </div>
);

const FortuneTrendChart = ({
  trend,
  selectedDate,
}: {
  trend: any[];
  selectedDate?: string;
}) => {
  const [dimension, setDimension] = useState<DimensionKey>('overall');
  const points = useMemo(() => {
    if (!trend?.length) return [];
    return trend.map((item, index) => {
      const value = item.scores?.[dimension] ?? item.scores?.overall ?? 52;
      const x = trend.length === 1 ? 50 : (index / (trend.length - 1)) * 100;
      const y = 100 - Math.max(12, Math.min(92, value));
      return { x, y, value, label: item.date, fullDate: item.fullDate };
    });
  }, [trend, dimension]);

  if (!points.length) return null;
  const trendDirection = points[points.length - 1].value - points[0].value;
  const polyline = points.map((item) => `${item.x},${item.y}`).join(' ');

  return (
    <div className="glass-panel-soft rounded-[26px] border border-white/60 p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold text-stone-800">7日运势趋势</div>
          <div className={`text-sm font-bold ${trendDirection > 5 ? 'text-emerald-600' : trendDirection < -5 ? 'text-red-500' : 'text-stone-500'}`}>
            趋势：{trendDirection > 5 ? '上升' : trendDirection < -5 ? '下降' : '平稳'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCORE_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDimension(item.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                dimension === item.key ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/65 text-stone-500 hover:bg-white'
              }`}
            >
              {item.label.replace('运势', '').replace('运', '')}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 100 100" className="h-64 w-full overflow-visible rounded-[24px] border border-stone-100 bg-white/45 px-2">
        {[20, 40, 60, 80].map((line) => (
          <line key={line} x1="0" y1={100 - line} x2="100" y2={100 - line} stroke="#e7e5e4" strokeWidth="0.35" strokeDasharray="1.5 2" />
        ))}
        <polyline points={polyline} fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => {
          const active = selectedDate && point.fullDate === selectedDate;
          return (
            <g key={point.fullDate}>
              <circle cx={point.x} cy={point.y} r={active ? '4.2' : '2.2'} fill="#f59e0b" stroke={active ? '#fff7ed' : '#ffffff'} strokeWidth={active ? '2.2' : '0.8'} />
              <text x={point.x} y="108" textAnchor="middle" className="fill-stone-500 text-[5px]">{point.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const AskPanel = ({
  title,
  dateText,
  suggestions,
  onAsk,
  isAsking,
}: {
  title: string;
  dateText: string;
  suggestions: string[];
  onAsk?: (question: string) => void;
  isAsking?: boolean;
}) => {
  const [draft, setDraft] = useState('');
  const submit = (text = draft) => {
    const question = text.trim();
    if (!question || !onAsk || isAsking) return;
    onAsk(question);
    setDraft('');
  };

  return (
    <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
      <div className="border-b border-white/70 pb-4">
        <div className="text-lg font-bold text-stone-800">{title}</div>
        <div className="mt-1 text-sm text-stone-500">针对选中日期提出问题，确认后才会请求 AI 解答。</div>
      </div>
      <div className="mt-5 rounded-2xl border border-stone-200/80 bg-white/55 p-4">
        <div className="text-sm font-bold text-stone-700">选中日期</div>
        <div className="mt-2 text-xl font-bold text-stone-900">{dateText}</div>
      </div>
      <div className="mt-5 flex gap-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          placeholder={`询问关于${dateText}的问题...`}
          className="glass-input min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={!draft.trim() || !onAsk || isAsking}
          className="glass-cta rounded-2xl px-5 py-3 text-sm font-bold text-amber-300 disabled:opacity-50"
        >
          提问
        </button>
      </div>
      <div className="mt-5">
        <div className="mb-3 text-sm font-bold text-stone-600">建议问题：</div>
        <div className="grid gap-3 md:grid-cols-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => submit(item)}
              disabled={!onAsk || isAsking}
              className="rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-left text-sm font-semibold text-stone-700 transition hover:bg-white disabled:opacity-50"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const DirectionGrid = ({ directions }: { directions?: Record<string, string> }) => {
  const items = [
    ['caiShen', '财神位'],
    ['xiShen', '喜神位'],
    ['fuShen', '福神位'],
    ['yangGui', '阳贵神'],
    ['yinGui', '阴贵神'],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([key, label]) => (
        <div key={key} className="rounded-2xl border border-white/60 bg-white/50 px-4 py-3">
          <div className="text-xs text-stone-400">{label}</div>
          <div className="mt-1 text-sm font-bold text-stone-700">{directions?.[key] || '—'}</div>
        </div>
      ))}
    </div>
  );
};

const DailyView = ({ data, onDateChange, onAsk, isAsking }: Props) => {
  const [mode, setMode] = useState<InterpretationMode>('colloquial');
  const [showHours, setShowHours] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const fortune = (data.detail_info as any)?.fortune || {};
  const almanacPayload = fortune.almanac || {};
  const almanac = almanacPayload.almanac || {};
  const currentDate = parseDate(fortune.date || String(data.base_info?.date || ''));
  const yi = asList(almanac.suitable || almanac.yi);
  const ji = asList(almanac.avoid || almanac.ji);
  const hourly = Array.isArray(almanac.hourlyFortune) ? almanac.hourlyFortune : [];
  const advice = Array.isArray(fortune.advice) ? fortune.advice : [];

  const modeAdvice = advice.map((item: string) => {
    if (mode === 'professional') return item.replace('适合', '宜').replace('建议', '可酌情');
    if (mode === 'technical') return `以${fortune.tenGod || '主神'}、日课宜忌参看：${item}`;
    return item;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <div className="glass-panel-soft overflow-hidden rounded-[28px] border border-white/60">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/70 p-5 md:p-6">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => onDateChange?.(shiftDate(currentDate, -1))} className="rounded-full border border-white/70 bg-white/60 px-3 py-2 text-stone-500 hover:bg-white">‹</button>
              <div>
                <div className="text-2xl font-bold text-stone-900">{formatDateZh(currentDate)}</div>
                <div className="mt-1 text-sm text-stone-500">农历 {almanac.lunarDate || '—'}</div>
              </div>
              <button type="button" onClick={() => onDateChange?.(shiftDate(currentDate, 1))} className="rounded-full border border-white/70 bg-white/60 px-3 py-2 text-stone-500 hover:bg-white">›</button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="text-stone-500">流日：<span className="font-bold text-amber-600">{fortune.dayStem}{fortune.dayBranch}</span></div>
              <div className="text-stone-500">主神：<span className="font-bold text-stone-800">{fortune.tenGod || '—'}</span></div>
              <div className={`rounded-full bg-white/70 px-3 py-1 font-bold ${levelTone(fortune.overall || '平')}`}>{fortune.overall || '平'}</div>
            </div>
          </div>

          <div className="space-y-6 p-5 md:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-bold text-emerald-700">宜</div>
                <ChipList items={yi} tone="good" />
              </div>
              <div>
                <div className="mb-2 text-sm font-bold text-red-600">忌</div>
                <ChipList items={ji} tone="bad" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
                <div className="mb-3 text-sm font-bold text-stone-700">吉神</div>
                <ChipList items={asList(almanac.jishen)} tone="good" limit={8} />
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
                <div className="mb-3 text-sm font-bold text-stone-700">凶煞</div>
                <ChipList items={asList(almanac.xiongsha)} tone="bad" limit={8} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['冲煞', almanac.chongSha],
                ['空亡', almanacPayload.kongWang],
                ['胎神', almanac.taiShen],
                ['天神', `${almanac.tianShen || '—'}${almanac.tianShenType ? `（${almanac.tianShenType}）` : ''}`],
                ['二十八宿', `${almanac.lunarMansion || '—'}${almanac.lunarMansionLuck ? `（${almanac.lunarMansionLuck}）` : ''}`],
                ['纳音', almanac.nayin],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/60 bg-white/50 px-4 py-3">
                  <div className="text-xs text-stone-400">{label}</div>
                  <div className="mt-1 text-sm font-bold text-stone-700">{value || '—'}</div>
                </div>
              ))}
            </div>

            <DirectionGrid directions={almanac.directions} />

            {almanac.lunarMansionSong && (
              <div className="rounded-2xl border border-white/60 bg-white/50 p-4 text-sm leading-7 text-stone-600">
                <span className="font-bold text-stone-700">宿曜歌诀：</span>{almanac.lunarMansionSong}
              </div>
            )}

            {hourly.length > 0 && (
              <div className="border-t border-white/70 pt-5">
                <button type="button" onClick={() => setShowHours(!showHours)} className="flex w-full items-center justify-between text-left text-sm font-bold text-stone-700">
                  十二时辰吉凶
                  <span className="text-stone-400">{showHours ? '收起' : '展开'}</span>
                </button>
                {showHours && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {hourly.slice(0, 12).map((item: any) => (
                      <div key={item.ganZhi} className="rounded-2xl border border-white/60 bg-white/50 px-4 py-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="font-bold text-stone-800">{item.ganZhi}</span>
                          <span className={item.tianShenLuck === '吉' ? 'text-emerald-600' : 'text-red-500'}>{item.tianShen} · {item.tianShenLuck}</span>
                        </div>
                        <div className="mt-2 text-xs leading-6 text-stone-500">冲{item.chong} 煞{item.sha}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <FortuneTrendChart trend={fortune.trend || []} selectedDate={fortune.date} />
          <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-stone-800">运势分析</div>
                <div className="mt-1 text-sm text-stone-400">日干支：{fortune.dayStem}{fortune.dayBranch}</div>
              </div>
              <button type="button" onClick={() => setShareOpen(true)} className="rounded-2xl border border-white/70 bg-white/60 px-4 py-2 text-sm font-bold text-stone-600">分享</button>
            </div>
            <ScoreBars fortune={fortune} />
            <div className="mt-6 grid gap-4 border-t border-white/70 pt-5 sm:grid-cols-2">
              <div>
                <div className="text-xs text-stone-400">幸运色</div>
                <div className="mt-1 text-xl font-bold text-stone-800">{fortune.luckyColor || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400">吉方位</div>
                <div className="mt-1 text-xl font-bold text-stone-800">{fortune.luckyDirection || '—'}</div>
              </div>
            </div>
            <div className="mt-6 border-t border-white/70 pt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-lg font-bold text-stone-800">运势指引</div>
                <div className="rounded-2xl bg-white/55 p-1">
                  {(Object.keys(MODE_LABELS) as InterpretationMode[]).map((item) => (
                    <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-xl px-3 py-1.5 text-xs font-bold ${mode === item ? 'bg-sky-500 text-white' : 'text-stone-500'}`}>
                      {MODE_LABELS[item]}
                    </button>
                  ))}
                </div>
              </div>
              <ol className="space-y-3">
                {modeAdvice.map((item: string, index: number) => (
                  <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-7 text-stone-700">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/70 text-xs font-bold text-stone-500">{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <AskPanel
        title="日历智能问答"
        dateText={formatDateZh(currentDate)}
        onAsk={onAsk}
        isAsking={isAsking}
        suggestions={[
          '这一天适合做什么事情？',
          '这一天有什么需要注意的？',
          '这一天的吉凶如何？',
          '这一天适合出行吗？',
          '这一天适合签约或开业吗？',
          '这一天的财运如何？',
        ]}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${formatDateZh(currentDate)} 运势`}
        lines={[
          `综合：${fortune.overall || '平'}，主神：${fortune.tenGod || '—'}`,
          `事业：${fortune.career || '平'}，感情：${fortune.love || '平'}，财运：${fortune.wealth || '平'}`,
          `幸运色：${fortune.luckyColor || '—'}，吉方位：${fortune.luckyDirection || '—'}`,
          `建议：${advice.slice(0, 3).join(' ') || '稳中求进，顺势而为。'}`,
        ]}
      />
    </div>
  );
};

const MonthlyTrend = ({ calendar }: { calendar: any[] }) => {
  const [dimension, setDimension] = useState<DimensionKey>('overall');
  const points = useMemo(() => {
    const sample = calendar.filter((_: any, index: number) => index % 3 === 0 || index === calendar.length - 1);
    return sample.map((item: any, index: number) => {
      const value = item.scores?.[dimension] ?? item.scores?.overall ?? levelValue(item.level);
      const x = sample.length === 1 ? 50 : (index / (sample.length - 1)) * 100;
      const y = 100 - Math.max(12, Math.min(92, value));
      return { x, y, label: `${item.day}`, value };
    });
  }, [calendar, dimension]);
  if (!points.length) return null;
  const polyline = points.map((item) => `${item.x},${item.y}`).join(' ');
  return (
    <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-bold text-stone-800">运势起伏</div>
        <div className="flex flex-wrap gap-2">
          {SCORE_ITEMS.map((item) => (
            <button key={item.key} type="button" onClick={() => setDimension(item.key)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${dimension === item.key ? 'bg-indigo-500 text-white' : 'bg-white/65 text-stone-500'}`}>
              {item.label.replace('运势', '').replace('运', '')}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 100 100" className="h-64 w-full overflow-visible rounded-[24px] border border-stone-100 bg-white/45">
        {[20, 40, 60, 80].map((line) => (
          <line key={line} x1="0" y1={100 - line} x2="100" y2={100 - line} stroke="#e7e5e4" strokeWidth="0.35" strokeDasharray="1.5 2" />
        ))}
        <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="2.2" fill="#6366f1" stroke="#fff" strokeWidth="0.9" />
            <text x={point.x} y="108" textAnchor="middle" className="fill-stone-500 text-[5px]">{point.label}日</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const MonthlyView = ({ data, onDateChange, onAsk, isAsking }: Props) => {
  const [mode, setMode] = useState<InterpretationMode>('colloquial');
  const [shareOpen, setShareOpen] = useState(false);
  const fortune = (data.detail_info as any)?.fortune || {};
  const calendar = Array.isArray(fortune.calendar) ? fortune.calendar : [];
  const year = Number(fortune.year || new Date().getFullYear());
  const month = Number(fortune.month || new Date().getMonth() + 1);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const monthDate = new Date(year, month - 1, 1);
  const monthlyGuide = useMemo(() => {
    const base = [
      `综合为${fortune.overall || '平'}，本月宜先定节奏，再处理关键事项。`,
      `事业为${fortune.career || '平'}，重要沟通尽量提前准备方案和边界。`,
      `财运为${fortune.wealth || '平'}，支出与合作事项以可验证信息为准。`,
      `感情为${fortune.love || '平'}，少用试探，多用明确表达。`,
    ];
    return base.map((item) => `${MODE_PREFIX[mode]}${item}`);
  }, [fortune.career, fortune.love, fortune.overall, fortune.wealth, mode]);
  return (
    <div className="space-y-6">
      <div className="glass-panel-soft overflow-hidden rounded-[28px] border border-white/60">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/70 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onDateChange?.(shiftMonth(year, month, -1))} className="rounded-full border border-white/70 bg-white/60 px-3 py-2 text-stone-500 hover:bg-white">‹</button>
            <div className="text-center">
              <div className="text-2xl font-bold text-stone-900">{year}年 {month}月</div>
              <button type="button" onClick={() => onDateChange?.(new Date())} className="mt-1 text-xs text-stone-500 hover:text-stone-800">回到本月</button>
            </div>
            <button type="button" onClick={() => onDateChange?.(shiftMonth(year, month, 1))} className="rounded-full border border-white/70 bg-white/60 px-3 py-2 text-stone-500 hover:bg-white">›</button>
          </div>
          <div className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm text-stone-600">
            命主：<span className="font-bold text-indigo-600">{String(data.base_info?.name || '当前命例')}</span>
          </div>
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-[0.85fr_1.15fr] md:p-6">
          <div className="border-b border-white/70 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-6">
            <div className="text-sm font-bold text-stone-500">本月能量</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-stone-900">{fortune.monthStem}{fortune.monthBranch}</span>
              <span className="text-sm text-stone-500">月</span>
            </div>
            <div className="mt-4 inline-flex rounded-2xl bg-white/65 px-4 py-2 text-sm text-stone-600">
              主运十神：<span className="ml-1 font-bold text-stone-800">{fortune.tenGod || '—'}</span>
            </div>
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-stone-500">
                <span>综合运势</span>
                <span className={levelTone(fortune.overall || '平')}>{fortune.overall || '平'}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/70">
                <div className={`h-full ${levelBar(fortune.overall || '平')}`} style={{ width: `${fortune._chart?.overall || 52}%` }} />
              </div>
            </div>
          </div>
          <div>
            <div className="mb-3 text-lg font-bold text-stone-800">运势批语</div>
            <p className="text-sm leading-8 text-stone-700">{fortune.summary || '本月宜稳中求进，结合每日运程安排节奏。'}</p>
            <div className="mt-6">
              <ScoreBars fortune={fortune} />
            </div>
            <div className="mt-6 border-t border-white/70 pt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-lg font-bold text-stone-800">本月指引</div>
                <div className="rounded-2xl bg-white/55 p-1">
                  {(Object.keys(MODE_LABELS) as InterpretationMode[]).map((item) => (
                    <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-xl px-3 py-1.5 text-xs font-bold ${mode === item ? 'bg-indigo-500 text-white' : 'text-stone-500'}`}>
                      {MODE_LABELS[item]}
                    </button>
                  ))}
                </div>
              </div>
              <ol className="space-y-3">
                {monthlyGuide.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-7 text-stone-700">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/70 text-xs font-bold text-stone-500">{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <MonthlyTrend calendar={calendar} />

      <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-lg font-bold text-stone-800">每日运程</div>
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-stone-500">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />吉</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-stone-400" />平</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />凶</span>
            <button type="button" onClick={() => setShareOpen(true)} className="rounded-full border border-white/70 bg-white/60 px-3 py-1.5 font-bold text-stone-600">
              分享
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {['日', '一', '二', '三', '四', '五', '六'].map((item) => (
            <div key={item} className="py-2 text-center text-xs font-semibold text-stone-400">{item}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, index) => <div key={`empty-${index}`} />)}
          {calendar.map((day: any) => {
            const dayDate = new Date(year, month - 1, Number(day.day || 1));
            const isToday = new Date().toDateString() === dayDate.toDateString();
            return (
              <button
                key={day.day}
                type="button"
                onClick={() => onDateChange?.(dayDate)}
                className={`rounded-2xl border px-2 py-3 text-center transition hover:-translate-y-0.5 hover:bg-white ${
                  isToday ? 'border-indigo-200 bg-indigo-50/80 ring-1 ring-indigo-200' : 'border-white/60 bg-white/45'
                }`}
              >
                <div className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : 'text-stone-600'}`}>{day.day}</div>
                <div className={`mx-auto mt-2 h-2 w-2 rounded-full ${levelDot(day.level)}`} />
                <div className={`mt-1 text-[11px] font-semibold ${levelTone(day.level)}`}>{day.level}</div>
              </button>
            );
          })}
        </div>
      </div>

      <AskPanel
        title="月运智能问答"
        dateText={`${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`}
        onAsk={onAsk}
        isAsking={isAsking}
        suggestions={[
          '这个月整体需要把握什么重点？',
          '这个月事业运如何？',
          '这个月财运应该注意什么？',
          '这个月感情运如何？',
          '这个月哪几天更适合行动？',
          '这个月有什么需要避开的风险？',
        ]}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${year}年${month}月运势`}
        lines={[
          `流月：${fortune.monthStem || ''}${fortune.monthBranch || ''}，主运十神：${fortune.tenGod || '—'}`,
          `综合：${fortune.overall || '平'}，事业：${fortune.career || '平'}，财运：${fortune.wealth || '平'}`,
          `感情：${fortune.love || '平'}，健康：${fortune.health || '平'}，人际：${fortune.social || '平'}`,
          `总结：${fortune.summary || '本月宜稳中求进，结合每日运程安排节奏。'}`,
        ]}
      />
    </div>
  );
};

const FortuneGrid: React.FC<Props> = (props) => {
  const type = (props.data.detail_info as any)?.fortune?.type;
  return type === 'monthly' ? <MonthlyView {...props} /> : <DailyView {...props} />;
};

export default FortuneGrid;
