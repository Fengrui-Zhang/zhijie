'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ZiweiResponse } from '../types';
import {
  ZIWEI_DIRECTIONS,
  ZIWEI_FENGSHUI_FOCUS_OPTIONS,
  ZIWEI_FENGSHUI_LAYER_OPTIONS,
  getZiweiFengshuiDecadalOptions,
  getZiweiFengshuiFocusPalaces,
  type ZiweiFengshuiFocus,
  type ZiweiFengshuiLayer,
  type ZiweiFengshuiPalaceResult,
  type ZiweiFengshuiResult,
  type ZiweiFengshuiStatus,
} from '../lib/ziwei-fengshui';
import DialogPortal, { DialogBody } from './DialogPortal';

type Props = {
  data: ZiweiResponse;
  caseId?: string | null;
  onQuotaChange?: (quota: number) => void;
};

type LoadState = 'loading' | 'empty' | 'ready' | 'error';
type AvailableRecord = { layer: ZiweiFengshuiLayer; periodKey: string; periodLabel: string | null; generatedAt: string | null };

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GRID_LAYOUT = [
  [5, 6, 7, 8],
  [4, -1, -1, 9],
  [3, -1, -1, 10],
  [2, 1, 0, 11],
];

const STATUS_STYLE: Record<ZiweiFengshuiStatus, { dot: string; card: string; pill: string }> = {
  协调顺畅: {
    dot: 'bg-emerald-500',
    card: 'border-emerald-200/90 bg-emerald-50/72',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  基本平稳: {
    dot: 'bg-sky-500',
    card: 'border-sky-200/80 bg-sky-50/62',
    pill: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  杂乱受阻: {
    dot: 'bg-amber-500',
    card: 'border-amber-200/90 bg-amber-50/72',
    pill: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  重点调整: {
    dot: 'bg-rose-500',
    card: 'border-rose-200/90 bg-rose-50/68',
    pill: 'border-rose-200 bg-rose-50 text-rose-700',
  },
};

const shanghaiYear = () => Number(new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
}).format(new Date()));

const normalizePalaceName = (value: string) => value.endsWith('宫') ? value : `${value}宫`;

const getPreviewPalaces = (data: ZiweiResponse) => {
  const canonical = data.taibuJson as { 十二宫位?: Array<{ 宫位?: string; 干支?: string }> } | undefined;
  return (canonical?.十二宫位 || []).map((palace) => {
    const branch = String(palace.干支 || '').slice(-1);
    return {
      palaceName: normalizePalaceName(String(palace.宫位 || '')),
      branch,
      direction: ZIWEI_DIRECTIONS[branch]?.direction || '方向待定',
    };
  });
};

const BulletList = ({ items, tone = 'stone' }: { items: string[]; tone?: 'stone' | 'amber' | 'emerald' | 'rose' }) => {
  const dot = tone === 'amber' ? 'bg-amber-500' : tone === 'emerald' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-stone-400';
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2.5 text-sm leading-6 text-stone-600">
          <span className={`mt-[0.62rem] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-[20px] border border-white/75 bg-white/62 p-4 shadow-[0_8px_24px_rgba(28,25,23,0.035)]">
    <h4 className="mb-2.5 text-sm font-bold text-stone-800">{title}</h4>
    {children}
  </section>
);

const PalaceDetail = ({ palace, layer }: { palace: ZiweiFengshuiPalaceResult; layer: ZiweiFengshuiLayer }) => {
  const style = STATUS_STYLE[palace.status];
  return (
    <div className="space-y-3 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="display-title text-2xl font-bold tracking-[-0.02em] text-stone-950">{palace.palaceName}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${style.pill}`}>{palace.status}</span>
          </div>
          <div className="mt-1 text-xs font-medium text-stone-500">
            {palace.branch}位 · {palace.direction} · {palace.degreeRange}
          </div>
        </div>
      </div>
      <p className="rounded-[18px] border border-white/70 bg-white/52 px-4 py-3 text-sm leading-6 text-stone-700">{palace.summary}</p>

      <DetailSection title="当前物象">
        <BulletList items={palace.currentObjects} tone="rose" />
      </DetailSection>
      <DetailSection title="本命依据">
        <BulletList items={palace.natalEvidence} />
      </DetailSection>
      {palace.timingEvidence.length > 0 ? (
        <DetailSection title={layer === 'decadal' ? '大运变化' : '流年变化'}>
          <BulletList items={palace.timingEvidence} tone="amber" />
        </DetailSection>
      ) : null}
      <DetailSection title="整理与优化">
        <BulletList items={palace.optimizationSteps} tone="amber" />
      </DetailSection>

      <DetailSection title="摆放方案">
        <div className="space-y-3 text-sm leading-6 text-stone-600">
          <div className="font-bold text-emerald-700">{palace.placementAdvice.item}</div>
          <p>{palace.placementAdvice.method}</p>
          <p>{palace.placementAdvice.reason}</p>
          <div>
            <div className="mb-1 font-semibold text-stone-700">以下情况不宜采用</div>
            <BulletList items={palace.placementAdvice.avoidWhen} tone="rose" />
          </div>
        </div>
      </DetailSection>

      <DetailSection title="暂不建议">
        <BulletList items={palace.avoid} tone="rose" />
      </DetailSection>
      <DetailSection title="推断依据">
        <div className="space-y-2.5">
          {palace.evidenceChains.map((evidence, index) => (
            <div key={`${evidence.chain}-${index}`} className="rounded-2xl border border-stone-100 bg-white/60 px-3 py-2.5">
              <span className="mr-2 inline-flex rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-bold text-stone-500">{evidence.grade}</span>
              <span className="text-xs leading-5 text-stone-600">{evidence.chain}</span>
            </div>
          ))}
        </div>
      </DetailSection>
    </div>
  );
};

