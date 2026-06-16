'use client';

import React from 'react';
import type { GenericTaibuResponse } from '../types';

type Props = {
  data: GenericTaibuResponse;
};

const SCORE_ITEMS = [
  { key: 'overall', label: '综合运势', color: 'bg-amber-500' },
  { key: 'career', label: '事业运', color: 'bg-blue-500' },
  { key: 'love', label: '感情运', color: 'bg-pink-500' },
  { key: 'wealth', label: '财运', color: 'bg-green-500' },
  { key: 'health', label: '健康运', color: 'bg-red-500' },
  { key: 'social', label: '人际运', color: 'bg-purple-500' },
] as const;

const LEVEL_VALUE: Record<string, number> = {
  大吉: 92,
  吉: 78,
  中吉: 65,
  平: 52,
  小凶: 40,
  凶: 30,
};

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

const ScoreBars = ({ fortune }: { fortune: any }) => (
  <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
    {SCORE_ITEMS.map((item) => {
      const level = String(fortune?.[item.key] || '平');
      const value = fortune?._chart?.[item.key] || fortune?.chartValueMap?.[item.key] || LEVEL_VALUE[level] || 52;
      return (
        <div key={item.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className="text-xs font-semibold text-stone-600">{item.label}</span>
            </div>
            <span className={`text-xs font-bold ${levelTone(level)}`}>{level}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className={`h-full rounded-full ${levelDot(level)} transition-all duration-700`} style={{ width: `${value}%` }} />
          </div>
        </div>
      );
    })}
  </div>
);

const TrendLine = ({ trend }: { trend: any[] }) => {
  if (!trend?.length) return null;
  const points = trend.map((item, index) => {
    const value = item.scores?.overall ?? 52;
    const x = trend.length === 1 ? 50 : (index / (trend.length - 1)) * 100;
    const y = 100 - Math.max(18, Math.min(92, value));
    return { x, y, value, label: item.date };
  });
  const polyline = points.map((item) => `${item.x},${item.y}`).join(' ');

  return (
    <div className="glass-panel-soft rounded-[26px] border border-white/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-stone-700">7日运势趋势</div>
        <div className="text-xs text-stone-400">综合指数</div>
      </div>
      <svg viewBox="0 0 100 100" className="h-48 w-full overflow-visible">
        <polyline points={polyline} fill="none" stroke="#0f7b6c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="2.4" fill="#0f7b6c" />
            <text x={point.x} y="108" textAnchor="middle" className="fill-stone-400 text-[5px]">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const DailyView = ({ data }: { data: GenericTaibuResponse }) => {
  const fortune = (data.detail_info as any)?.fortune || {};
  const almanac = fortune.almanac?.almanac || {};
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-stone-700">今日黄历</div>
              <div className="mt-1 text-2xl font-bold text-stone-900">{fortune.date || data.base_info?.date}</div>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-bold ${levelTone(fortune.overall || '平')} bg-white/70`}>
              {fortune.overall || '平'}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="text-xs font-bold text-emerald-700">宜</div>
              <div className="mt-2 text-sm leading-7 text-stone-700">{(almanac.yi || []).join('、') || '平常事宜'}</div>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
              <div className="text-xs font-bold text-red-600">忌</div>
              <div className="mt-2 text-sm leading-7 text-stone-700">{(almanac.ji || []).join('、') || '大事慎行'}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/60 px-4 py-3">
              <div className="text-[11px] text-stone-400">日干支</div>
              <div className="mt-1 text-sm font-bold text-stone-700">{fortune.dayStem}{fortune.dayBranch}</div>
            </div>
            <div className="rounded-2xl bg-white/60 px-4 py-3">
              <div className="text-[11px] text-stone-400">十神</div>
              <div className="mt-1 text-sm font-bold text-stone-700">{fortune.tenGod || '—'}</div>
            </div>
            <div className="rounded-2xl bg-white/60 px-4 py-3">
              <div className="text-[11px] text-stone-400">吉方位</div>
              <div className="mt-1 text-sm font-bold text-stone-700">{fortune.luckyDirection || '—'}</div>
            </div>
          </div>
        </div>

        <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="text-sm font-bold text-stone-700">运势分析</div>
            <div className="text-xs text-stone-400">幸运色：{fortune.luckyColor || '—'}</div>
          </div>
          <ScoreBars fortune={fortune} />
          <div className="mt-6 border-t border-white/70 pt-5">
            <div className="mb-3 text-sm font-bold text-stone-700">运势指引</div>
            <ol className="space-y-3">
              {(fortune.advice || []).map((item: string, index: number) => (
                <li key={item} className="flex gap-3 text-sm leading-7 text-stone-700">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/75 text-[10px] font-bold text-stone-500">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
      <TrendLine trend={fortune.trend || []} />
    </div>
  );
};

const MonthlyView = ({ data }: { data: GenericTaibuResponse }) => {
  const fortune = (data.detail_info as any)?.fortune || {};
  const calendar = Array.isArray(fortune.calendar) ? fortune.calendar : [];
  const firstDay = new Date(Number(fortune.year), Number(fortune.month) - 1, 1).getDay();
  return (
    <div className="space-y-4">
      <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
        <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
          <div className="border-b border-white/70 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-6">
            <div className="text-sm font-bold text-stone-700">{fortune.year}年{fortune.month}月</div>
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
                <div className={`h-full ${levelDot(fortune.overall || '平')}`} style={{ width: `${fortune._chart?.overall || 52}%` }} />
              </div>
            </div>
          </div>
          <div>
            <div className="mb-3 text-sm font-bold text-stone-700">运势批语</div>
            <p className="text-sm leading-8 text-stone-700">{fortune.summary || '本月宜稳中求进，结合日课安排节奏。'}</p>
            <div className="mt-5">
              <ScoreBars fortune={fortune} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-bold text-stone-700">每日运程</div>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />吉</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-stone-400" />平</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />凶</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {['日', '一', '二', '三', '四', '五', '六'].map((item) => (
            <div key={item} className="py-2 text-center text-xs font-semibold text-stone-400">{item}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, index) => <div key={`empty-${index}`} />)}
          {calendar.map((day: any) => (
            <div key={day.day} className="rounded-2xl border border-white/60 bg-white/55 px-2 py-3 text-center">
              <div className="text-sm font-semibold text-stone-600">{day.day}</div>
              <div className={`mx-auto mt-2 h-2 w-2 rounded-full ${levelDot(day.level)}`} />
              <div className={`mt-1 text-[11px] font-semibold ${levelTone(day.level)}`}>{day.level}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FortuneGrid: React.FC<Props> = ({ data }) => {
  const type = (data.detail_info as any)?.fortune?.type;
  return type === 'monthly' ? <MonthlyView data={data} /> : <DailyView data={data} />;
};

export default FortuneGrid;
