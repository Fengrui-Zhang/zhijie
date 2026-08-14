'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ZiweiResponse } from '../types';
import { ChartMasthead } from './DivinationVisualSystem';
import ZiweiFengshuiPanel from './ZiweiFengshuiPanel';
import ZiweiGrid from './ZiweiGrid';

export type ZiweiWorkspaceTab = 'professional' | 'fengshui' | 'ai' | 'notes';

type Props = {
  data: ZiweiResponse;
  caseId?: string | null;
  aiPanel?: React.ReactNode;
  onTabChange?: (tab: ZiweiWorkspaceTab) => void;
  onEditCase?: () => void;
  onDeleteCase?: () => void;
  onQuotaChange?: (quota: number) => void;
};

const TAB_ITEMS: Array<{ key: ZiweiWorkspaceTab; label: string }> = [
  { key: 'professional', label: '专业排盘' },
  { key: 'fengshui', label: '紫微风水' },
  { key: 'ai', label: 'AI解读' },
  { key: 'notes', label: '断事笔记' },
];

const ZiweiNotes = ({ storageKey }: { storageKey: string }) => {
  const [notes, setNotes] = useState('');
  useEffect(() => {
    setNotes(window.localStorage.getItem(storageKey) || '');
  }, [storageKey]);
  const update = (value: string) => {
    setNotes(value);
    window.localStorage.setItem(storageKey, value);
  };
  return (
    <section className="rounded-[26px] border border-white/70 bg-white/52 p-5 shadow-[0_14px_40px_rgba(28,25,23,0.05)] backdrop-blur-xl">
      <div className="text-base font-bold text-stone-800">断事笔记</div>
      <div className="mt-1 text-sm leading-6 text-stone-500">记录已验证事件、宫位判断、四化应事与后续复盘。当前版本保存在本机浏览器。</div>
      <textarea
        value={notes}
        onChange={(event) => update(event.target.value)}
        placeholder="例如：某年事业变化对应官禄宫流年四化；命主反馈的家庭、关系、迁移与健康信息；后续需要复盘的时间点……"
        className="mt-4 min-h-[280px] w-full rounded-[22px] border border-white/75 bg-white/68 px-4 py-3 text-base leading-7 text-stone-700 outline-none placeholder:text-stone-400 focus:border-amber-200 focus:bg-white"
      />
    </section>
  );
};

export default function ZiweiWorkspace({
  data,
  caseId,
  aiPanel,
  onTabChange,
  onEditCase,
  onDeleteCase,
  onQuotaChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<ZiweiWorkspaceTab>('professional');
  const canonical = data.taibuJson as { 基本信息?: Record<string, any> } | undefined;
  const basic = canonical?.基本信息 || {};
  const notesKey = useMemo(() => {
    const identity = caseId || `${data.base_info.name || '匿名'}:${basic.阳历 || data.base_info.gongli}`;
    return `zhijie:ziwei-notes:${identity}`;
  }, [basic.阳历, caseId, data.base_info.gongli, data.base_info.name]);

  useEffect(() => setActiveTab('professional'), [caseId]);
  useEffect(() => onTabChange?.(activeTab), [activeTab, onTabChange]);

  return (
    <div className="glass-panel mx-auto my-6 w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/75 p-4 md:p-6">
      <ChartMasthead
        title="紫微斗数"
        subtitle={`${data.base_info.name || '命盘'}（${data.base_info.sex || '—'}）· ${basic.五行局 || data.base_info.mingju || '—'}`}
        date={basic.阳历 || data.base_info.gongli}
        meta={`命主 ${basic.命主 || data.base_info.mingzhu || '—'} · 身主 ${basic.身主 || data.base_info.shenzhu || '—'}`}
        symbol="紫"
        actions={caseId ? (
          <div className="flex items-center gap-1.5">
            {onEditCase ? (
              <button type="button" onClick={onEditCase} className="rounded-xl border border-stone-200/70 bg-white/68 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-white">编辑</button>
            ) : null}
            {onDeleteCase ? (
              <button type="button" onClick={onDeleteCase} className="rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">删除</button>
            ) : null}
          </div>
        ) : null}
      />

      <nav className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3" aria-label="紫微斗数功能">
        {TAB_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveTab(item.key)}
            aria-current={activeTab === item.key ? 'page' : undefined}
            className={`rounded-xl border px-2 py-2.5 text-center text-sm font-bold md:rounded-2xl md:px-4 md:py-3.5 md:text-base ${
              activeTab === item.key
                ? 'glass-panel-dark border-transparent text-amber-200 shadow-[0_14px_30px_rgba(28,25,23,0.16)]'
                : 'border-white/75 bg-white/62 text-stone-700 hover:bg-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {activeTab === 'professional' ? <ZiweiGrid data={data} embedded /> : null}
        {activeTab === 'fengshui' ? <ZiweiFengshuiPanel data={data} caseId={caseId} onQuotaChange={onQuotaChange} /> : null}
        {activeTab === 'ai' ? (
          <div className="space-y-4">
            <section className="rounded-[24px] border border-white/70 bg-white/52 p-4 md:p-5">
              <div className="text-base font-bold text-stone-800">AI解读</div>
              <div className="mt-1 text-sm leading-6 text-stone-500">基于当前紫微命例发起问答，后续对话会自动拼接命盘与初始化分析上下文。</div>
            </section>
            {aiPanel}
          </div>
        ) : null}
        {activeTab === 'notes' ? <ZiweiNotes storageKey={notesKey} /> : null}
      </div>
    </div>
  );
}
