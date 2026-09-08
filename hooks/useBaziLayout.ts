'use client';

import { useEffect, useState } from 'react';

export const BAZI_LAYOUT_OPTIONS = [
  { value: 'annual-luck-natal', label: '流年 → 大运 → 本命', groups: ['annual', 'luck', 'natal'] },
  { value: 'annual-natal-luck', label: '流年 → 本命 → 大运', groups: ['annual', 'natal', 'luck'] },
  { value: 'luck-annual-natal', label: '大运 → 流年 → 本命', groups: ['luck', 'annual', 'natal'] },
  { value: 'luck-natal-annual', label: '大运 → 本命 → 流年', groups: ['luck', 'natal', 'annual'] },
  { value: 'natal-annual-luck', label: '本命 → 流年 → 大运', groups: ['natal', 'annual', 'luck'] },
  { value: 'natal-luck-annual', label: '本命 → 大运 → 流年', groups: ['natal', 'luck', 'annual'] },
] as const;
export type BaziLayout = typeof BAZI_LAYOUT_OPTIONS[number]['value'];
const DEFAULT_LAYOUT: BaziLayout = 'annual-luck-natal';
const STORAGE_KEY = 'zhijie:bazi-layout:v1';
const CHANGE_EVENT = 'zhijie:bazi-layout-change';
const normalize = (value: unknown): BaziLayout => BAZI_LAYOUT_OPTIONS.find((option) => option.value === value)?.value ?? DEFAULT_LAYOUT;

export function useBaziLayout() {
  const [layout, setLayout] = useState<BaziLayout>(DEFAULT_LAYOUT);
  const [saveMessage, setSaveMessage] = useState('');
  useEffect(() => {
    const read = () => {
      try { setLayout(normalize(window.localStorage.getItem(STORAGE_KEY))); } catch { /* Keep the current layout when storage is unavailable. */ }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) read(); };
    read();
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, read);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, read);
    };
  }, []);
  const updateLayout = (value: string) => {
    const next = normalize(value);
    setLayout(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new Event(CHANGE_EVENT));
      setSaveMessage('已保存，下次打开自动沿用');
    } catch { setSaveMessage('本次已应用，浏览器暂时无法保存'); }
  };
  return { layout, updateLayout, saveMessage };
}

// Display ordering only: calculation always receives the canonical columns.
export function orderBaziColumns<T extends { kind: 'natal' | 'flow'; key: string }>(columns: readonly T[], layout: BaziLayout): T[] {
  const groups = BAZI_LAYOUT_OPTIONS.find((option) => option.value === layout)!.groups;
  return groups.flatMap((group) => {
    if (group === 'natal') return columns.filter((column) => column.kind === 'natal');
    if (group === 'luck') return columns.filter((column) => column.key === 'dayun');
    return ['liuri', 'liuyue', 'liunian'].flatMap((key) => columns.filter((column) => column.key === key));
  });
}