const PalaceButton = ({
  palace,
  selected,
  highlighted,
  onClick,
}: {
  palace: ZiweiFengshuiPalaceResult;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
}) => {
  const style = STATUS_STYLE[palace.status];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${palace.palaceName}，${palace.direction}，${palace.status}`}
      className={`group relative flex min-h-[92px] flex-col justify-between overflow-hidden border p-2 text-left backdrop-blur-xl sm:min-h-[118px] sm:p-3 md:min-h-[138px] ${style.card} ${
        selected
          ? 'z-10 ring-2 ring-stone-800/70 ring-offset-1 ring-offset-white/60 shadow-[0_16px_34px_rgba(28,25,23,0.14)]'
          : highlighted
            ? 'ring-2 ring-amber-400/75 ring-inset shadow-[0_10px_26px_rgba(180,119,31,0.11)]'
            : 'opacity-[0.88] hover:opacity-100'
      }`}
    >
      <div className="flex w-full items-start justify-between gap-1">
        <span className="text-[11px] font-bold text-stone-900 sm:text-sm">{palace.palaceName}</span>
        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.55)] ${style.dot}`} />
      </div>
      <div>
        <div className="text-[9px] font-semibold text-stone-500 sm:text-[11px]">{palace.direction}</div>
        <div className="mt-1 text-[9px] font-bold leading-4 text-stone-700 sm:text-xs">{palace.status}</div>
        <div className="mt-1 hidden line-clamp-2 text-[10px] leading-4 text-stone-500 sm:block">{palace.summary}</div>
      </div>
      {highlighted ? <span className="absolute bottom-0 left-0 h-0.5 w-full bg-amber-500/75" /> : null}
    </button>
  );
};

