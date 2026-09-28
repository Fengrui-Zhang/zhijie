'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import type { CaseItem } from '../../lib/divination-cases';
import { getCaseCardPreview } from '../../lib/case-card-preview';
import { getWuxingColor } from '../../utils/wuxing';
import { useInteractionTransition } from '../InteractionMotion';
import DeleteButton from './DeleteButton';
import { TactileButton } from './TactileButton';

type Props = { items: CaseItem[]; onOpen: (id: string) => void; onEdit: (id: string) => void; onDelete: (id: string) => Promise<void | boolean>; };
type Entry = { item: CaseItem; preview: ReturnType<typeof getCaseCardPreview> };
const spring = { type: 'spring' as const, stiffness: 380, damping: 30, mass: .75 };

export default function CaseCardStack({ items, onOpen, onEdit, onDelete }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const entries = useMemo(() => items.map((item) => ({ item, preview: getCaseCardPreview(item) })), [items]);
  const cards = useMemo(() => entries.filter(({ preview }) => `${preview.name} ${preview.sex} ${preview.pillars.join(' ')}`.includes(query.trim())), [entries, query]);
  return <section aria-label="命例卡片" className="case-library">
    <div className="case-library-toolbar">
      <input aria-label="搜索命例" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索命例或四柱" className="glass-input min-w-0 flex-1 rounded-2xl px-4 py-2.5 text-sm" />
      <span aria-live="polite" className="shrink-0 text-xs tabular-nums text-stone-500">{query.trim() ? `${cards.length} / ${items.length}` : `${items.length} 个命例`}</span>
    </div>
    {!cards.length ? <div className="py-12 text-center text-sm text-stone-500">没有匹配的命例</div> : <div className="case-library-list">
      {cards.map((entry) => <CaseCard key={entry.item.id} entry={entry} expanded={entry.item.id === activeId}
        onToggle={() => setActiveId((current) => current === entry.item.id ? null : entry.item.id)} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />)}
    </div>}
  </section>;
}

function CaseCard({ entry, expanded, onToggle, onOpen, onEdit, onDelete }: EntryProps & { expanded: boolean; onToggle: () => void }) {
  const { item, preview } = entry;
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const motionPreference = useInteractionTransition(.18);
  const transition = motionPreference.duration ? spring : { duration: 0 };
  return <div className="case-library-hover" onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}>
    <motion.article initial={false} data-case-id={item.id} data-expanded={expanded} className="case-library-card"
    animate={{ y: !expanded && hovered && motionPreference.duration ? -8 : 0, boxShadow: expanded ? '0 12px 30px rgba(41,37,36,0.07), 0 2px 5px rgba(41,37,36,0.03)' : '0 2px 5px rgba(41,37,36,0.025), 0 0px 0px rgba(41,37,36,0)' }} transition={{ ...motionPreference, y: motionPreference.duration ? { type: 'spring', stiffness: hovered ? 450 : 380, damping: hovered ? 25 : 30, mass: .75 } : { duration: 0 } }}
    onKeyDown={(event) => { if (event.key === 'Escape' && expanded) { event.preventDefault(); onToggle(); trigger.current?.focus(); } }}>
    <div className="case-library-heading">
      <motion.button ref={trigger} id={`${id}-trigger`} type="button" className="case-library-toggle"
        aria-label={`${expanded ? '收起' : '展开'}${preview.name}命例`} aria-expanded={expanded} aria-controls={`${id}-detail`}
        whileTap={motionPreference.duration ? { scale: expanded ? .99 : .98 } : undefined} onClick={onToggle} transition={motionPreference}>
        <span className="case-library-identity"><span className="case-library-name" title={preview.name}>{preview.name}</span><span className="case-library-sex">{preview.sex}</span></span>
        <span className="case-library-pillars">{preview.pillars.map((pillar, i) => <span key={i}>{pillar}</span>)}</span>
        <motion.svg className="case-library-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
          animate={{ rotate: expanded ? 180 : 0 }} transition={transition}><path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></motion.svg>
      </motion.button>
    </div>
    <AnimatePresence initial={false}>{expanded && <CaseDetails key="detail" id={`${id}-detail`} labelledBy={`${id}-trigger`} entry={entry} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />}</AnimatePresence>
  </motion.article></div>;
}

type EntryProps = Pick<Props, 'onOpen' | 'onEdit' | 'onDelete'> & { entry: Entry };
function CaseDetails({ id, labelledBy, entry: { item, preview }, onOpen, onEdit, onDelete }: EntryProps & { id: string; labelledBy: string }) {
  const present = useIsPresent();
  const motionPreference = useInteractionTransition(.18);
  const transition = motionPreference.duration ? spring : { duration: 0 };
  return <motion.div id={id} role="region" aria-labelledby={labelledBy} inert={!present} aria-hidden={!present || undefined} className="case-library-reveal"
    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={transition}>
    <motion.div className="case-library-detail" initial={{ opacity: 0, y: motionPreference.duration ? 8 : 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 0 }} transition={motionPreference}>
      <div className="case-library-meta">
        <dl className="case-library-dates">
          <div><dt>阳历</dt><dd>{preview.solar}</dd></div><div><dt>阴历</dt><dd>{preview.lunar}</dd></div>
          {preview.trueSolar && <div><dt>真太阳时</dt><dd>{preview.trueSolar}</dd></div>}
          {preview.location && <div><dt>出生地</dt><dd>{preview.location}</dd></div>}
          <div><dt>排盘时间</dt><dd>{new Date(preview.chartTime).toLocaleString('zh-CN', { hour12: false })}</dd></div>
        </dl>
        <TactileButton disabled={!present} className="case-library-open" size="sm" fullWidth aria-label={`查看${preview.name}专业排盘与解读`} onClick={() => onOpen(item.id)}>
          专业排盘<span className="case-library-open-reading">与解读</span>
        </TactileButton>
        <div className="case-library-actions">
          <DeleteButton disabled={!present} onDelete={() => onDelete(item.id)} neutral countdown={3} />
          <button type="button" onClick={() => onEdit(item.id)} className="case-library-edit">编辑</button>
        </div>
      </div>
      <div className="case-library-chart">
        <table className="case-mini-chart" aria-label={`${preview.name}四柱简盘`}>
          <thead><tr><th scope="col">四柱</th>{['年柱', '月柱', '日柱', '时柱'].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{['天干', '地支', '藏干'].map((row, ri) => <tr key={row}><th scope="row">{row}</th>{preview.pillars.map((pillar, i) => <td key={i} className={ri === 2 ? 'align-top' : ''}>{ri === 2 ? <div className="flex flex-col items-center gap-1">{preview.hidden[i].length ? preview.hidden[i].map((stem) => <span key={stem} className={`text-sm font-bold ${getWuxingColor(stem)}`}>{stem}</span>) : '—'}</div> : <span className={`text-2xl font-bold md:text-3xl ${getWuxingColor(pillar[ri] || '')}`}>{pillar[ri] || '—'}</span>}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </motion.div>
  </motion.div>;
}
