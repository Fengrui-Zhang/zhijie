'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useDragControls } from 'motion/react';
import type { CaseItem } from '../../lib/divination-cases';
import { getCaseCardPreview } from '../../lib/case-card-preview';
import { getWuxingColor } from '../../utils/wuxing';
import { useInteractionTransition } from '../InteractionMotion';
import DeleteButton from './DeleteButton';

type Props = { items: CaseItem[]; onOpen: (id: string) => void; onEdit: (id: string) => void; onDelete: (id: string) => Promise<void | boolean>; };
export default function CaseCardStack({ items, onOpen, onEdit, onDelete }: Props) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const [query, setQuery] = useState('');
  const cards = useMemo(() => items.map((item) => ({ item, preview: getCaseCardPreview(item) })).filter(({ preview }) => `${preview.name} ${preview.pillars.join(' ')}`.includes(query.trim())), [items, query]);
  const activeIndex = Math.max(0, cards.findIndex(({ item }) => item.id === activeId));
  const [height, setHeight] = useState(460);
  const activeRef = useRef<HTMLDivElement>(null);
  const suppressedUntil = useRef(0);
  const drag = useDragControls();
  const transition = useInteractionTransition(.26);
  const visible = Math.min(4, cards.length);
  const move = (delta: number) => { if (cards.length) setActiveId(cards[(activeIndex + delta + cards.length) % cards.length].item.id); };
  useLayoutEffect(() => {
    const target = activeRef.current;
    if (!target) return;
    const measure = () => setHeight(target.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [cards, activeIndex]);
  return <section aria-label="命例卡片" className="case-stack" onKeyDown={(event) => {
    if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
  }}>
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <input aria-label="搜索命例" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索命例或四柱" className="glass-input min-w-0 flex-1 rounded-2xl px-4 py-2.5 text-sm" />
      <div className="flex items-center gap-2">
        <button type="button" aria-label="上一张命例" disabled={cards.length < 2} onClick={() => move(-1)} className="case-stack-nav">‹</button>
        <span aria-live="polite" className="text-xs tabular-nums text-stone-500">{cards.length ? activeIndex + 1 : 0} / {cards.length}</span>
        <button type="button" aria-label="下一张命例" disabled={cards.length < 2} onClick={() => move(1)} className="case-stack-nav">›</button>
      </div>
    </div>
    {!cards.length ? <div className="py-12 text-center text-sm text-stone-500">没有匹配的命例</div> : <div className="relative mx-auto w-full max-w-3xl" style={{ height: height + (visible - 1) * 76 }}>
      {cards.map(({ item, preview }, index) => {
        const rank = (index - activeIndex + cards.length) % cards.length;
        if (rank >= 4) return null;
        const top = rank === 0;
        return <motion.article key={item.id} initial={false} animate={{ y: -rank * 76, width: `${100 - rank * 3}%` }} transition={transition}
          drag={top ? 'x' : false} dragListener={false} dragControls={top ? drag : undefined} dragConstraints={{ left: 0, right: 0 }} dragElastic={.18}
          onDragStart={() => { suppressedUntil.current = Infinity; }}
          onDragEnd={(_, info) => { suppressedUntil.current = Date.now() + 250; if (info.offset.x < -60 || info.velocity.x < -400) move(1); else if (info.offset.x > 60 || info.velocity.x > 400) move(-1); }}
          className={`case-stack-card ${top ? 'is-front' : ''}`} style={{ zIndex: visible - rank, height: top ? 'auto' : height }}
          onClick={(event) => { if (Date.now() < suppressedUntil.current || (event.target as HTMLElement).closest('button,input,textarea,select,a')) return; if (top) onOpen(item.id); else setActiveId(item.id); }}>
          <div ref={top ? activeRef : undefined}>
            <button type="button" className="case-stack-heading" aria-label={top ? `查看${preview.name}排盘` : `展开${preview.name}命例`} aria-expanded={top}
              onPointerDown={(event) => { if (top && cards.length > 1) drag.start(event); }}
              onClick={() => { if (Date.now() < suppressedUntil.current) return; if (top) onOpen(item.id); else setActiveId(item.id); }}>
              <span className="flex min-w-0 items-baseline gap-3"><span className="truncate text-base font-bold text-stone-800">{preview.name}</span><span className="shrink-0 text-xs text-stone-500">{preview.sex}</span></span>
              <span className="mt-1 flex gap-3 text-sm tracking-wider text-stone-600">{preview.pillars.map((pillar, i) => <span key={i}>{pillar}</span>)}</span>
            </button>
            <div inert={!top} aria-hidden={!top} className="case-stack-detail">
              <table className="case-mini-chart" aria-label={`${preview.name}四柱简盘`}>
                <thead><tr><th>四柱</th>{['年柱', '月柱', '日柱', '时柱'].map((label) => <th key={label}>{label}</th>)}</tr></thead>
                <tbody>{['天干', '地支', '藏干'].map((row, ri) => <tr key={row}><th>{row}</th>{preview.pillars.map((pillar, i) => <td key={i} className={ri === 2 ? 'align-top' : ''}>{ri === 2 ? <div className="flex flex-col items-center gap-1">{preview.hidden[i].length ? preview.hidden[i].map((stem) => <span key={stem} className={`text-sm font-bold ${getWuxingColor(stem)}`}>{stem}</span>) : '—'}</div> : <span className={`text-2xl font-bold md:text-3xl ${getWuxingColor(pillar[ri] || '')}`}>{pillar[ri] || '—'}</span>}</td>)}</tr>)}</tbody>
              </table>
              <dl className="case-stack-dates">
                <div><dt>阳历</dt><dd>{preview.solar}</dd></div><div><dt>阴历</dt><dd>{preview.lunar}</dd></div>
                {preview.trueSolar && <div><dt>真太阳时</dt><dd>{preview.trueSolar}</dd></div>}
                {preview.location && <div><dt>出生地</dt><dd>{preview.location}</dd></div>}
                <div><dt>排盘时间</dt><dd>{new Date(preview.chartTime).toLocaleString('zh-CN', { hour12: false })}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/70 pt-3">
                <DeleteButton disabled={!top} onDelete={() => onDelete(item.id)} label="删除命例" />
                <button type="button" onClick={() => onEdit(item.id)} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-600">编辑</button>
              </div>
            </div>
          </div>
        </motion.article>;
      })}
    </div>}
  </section>;
}