export default function ZiweiFengshuiPanel({ data, caseId, onQuotaChange }: Props) {
  const currentYear = shanghaiYear();
  const decadalOptions = useMemo(() => getZiweiFengshuiDecadalOptions(data), [data]);
  const birthYear = Number(String((data.taibuJson as any)?.基本信息?.阳历 || data.base_info.gongli || '').match(/\d{4}/)?.[0]);
  const currentNominalAge = Number.isInteger(birthYear) ? currentYear - birthYear + 1 : 0;
  const defaultDecadal = decadalOptions.find((option) => currentNominalAge >= option.startAge && currentNominalAge <= option.endAge) || decadalOptions[0];
  const [layer, setLayer] = useState<ZiweiFengshuiLayer>('natal');
  const [selectedDecadalKey, setSelectedDecadalKey] = useState(defaultDecadal?.key || '');
  const [targetYear, setTargetYear] = useState(currentYear);
  const [draftYear, setDraftYear] = useState(String(currentYear));
  const [focus, setFocus] = useState<ZiweiFengshuiFocus>('overall');
  const [state, setState] = useState<LoadState>('loading');
  const [result, setResult] = useState<ZiweiFengshuiResult | null>(null);
  const [error, setError] = useState('');
  const [selectedPalaceName, setSelectedPalaceName] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [availableRecords, setAvailableRecords] = useState<AvailableRecord[]>([]);
  const previewPalaces = useMemo(() => getPreviewPalaces(data), [data]);
  const periodKey = layer === 'natal' ? 'natal' : layer === 'decadal' ? selectedDecadalKey : String(targetYear);
  const decadal = decadalOptions.find((option) => option.key === selectedDecadalKey) || defaultDecadal;
  const periodLabel = layer === 'natal' ? '原命局' : layer === 'decadal' ? (decadal?.label || '所选大运') : `${targetYear}年流年`;
  const hasRecord = availableRecords.some((record) => record.layer === layer && record.periodKey === periodKey);

  useEffect(() => setDraftYear(String(targetYear)), [targetYear]);

  useEffect(() => {
    if (!selectedDecadalKey && defaultDecadal?.key) setSelectedDecadalKey(defaultDecadal.key);
  }, [defaultDecadal?.key, selectedDecadalKey]);

  useEffect(() => {
    if (!caseId) {
      setState('empty');
      setResult(null);
      return;
    }
    if (!periodKey) {
      setState('empty');
      setResult(null);
      return;
    }
    const controller = new AbortController();
    let pollTimer: number | undefined;
    const load = async () => {
      setState('loading');
      setResult(null);
      setError('');
      try {
        const params = new URLSearchParams({ caseId, layer, periodKey });
        const response = await fetch(`/api/ziwei/fengshui?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || '读取紫微风水结果失败');
        if (typeof payload.quota === 'number') onQuotaChange?.(payload.quota);
        if (Array.isArray(payload.availableRecords)) setAvailableRecords(payload.availableRecords as AvailableRecord[]);
        if (payload.result) setResult(payload.result as ZiweiFengshuiResult);
        if (payload.status === 'ready') {
          setState('ready');
        } else if (payload.status === 'pending') {
          setState('loading');
          pollTimer = window.setTimeout(load, 2500);
        } else if (payload.status === 'failed') {
          setState(payload.result ? 'ready' : 'error');
          setError(payload.error || '上次分析失败，可重新生成');
        } else {
          setState('empty');
          setResult(null);
        }
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setState('error');
        setError(loadError instanceof Error ? loadError.message : '读取紫微风水结果失败');
      }
    };
    void load();
    return () => {
      controller.abort();
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [caseId, layer, onQuotaChange, periodKey]);

  useEffect(() => {
    if (!result) {
      setSelectedPalaceName(null);
      return;
    }
    const next = result.priorityPalaceNames[0] || result.palaces[0]?.palaceName || null;
    setSelectedPalaceName((current) => result.palaces.some((palace) => palace.palaceName === current) ? current : next);
  }, [result]);

  const highlightedNames = useMemo(() => getZiweiFengshuiFocusPalaces(focus, result), [focus, result]);
  const highlightedSet = useMemo(() => new Set(highlightedNames), [highlightedNames]);
  const selectedPalace = result?.palaces.find((palace) => palace.palaceName === selectedPalaceName) || null;
  const palaceByBranch = useMemo(() => new Map(result?.palaces.map((palace) => [palace.branch, palace]) || []), [result]);
  const previewByBranch = useMemo(() => new Map(previewPalaces.map((palace) => [palace.branch, palace])), [previewPalaces]);

  const commitDraftYear = () => {
    const parsed = Number.parseInt(draftYear, 10);
    const next = Number.isFinite(parsed) ? Math.max(1900, Math.min(2200, parsed)) : shanghaiYear();
    setTargetYear(next);
    setDraftYear(String(next));
  };

  const generate = async (force = false) => {
    if (!caseId || state === 'loading') return;
    const previousResult = result;
    setState('loading');
    setError('');
    try {
      const response = await fetch('/api/ziwei/fengshui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, layer, periodKey, force }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || '紫微风水分析失败');
      if (typeof payload.quota === 'number') onQuotaChange?.(payload.quota);
      setResult(payload.result as ZiweiFengshuiResult);
      setAvailableRecords((records) => {
        const next: AvailableRecord = { layer, periodKey, periodLabel, generatedAt: payload.generatedAt || new Date().toISOString() };
        return [next, ...records.filter((record) => !(record.layer === layer && record.periodKey === periodKey))];
      });
      setState('ready');
    } catch (generateError) {
      setResult(previousResult);
      setState(previousResult ? 'ready' : 'error');
      setError(generateError instanceof Error ? generateError.message : '紫微风水分析失败');
    }
  };

  const openPalace = (palaceName: string) => {
    setSelectedPalaceName(palaceName);
    setMobileSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[26px] border border-white/70 bg-white/52 p-4 shadow-[0_14px_40px_rgba(28,25,23,0.05)] backdrop-blur-xl md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <h3 className="display-title text-xl font-bold tracking-[-0.02em] text-stone-900 md:text-2xl">紫微风水</h3>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">命盘映射</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-500">AI 根据十二宫落支、星曜与四化，推演各方位当前物象，并给出对应的整理与摆放方案。</p>
          </div>
          <button
            type="button"
            onClick={() => void generate(Boolean(result))}
            disabled={!caseId || state === 'loading'}
            className="glass-panel-dark rounded-2xl px-4 py-2.5 text-sm font-bold text-amber-200 disabled:opacity-45"
          >
            {state === 'loading' ? '分析中…' : result ? '重新生成 · 1点' : `生成${layer === 'natal' ? '本命' : layer === 'decadal' ? '此大运' : '此流年'} · 1点`}
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex w-fit items-center rounded-2xl border border-white/75 bg-white/62 p-1 shadow-sm" aria-label="紫微风水时间层">
            {ZIWEI_FENGSHUI_LAYER_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setLayer(option.key)}
                aria-pressed={layer === option.key}
                className={`min-w-[68px] rounded-xl px-3 py-2 text-xs font-bold transition-colors ${layer === option.key ? 'bg-stone-900 text-amber-200 shadow-sm' : 'text-stone-500 hover:bg-white hover:text-stone-800'}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {layer === 'decadal' ? (
            <div className="glass-scrollbar flex max-w-full gap-2 overflow-x-auto pb-1">
              {decadalOptions.map((option) => {
                const generated = availableRecords.some((record) => record.layer === 'decadal' && record.periodKey === option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedDecadalKey(option.key)}
                    aria-pressed={selectedDecadalKey === option.key}
                    className={`shrink-0 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${selectedDecadalKey === option.key ? 'border-stone-800 bg-stone-900 text-amber-100 shadow-sm' : 'border-white/75 bg-white/55 text-stone-600 hover:bg-white'}`}
                  >
                    <span className="block text-xs font-bold">{option.startAge}–{option.endAge}岁</span>
                    <span className={`mt-0.5 block text-[10px] ${selectedDecadalKey === option.key ? 'text-stone-300' : 'text-stone-400'}`}>{option.palaceName}{generated ? ' · 已生成' : ''}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {layer === 'yearly' ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-2xl border border-white/75 bg-white/62 p-1 shadow-sm">
                <button type="button" onClick={() => setTargetYear((year) => Math.max(1900, year - 1))} className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 hover:bg-white" aria-label="上一年">−</button>
                <input
                  type="number"
                  min={1900}
                  max={2200}
                  value={draftYear}
                  onChange={(event) => setDraftYear(event.target.value)}
                  onBlur={commitDraftYear}
                  onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                  className="h-9 w-20 bg-transparent text-center text-base font-bold text-stone-800 outline-none"
                  aria-label="分析年份"
                />
                <button type="button" onClick={() => setTargetYear((year) => Math.min(2200, year + 1))} className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 hover:bg-white" aria-label="下一年">＋</button>
              </div>
              {hasRecord ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">已生成记录</span> : null}
            </div>
          ) : null}

          <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-white/75 bg-white/45 p-1.5">
            {ZIWEI_FENGSHUI_FOCUS_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFocus(option.key)}
                aria-pressed={focus === option.key}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${focus === option.key ? 'bg-stone-900 text-amber-200 shadow-sm' : 'text-stone-500 hover:bg-white/75 hover:text-stone-800'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {error ? <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">{error}</div> : null}
      </section>

      {!caseId ? (
        <div className="rounded-[26px] border border-dashed border-stone-200 bg-white/45 px-5 py-10 text-center text-sm leading-6 text-stone-500">请先登录并保存紫微命例，再生成紫微风水分析。</div>
      ) : null}

      {caseId ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.85fr)]">
          <div className="self-start overflow-hidden rounded-[26px] border border-amber-900/20 bg-stone-300/65 shadow-[0_20px_52px_rgba(73,56,35,0.08)]">
            <div className="grid grid-cols-4 gap-px">
              {GRID_LAYOUT.flatMap((row, rowIndex) => row.map((branchIndex, colIndex) => {
                if (branchIndex === -1) {
                  if (rowIndex === 1 && colIndex === 1) {
                    return (
                      <div key="fengshui-center" className="relative col-span-2 row-span-2 flex min-h-[185px] flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle,rgba(249,239,210,0.9),rgba(255,255,255,0.7)_72%)] p-3 text-center sm:min-h-[235px] md:min-h-[275px]">
                        <span className="pointer-events-none absolute text-[88px] font-bold text-stone-900/[0.025] sm:text-[130px]">宅</span>
                        <div className="relative text-2xl font-bold text-stone-900 sm:text-4xl">
                          {layer === 'natal' ? '本命' : layer === 'decadal' ? `${decadal?.startAge || ''}–${decadal?.endAge || ''}岁` : targetYear}
                        </div>
                        <div className="relative mt-1 text-[10px] font-semibold tracking-[0.12em] text-stone-400 sm:text-xs">当前物象 × {layer === 'natal' ? '原命局' : layer === 'decadal' ? '大运' : '流年'}</div>
                        <div className="relative mt-3 hidden flex-wrap justify-center gap-1.5 sm:flex">
                          {Object.entries(STATUS_STYLE).map(([status, style]) => (
                            <span key={status} className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/60 px-2 py-1 text-[9px] font-semibold text-stone-500">
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{status}
                            </span>
                          ))}
                        </div>
                        <div className="relative mt-3 text-[9px] leading-4 text-stone-400 sm:text-[11px]">正北 0° · 顺时针十二等分</div>
                      </div>
                    );
                  }
                  return null;
                }
                const branch = BRANCHES[branchIndex];
                const palace = palaceByBranch.get(branch);
                if (palace) {
                  return (
                    <PalaceButton
                      key={`${branch}-${palace.palaceName}`}
                      palace={palace}
                      selected={selectedPalaceName === palace.palaceName}
                      highlighted={highlightedSet.has(palace.palaceName)}
                      onClick={() => openPalace(palace.palaceName)}
                    />
                  );
                }
                const preview = previewByBranch.get(branch);
                return (
                  <div key={`preview-${branch}`} className="flex min-h-[92px] animate-pulse flex-col justify-between border border-white/45 bg-white/62 p-2 sm:min-h-[118px] sm:p-3 md:min-h-[138px]">
                    <div className="text-[11px] font-bold text-stone-500 sm:text-sm">{preview?.palaceName || `${branch}位`}</div>
                    <div>
                      <div className="text-[9px] font-semibold text-stone-400 sm:text-[11px]">{preview?.direction || '待定位'}</div>
                      <div className="mt-2 h-2 w-12 rounded-full bg-stone-200/80" />
                    </div>
                  </div>
                );
              }))}
            </div>
            {state === 'empty' && !result ? (
              <div className="border-t border-white/60 bg-white/68 px-4 py-4 text-center text-sm text-stone-500">尚未生成“{periodLabel}”的物象与摆放分析。一次调用将返回完整十二宫，消耗 1 点。</div>
            ) : null}
            {state === 'loading' ? (
              <div className="border-t border-white/60 bg-white/72 px-4 py-4 text-center text-sm font-medium text-stone-600">正在推演“{periodLabel}”的十二方位物象…</div>
            ) : null}
          </div>

          <aside className="glass-panel-soft hidden h-[555px] self-start overflow-hidden rounded-[26px] border border-white/70 xl:block">
            {selectedPalace ? (
              <div className="glass-scrollbar h-full overflow-y-auto">
                <PalaceDetail palace={selectedPalace} layer={layer} />
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center px-6 text-center text-sm leading-6 text-stone-400">生成后选择一个宫位，查看当前物象与摆放方案。</div>
            )}
          </aside>
        </div>
      ) : null}

      {result ? (
        <section className="rounded-[24px] border border-white/70 bg-white/48 p-4 text-sm leading-6 text-stone-600 md:p-5">
          <div className="font-bold text-stone-800">全盘空间概览</div>
          <p className="mt-2">{result.summary}</p>
          <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/65 px-3 py-2.5 text-amber-800">{result.periodNotice}</div>
        </section>
      ) : null}

      <DialogPortal
        open={mobileSheetOpen && Boolean(selectedPalace)}
        onClose={() => setMobileSheetOpen(false)}
        ariaLabel={selectedPalace ? `${selectedPalace.palaceName}紫微风水调整方案` : '紫微风水调整方案'}
        panelClassName="mt-auto max-h-[88dvh] rounded-b-none xl:hidden"
      >
        <div className="flex justify-center py-2.5"><span className="h-1.5 w-11 rounded-full bg-stone-300" /></div>
        <div className="flex items-center justify-between border-b border-white/60 px-4 pb-3">
          <div className="text-sm font-bold text-stone-700">宫位物象与优化</div>
          <button type="button" onClick={() => setMobileSheetOpen(false)} className="rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-stone-500">关闭</button>
        </div>
        <DialogBody>
          {selectedPalace ? <PalaceDetail palace={selectedPalace} layer={layer} /> : null}
        </DialogBody>
      </DialogPortal>
    </div>
  );
}
