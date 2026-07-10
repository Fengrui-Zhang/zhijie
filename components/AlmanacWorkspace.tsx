'use client';

import React, { useMemo, useState } from 'react';
import type { GenericTaibuResponse } from '../types';
import DialogPortal, { DialogBody } from './DialogPortal';

export type AlmanacCaseOption = {
  id: string;
  title: string;
};

export type AlmanacSelectionInput = {
  matter: string;
  startDate: string;
  endDate: string;
  caseId: string;
};

export type AlmanacSelectionResult = {
  summary: string;
  selected: Array<{
    date: string;
    label: string;
    score: number;
    reasons: string[];
    cautions: string[];
    recommendedHours?: Array<{
      ganZhi: string;
      label: string;
      reason: string;
      caution?: string;
    }>;
    suitable?: string[];
    avoid?: string[];
  }>;
  notes?: string[];
  sessionId?: string;
};

type Props = {
  data: GenericTaibuResponse | null;
  selectedDate: string;
  loading?: boolean;
  onDateChange: (date: string) => void;
  caseOptions: AlmanacCaseOption[];
  selectedCaseId: string;
  onCaseChange: (caseId: string) => void;
  onRunSelection: (input: AlmanacSelectionInput) => Promise<void>;
  selectionResult: AlmanacSelectionResult | null;
  selectionLoading?: boolean;
  userQuota?: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const parseDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
};

const toDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (value: string, days: number) => {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
};

