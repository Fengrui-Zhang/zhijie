'use client';

import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { ELEMENT_MEANINGS, type CharacterAnalysis, type CharacterSelection, type CharacterSource } from '../lib/bazi-character-analysis';
import { tenGodKnowledge } from '../lib/bazi-character-knowledge';
import { describeCharacterSource, describeShareUnit } from '../lib/bazi-character-interpretation';
import { CHARACTER_SYMBOLISM, TEN_GOD_SYMBOLISM, palaceSymbolism, type SymbolismGroup } from '../lib/bazi-character-symbolism';
import { getWuxingColor } from '../utils/wuxing';

interface Props {
  analysis: CharacterAnalysis;
  periodLabel: string;
  dayunValue: number | null;
  onSelect: (selection: CharacterSelection) => void;
  onClose: () => void;
}

function DetailSection({ number, title, aside, children }: { number: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return <section className="border-t border-stone-200/70 py-4 first:border-0 first:pt-0">
    <div className="mb-3 flex items-center gap-2">
      <span className="font-mono text-[10px] tracking-widest text-amber-700/60">{number}</span>
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      {aside && <span className="ml-auto text-[11px] text-stone-500">{aside}</span>}
    </div>
    {children}
  </section>;
}

function SourceList({ sources, analysis }: { sources: CharacterSource[]; analysis: CharacterAnalysis }) {
  return <div className="space-y-2">
    {sources.map((source) => <div key={source.id} className="rounded-xl border border-stone-200/80 bg-white/70 px-3 py-2.5">
      <div className="text-xs">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-stone-800">{source.label}</span>
          <span className="text-right text-[10px] leading-4 text-stone-500">{source.tags.join(' · ')}</span>
        </div>
        <div className="mt-1.5 break-words text-[11px] leading-5 text-stone-600">{source.path}</div>
        <p className="mt-2 border-t border-stone-100 pt-2 text-[11px] leading-5 text-stone-500">{describeCharacterSource(analysis, source)}</p>
      </div>
    </div>)}
  </div>;
}

function MeaningGroups({ groups }: { groups: SymbolismGroup[] }) {
  return <dl className="mt-3 space-y-3 rounded-2xl border border-stone-200/60 bg-white/60 p-3">
    {groups.map((group) => <div key={group.label}>
      <dt className="mb-1 text-[10px] font-semibold tracking-wide text-amber-900/70">{group.label}</dt>
      <dd className="text-[11px] leading-5 text-stone-600">{group.text}</dd>
    </div>)}
  </dl>;
}

export function BaziCharacterInspector({ analysis, periodLabel, dayunValue, onSelect, onClose }: Props) {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1199px)').matches);
  const headingId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(mobile, onClose);
  useBodyScrollLock(mobile);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1199px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (mobile) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [mobile, onClose, dialogRef]);

  const element = ELEMENT_MEANINGS[analysis.element];
  const god = tenGodKnowledge[analysis.tenGod];
  const hiddenOnly = analysis.selection.kind === 'hidden';
  const palace = palaceSymbolism(analysis);
  const natalSupport = analysis.sources.filter((source) => source.layer === 'natal' && source.category !== 'root');
  const delta = analysis.natalShares === null ? null : analysis.finalShares - analysis.natalShares;
  if (typeof document === 'undefined') return null;

  return createPortal(<div className={mobile ? 'fixed inset-0 z-[70] flex items-end bg-stone-950/30 backdrop-blur-sm' : 'pointer-events-none fixed inset-0 z-[60]'} onClick={mobile ? onClose : undefined}>
    <div ref={dialogRef} role="dialog" aria-modal={mobile || undefined} aria-labelledby={headingId} tabIndex={-1}
      onClick={(event) => event.stopPropagation()}
      className={`pointer-events-auto flex flex-col overflow-hidden border border-white/80 bg-[#fcfaf6] shadow-[0_24px_80px_rgba(55,40,18,0.20)] outline-none ${mobile ? 'max-h-[88dvh] w-full rounded-t-[28px] pb-[env(safe-area-inset-bottom)]' : 'absolute right-5 top-20 max-h-[calc(100dvh-6rem)] w-[410px] rounded-[24px]'}`}>
      {mobile && <div aria-hidden="true" className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-stone-300" />}
      <header className="shrink-0 border-b border-stone-200/60 bg-gradient-to-br from-amber-50/90 to-white/40 px-5 pb-4 pt-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white bg-white/80 font-serif text-4xl shadow-sm ${getWuxingColor(analysis.char)}`}>{analysis.char}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold tracking-[0.18em] text-amber-800/60">{hiddenOnly ? '藏干释义' : '一字溯源'}</div>
            <h2 id={headingId} className="mt-1 text-base font-semibold text-stone-900">{analysis.location}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-stone-600">
              <span>{analysis.polarity}{analysis.element}</span><span aria-hidden="true">·</span>
              <span>{analysis.isDayMaster ? '日主' : analysis.selection.kind === 'branch' ? `本气${analysis.stem} · ${analysis.tenGod}` : analysis.tenGod}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭单字解读" className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-stone-500 transition hover:bg-stone-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700">×</button>
        </div>
        <div className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-stone-600" aria-live="polite" aria-atomic="true">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
          <span>{periodLabel}{!hiddenOnly && <> · {analysis.finalShares}份{delta !== null && dayunValue !== null ? ` · 较本命${delta >= 0 ? '+' : ''}${delta}` : ''}</>}</span>
        </div>
      </header>

      <div className="glass-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3 pt-4 [scrollbar-gutter:stable]">
        <DetailSection number="01" title="五行与象意" aside={element.theme}>
          <p className="text-xs leading-6 text-stone-700">{analysis.imagery}</p>
          <p className="mt-1 text-[11px] leading-5 text-stone-500">{element.text}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{element.images.map((image) => <span key={image} className="rounded-md bg-stone-100 px-2 py-1 text-[10px] text-stone-600">{image}</span>)}</div>
          {CHARACTER_SYMBOLISM[analysis.char] && <MeaningGroups groups={CHARACTER_SYMBOLISM[analysis.char]} />}
        </DetailSection>

        <DetailSection number="02" title="十神关系" aside={`以日主${analysis.dayMaster}为参照`}>
          <div className="flex items-baseline gap-2"><span className="text-sm font-semibold text-stone-800">{analysis.isDayMaster ? '日主 · 自身' : analysis.tenGod}</span><span className="text-[10px] text-stone-500">{analysis.isDayMaster ? '十神参照' : god?.element}</span></div>
          <p className="mt-1.5 text-xs leading-6 text-stone-600">{analysis.isDayMaster ? '日干是十神判断的参照点。其他干与日干的五行生克、阴阳异同，共同确定十神。' : god?.meaning}</p>
          {!analysis.isDayMaster && TEN_GOD_SYMBOLISM[analysis.tenGod] && <MeaningGroups groups={TEN_GOD_SYMBOLISM[analysis.tenGod]} />}
          {analysis.selection.kind !== 'stem' && <div className="mt-3">
            <div className="mb-2 text-[10px] leading-5 text-stone-500">各藏干的十神与含义：</div>
            <div className="flex flex-wrap gap-2">{analysis.hidden.map((item) => <button key={item.stem} type="button" onClick={() => onSelect({ columnKey: analysis.target.key, kind: 'hidden', hiddenStem: item.stem })}
              aria-pressed={analysis.selection.kind === 'hidden' && analysis.stem === item.stem}
              className={`rounded-xl border px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700 ${analysis.stem === item.stem ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white hover:bg-stone-50'}`}>
              <span className={`mr-1.5 text-base font-bold ${getWuxingColor(item.stem)}`}>{item.stem}</span><span className="text-[11px] text-stone-700">{item.tenGod}</span><div className="mt-0.5 text-[10px] text-stone-500">{item.qi}</div>
            </button>)}</div>
          </div>}
        </DetailSection>

        <DetailSection number="03" title="宫位象意" aside={palace.title}>
          <p className="text-xs leading-6 text-stone-700">{palace.meaning}</p>
          <MeaningGroups groups={palace.groups} />
        </DetailSection>

        {!hiddenOnly && <>
        <DetailSection number="04" title="寻根基 · 找出处" aside={analysis.rootStatus}>
          {analysis.selection.kind === 'branch' && <p className="mb-2 text-[11px] leading-5 text-stone-500">当前按地支本气{analysis.stem}查来源；其他藏干可在上方分别查看。</p>}
          <div className="mb-2 text-[10px] font-semibold text-stone-500">本命根源 · {analysis.natalRoots.length}处</div>
          {analysis.natalRoots.length ? <SourceList sources={analysis.natalRoots} analysis={analysis} /> : <p className="rounded-xl border border-dashed border-stone-300 p-3 text-xs leading-6 text-stone-500">原局未见{analysis.element}的长生、同五行根或墓库根。{analysis.roots.length ? '当前岁运带入了根系，见下方岁运来源。' : '有无生扶，另看下面的作用路径。'}</p>}
          {natalSupport.length > 0 && <details className="mt-3">
            <summary className="cursor-pointer text-[11px] font-medium leading-6 text-stone-600">生扶与同类路径 · {natalSupport.length}条</summary>
            <div className="mt-2"><SourceList sources={natalSupport} analysis={analysis} /></div>
          </details>}
          {dayunValue !== null && <div className="mt-3 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3">
            <div className="mb-2 text-[11px] font-semibold text-amber-900">岁运来源与作用变化</div>
            {analysis.flowSources.length ? <SourceList sources={analysis.flowSources} analysis={analysis} /> : <p className="text-[11px] leading-5 text-stone-500">所选岁运未检出新的同五行根或生扶、同类线索。</p>}
            {analysis.interactions.map((item) => <p key={item.id} className="mt-2 text-[11px] leading-5 text-amber-900/80">{item.text}</p>)}
          </div>}
        </DetailSection>

        <DetailSection number="05" title="定份额">
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-4">
            <div className="flex items-end justify-between gap-2">
              <div><div className="text-[10px] text-amber-900/70">当前来源份额</div><div className="mt-1 text-4xl font-semibold tracking-tight text-stone-900">{analysis.finalShares}<span className="ml-1.5 text-sm font-normal text-stone-500">份</span></div></div>
              <div className="pb-1 text-right text-[11px] leading-5 text-stone-500">{analysis.natalShares !== null ? <>本命 {analysis.natalShares} 份<br />{dayunValue !== null ? `当前较本命 ${delta! >= 0 ? '+' : ''}${delta} 份` : '尚未叠加岁运'}</> : <>岁运目标<br />按当前盘面溯源</>}</div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-stone-600">分别是：{analysis.units.map((unit) => unit.label).join('、')}。</p>
          </div>
          <ol className="mt-3 space-y-2">{analysis.units.map((unit, index) => <li key={unit.id}>
            <details className="group rounded-xl border border-stone-200/80 bg-white/70 px-3 py-2.5">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] text-stone-500">{index + 1}</span>
                <span className="font-medium text-stone-800">{unit.label}</span>
                {analysis.addedUnits.some((added) => added.id === unit.id) && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700">新增</span>}
                <span className="ml-auto whitespace-nowrap text-[10px] text-stone-500">1份 <span aria-hidden="true">›</span></span>
              </summary>
              <div className="mt-2 space-y-2 border-t border-stone-100 pt-2 text-[11px] leading-5 text-stone-600">
                <p className="text-stone-700">{describeShareUnit(analysis, unit)}</p>
                <div className="space-y-1 border-l-2 border-amber-200/70 pl-2.5 text-stone-500">{unit.paths.map((path) => <p key={path}>{path}</p>)}</div>
              </div>
            </details>
          </li>)}</ol>
          <details className="mt-3 rounded-xl bg-stone-100/70 p-3">
            <summary className="cursor-pointer text-[11px] font-medium text-stone-600">来源归属 · {analysis.parties.length}方参与</summary>
            <div className="mt-2 space-y-2 text-[11px] leading-5 text-stone-500">
              {analysis.parties.map((party) => <p key={party.key}><strong className="font-medium text-stone-700">{party.label}：</strong>{party.evidence.join('；')}</p>)}
            </div>
          </details>
        </DetailSection>
        </>}
      </div>

    </div>
  </div>, document.body);
}
