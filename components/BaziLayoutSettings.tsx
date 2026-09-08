'use client';

import React, { useId } from 'react';
import { BAZI_LAYOUT_OPTIONS, useBaziLayout } from '../hooks/useBaziLayout';

export default function BaziLayoutSettings() {
  const { layout, updateLayout, saveMessage } = useBaziLayout();
  const id = useId();
  const selected = BAZI_LAYOUT_OPTIONS.find((option) => option.value === layout)!;
  return <div className="space-y-3">
    <label htmlFor={id} className="block text-sm font-semibold text-stone-700">八字排盘布局</label>
    <p className="text-xs leading-5 text-stone-500">选择从左到右的排列顺序。本命四柱按年、月、日、时排列，流月和流日随流年一组展示。</p>
    <select id={id} value={layout} onChange={(event) => updateLayout(event.target.value)} className="glass-input w-full rounded-xl border border-stone-200 bg-white/80 px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-amber-400">
      {BAZI_LAYOUT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}{option.value === 'annual-luck-natal' ? '（默认）' : ''}</option>)}
    </select>
    <div className="flex gap-1.5" aria-hidden="true">{selected.groups.map((group) => <div key={group} className={`rounded-lg px-3 py-2 text-center text-[11px] ${group === 'natal' ? 'flex-[2] bg-stone-100 text-stone-700' : 'flex-1 bg-amber-50 text-amber-800'}`}>{group === 'natal' ? '年 · 月 · 日 · 时' : group === 'luck' ? '大运' : '流年'}</div>)}</div>
    <p role="status" className="text-[11px] text-stone-500">{saveMessage || '修改后自动保存到当前浏览器'}</p>
  </div>;
}