const formatDateZh = (value: string) => {
  const date = parseDate(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const weekdayZh = (value: string) => {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return days[parseDate(value).getDay()];
};

const SHICHEN_RANGES: Record<string, string> = {
  子: '23:00-01:00',
  丑: '01:00-03:00',
  寅: '03:00-05:00',
  卯: '05:00-07:00',
  辰: '07:00-09:00',
  巳: '09:00-11:00',
  午: '11:00-13:00',
  未: '13:00-15:00',
  申: '15:00-17:00',
  酉: '17:00-19:00',
  戌: '19:00-21:00',
  亥: '21:00-23:00',
};

const formatHourRange = (ganZhi?: string) => {
  const branch = typeof ganZhi === 'string' ? ganZhi.charAt(1) : '';
  return SHICHEN_RANGES[branch] || '';
};

const gentleHourState = (hour: any) => {
  if (hour?.tianShenType === '黄道' || hour?.tianShenLuck === '吉') return '顺';
  return '慎';
};

const levelTone = (score: number) => {
  if (score >= 82) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 66) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-stone-50 text-stone-600 border-stone-200';
};

const getAlmanacPayload = (data: GenericTaibuResponse | null) => {
  const root = (data?.detail_info as any)?.almanac || {};
  const inner = root.almanac || root;
  return { root, inner };
};

const ChipList = ({
  title,
  items,
  tone,
  limit = 8,
}: {
  title: string;
  items: string[];
  tone: 'good' | 'bad' | 'neutral';
  limit?: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? items : items.slice(0, limit);
  const toneClass =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'bad'
        ? 'border-rose-200 bg-rose-50 text-rose-600'
        : 'border-stone-200 bg-stone-50 text-stone-600';

  return (
    <div>
      <div className={`mb-2 text-sm font-bold ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-stone-700'}`}>
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {(display.length ? display : ['暂无']).map((item, index) => (
          <span key={`${item}-${index}`} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
            {item}
          </span>
        ))}
        {items.length > limit && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${toneClass}`}
          >
            {expanded ? '收起' : `+${items.length - limit}`}
          </button>
        )}
      </div>
    </div>
  );
};

const InfoGrid = ({ entries }: { entries: Array<[string, unknown]> }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {entries.filter(([, value]) => value !== undefined && value !== null && String(value).trim()).map(([label, value]) => (
      <div key={label} className="rounded-2xl border border-stone-100 bg-white/70 px-4 py-3">
        <div className="text-xs font-semibold text-stone-400">{label}</div>
        <div className="mt-1 text-sm font-bold leading-6 text-stone-700">{String(value)}</div>
      </div>
    ))}
  </div>
);

const buildDateRange = (startDate: string, endDate: string) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const count = Math.max(0, Math.min(60, Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS);
    return toDateOnly(date);
  });
};

const AlmanacWorkspace: React.FC<Props> = ({
  data,
  selectedDate,
  loading,
  onDateChange,
  caseOptions,
  selectedCaseId,
  onCaseChange,
  onRunSelection,
  selectionResult,
  selectionLoading,
  userQuota,
}) => {
  const { root, inner } = getAlmanacPayload(data);
  const dayInfo = root.dayInfo || {};
  const yi = asList(inner.suitable || inner.yi);
  const ji = asList(inner.avoid || inner.ji);
  const jishen = asList(inner.jishen || inner.jiShen);
  const xiongsha = asList(inner.xiongsha || inner.xiongSha);
  const directions = inner.directions || {};
  const hourlyFortune = Array.isArray(inner.hourlyFortune) ? inner.hourlyFortune : [];
  const [matter, setMatter] = useState('');
  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState(addDays(selectedDate, 14));
  const [activeRecommendation, setActiveRecommendation] = useState<AlmanacSelectionResult['selected'][number] | null>(null);

  const selectedDates = useMemo(
    () => new Set((selectionResult?.selected || []).map((item) => item.date)),
    [selectionResult]
  );
  const dateRange = useMemo(() => buildDateRange(startDate, endDate), [startDate, endDate]);

  const applyQuickRange = (days: number) => {
    setStartDate(selectedDate);
    setEndDate(addDays(selectedDate, days - 1));
  };

  const openRecommendation = (item: AlmanacSelectionResult['selected'][number]) => {
    setActiveRecommendation(item);
    onDateChange(item.date);
  };

  const currentDateMatchesModal = Boolean(activeRecommendation && activeRecommendation.date === selectedDate);
  const goodHours = hourlyFortune.filter((hour: any) => (
    hour?.tianShenType === '黄道' ||
    hour?.tianShenLuck === '吉' ||
    asList(hour?.suitable).some((entry) => ['开市', '交易', '嫁娶', '入宅', '出行', '纳财', '祈福', '求嗣'].some((keyword) => entry.includes(keyword)))
  ));

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="rounded-[24px] border border-stone-100 bg-white/80 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-stone-100 px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <button
              type="button"
              onClick={() => onDateChange(addDays(selectedDate, -1))}
              className="h-10 w-10 rounded-full border border-stone-200 bg-white text-xl text-stone-500 transition hover:bg-stone-50"
              aria-label="前一天"
            >
              ‹
            </button>
            <div className="min-w-0 text-center">
              <div className="flex flex-wrap items-baseline justify-center gap-2">
                <h2 className="text-2xl font-bold text-stone-900 md:text-3xl">{formatDateZh(selectedDate)}</h2>
                <span className="text-sm font-bold text-sky-500">{weekdayZh(selectedDate)}</span>
              </div>
              <div className="mt-1 text-sm text-stone-500">农历 {String(inner.lunarDate || '—')}</div>
            </div>
            <button
              type="button"
              onClick={() => onDateChange(addDays(selectedDate, 1))}
              className="h-10 w-10 rounded-full border border-stone-200 bg-white text-xl text-stone-500 transition hover:bg-stone-50"
              aria-label="后一天"
            >
              ›
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-stone-600">
            <button
              type="button"
              onClick={() => onDateChange(toDateOnly(new Date()))}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 font-semibold transition hover:bg-stone-50"
            >
              回到今日
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 font-semibold outline-none"
            />
          </div>
        </div>

        <div className="space-y-5 px-4 py-5 md:px-6">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-12 text-center text-sm text-stone-500">
              正在加载黄历...
            </div>
          ) : (
            <>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <span className="text-stone-500">干支：</span>
                  <span><b>{String((dayInfo as any).ganZhi || '')}</b>日</span>
                  <span>{String((dayInfo as any).stem || '')}{String((dayInfo as any).branch || '')}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <span className="text-stone-500">生肖：</span>
                  <span>{String(inner.zodiac || '—')}</span>
                  <span className="text-stone-500">纳音：</span>
                  <span>{String(inner.nayin || '—')}</span>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <ChipList title="宜" items={yi} tone="good" />
                <ChipList title="忌" items={ji} tone="bad" />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <ChipList title="吉神" items={jishen} tone="good" limit={6} />
                <ChipList title="凶煞" items={xiongsha} tone="bad" limit={6} />
              </div>

              <InfoGrid
                entries={[
                  ['冲煞', inner.chongSha],
                  ['空亡', root.kongWang || inner.kongWang],
                  ['胎神', inner.taiShen],
                  ['值神', `${inner.tianShen || '—'}${inner.tianShenType ? `（${inner.tianShenType}）` : ''}`],
                  ['二十八宿', `${inner.lunarMansion || '—'}${inner.lunarMansionLuck ? `（${inner.lunarMansionLuck}）` : ''}`],
                  ['财神位', (directions as any).caiShen],
                  ['喜神位', (directions as any).xiShen],
                  ['福神位', (directions as any).fuShen],
                ]}
              />
            </>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-stone-100 bg-white/80 p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-stone-900">智能择吉</h3>
            <p className="mt-1 text-sm text-stone-500">输入事项和日期范围后，页面会高亮推荐日期。</p>
          </div>
          {caseOptions.length > 0 && (
            <select
              value={selectedCaseId}
              onChange={(event) => onCaseChange(event.target.value)}
              className="min-w-[180px] rounded-2xl border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-amber-700 outline-none"
            >
              <option value="">不绑定命主</option>
              {caseOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
          <input
            value={matter}
            onChange={(event) => setMatter(event.target.value)}
            placeholder="例如：签合同、开业、搬家、领证"
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-300"
          />
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[7, 15, 30, 60].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => applyQuickRange(days)}
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-white"
            >
              未来{days}天
            </button>
          ))}
          <button
            type="button"
            disabled={selectionLoading || !matter.trim()}
            onClick={() => onRunSelection({ matter, startDate, endDate, caseId: selectedCaseId })}
            className="ml-auto rounded-full bg-stone-900 px-5 py-2 text-sm font-bold text-amber-200 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {selectionLoading ? '筛选中...' : '智能择吉 · 1点'}
          </button>
          <span className="w-full text-right text-[11px] text-stone-400">
            成功后扣1点{typeof userQuota === 'number' ? ` · 剩余${userQuota}点` : ''}
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50/60 p-3">
          <div className="mb-3 text-sm font-bold text-stone-700">日期范围</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10">
            {dateRange.map((date) => {
              const highlighted = selectedDates.has(date);
              const parsed = parseDate(date);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onDateChange(date)}
                  className={`rounded-2xl border px-2 py-2 text-center text-xs transition ${
                    highlighted
                      ? 'border-amber-300 bg-amber-100 text-amber-800 shadow-sm'
                      : date === selectedDate
                        ? 'border-stone-900 bg-white text-stone-900'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold">{parsed.getMonth() + 1}/{parsed.getDate()}</div>
                  <div className="mt-0.5">{highlighted ? '推荐' : weekdayZh(date).replace('星期', '周')}</div>
                </button>
              );
            })}
          </div>
        </div>

        {selectionResult && (
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm font-semibold leading-7 text-amber-800">
              {selectionResult.summary}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {selectionResult.selected.map((item) => (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => openRecommendation(item)}
                  className="rounded-2xl border border-stone-100 bg-white p-4 text-left shadow-sm transition hover:border-amber-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-stone-900">{formatDateZh(item.date)}</div>
                      <div className="mt-1 text-sm text-stone-500">{weekdayZh(item.date)} · {item.label}</div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${levelTone(item.score)}`}>
                      {item.score}
                    </span>
                  </div>
                  {item.reasons.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm leading-6 text-stone-700">
                      {item.reasons.map((reason, index) => <li key={index}>• {reason}</li>)}
                    </ul>
                  )}
                  {item.cautions.length > 0 && (
                    <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                      {item.cautions.join('；')}
                    </div>
                  )}
                  {item.recommendedHours && item.recommendedHours.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.recommendedHours.slice(0, 3).map((hour, index) => (
                        <span key={`${hour.ganZhi}-${index}`} className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {hour.label || `${hour.ganZhi}时`}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
            {selectionResult.notes && selectionResult.notes.length > 0 && (
              <div className="rounded-2xl border border-stone-100 bg-white px-4 py-3 text-sm leading-7 text-stone-600">
                {selectionResult.notes.join('；')}
              </div>
            )}
          </div>
        )}
      </section>

      {activeRecommendation && (
        <DialogPortal open onClose={() => setActiveRecommendation(null)} ariaLabel="择日详情" mobileFill panelClassName="max-w-3xl bg-white">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 py-4 md:px-6">
              <div>
                <div className="text-2xl font-bold text-stone-900">{formatDateZh(activeRecommendation.date)}</div>
                <div className="mt-1 text-sm text-stone-500">
                  {weekdayZh(activeRecommendation.date)} · {activeRecommendation.label}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRecommendation(null)}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-500 transition hover:bg-stone-50"
              >
                关闭
              </button>
            </div>

            <DialogBody className="px-5 py-5 md:px-6">
              <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50/65 px-4 py-3 text-sm leading-7 text-amber-800">
                {activeRecommendation.reasons.join('；')}
                {activeRecommendation.cautions.length > 0 && (
                  <div className="mt-1 text-amber-700">提醒：{activeRecommendation.cautions.join('；')}</div>
                )}
              </div>

              <div className="space-y-5">
              <section>
                <div className="mb-3 text-base font-bold text-stone-900">推荐吉时</div>
                {activeRecommendation.recommendedHours && activeRecommendation.recommendedHours.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeRecommendation.recommendedHours.map((hour, index) => (
                      <div key={`${hour.ganZhi}-${index}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-lg font-bold text-emerald-800">{hour.label || `${hour.ganZhi}时`}</div>
                          {hour.ganZhi && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-700">
                              {hour.ganZhi}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-stone-700">{hour.reason}</div>
                        {hour.caution && (
                          <div className="mt-2 text-xs leading-5 text-amber-700">提醒：{hour.caution}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500">
                    暂无单独推荐吉时，可参考下方时辰简表。
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 text-base font-bold text-stone-900">十二时辰简表</div>
                {!currentDateMatchesModal || loading ? (
                  <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500">
                    正在加载当天时辰...
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(goodHours.length ? goodHours : hourlyFortune).slice(0, 12).map((hour: any, index: number) => {
                      const state = gentleHourState(hour);
                      const favorable = state === '顺';
                      const suitable = asList(hour?.suitable).slice(0, 3);
                      return (
                        <div
                          key={`${hour?.ganZhi || index}-${index}`}
                          className={`rounded-2xl border px-3 py-3 ${
                            favorable
                              ? 'border-emerald-100 bg-emerald-50/55'
                              : 'border-stone-100 bg-stone-50/70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-stone-800">
                              {hour?.ganZhi || '—'}时
                              {formatHourRange(hour?.ganZhi) && (
                                <span className="ml-1 text-xs font-semibold text-stone-400">{formatHourRange(hour?.ganZhi)}</span>
                              )}
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${favorable ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-stone-500'}`}>
                              {state}
                            </span>
                          </div>
                          <div className="mt-2 text-xs leading-5 text-stone-600">
                            {suitable.length ? `适合：${suitable.join('、')}` : '适合安排低风险事项'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
              </div>
            </DialogBody>
        </DialogPortal>
      )}
    </div>
  );
};

export default AlmanacWorkspace;
