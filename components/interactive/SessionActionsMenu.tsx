'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { SelectionGroup, useInteractionTransition } from '../InteractionMotion';
import DeleteButton from './DeleteButton';
import SessionRetentionButton from './SessionRetentionButton';

type Props = {
  retained?: boolean;
  onRetain?: (enabled: boolean) => Promise<void>;
  onDelete: () => void | boolean | Promise<void | boolean>;
};

export default function SessionActionsMenu(props: Props) {
  const [open, setOpen] = useState(false);
  const animated = useInteractionTransition().duration > 0;
  const anchor = useRef<HTMLButtonElement>(null);
  const id = useId();
  return <div className="session-actions shrink-0" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  }}>
    <button ref={anchor} type="button" aria-label="记录操作" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      title={props.retained ? '记录操作 · 已留存' : '记录操作'}
      onClick={() => setOpen((value) => !value)}
      className={`session-actions-trigger flex size-10 items-center justify-center rounded-xl border ${props.retained ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-stone-200 bg-white/90 text-stone-600'}`}>
      <motion.svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" initial={false} animate={{ opacity: open ? 0 : 1, scale: open && animated ? .8 : 1 }} transition={{ duration: animated ? .15 : 0 }} fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" /><circle cx="8" cy="12" r=".7" fill="currentColor" /><circle cx="12" cy="12" r=".7" fill="currentColor" /><circle cx="16" cy="12" r=".7" fill="currentColor" />
      </motion.svg>
    </button>
    {typeof document !== 'undefined' && createPortal(<AnimatePresence>{open && <ActionsPanel {...props} key={id} id={id} anchor={anchor} onClose={(restoreFocus) => {
      setOpen(false);
      if (restoreFocus) anchor.current?.focus({ preventScroll: true });
    }} />}</AnimatePresence>, document.body)}
  </div>;
}

function ActionsPanel({ id, anchor, onClose, retained, onRetain, onDelete }: Props & {
  id: string;
  anchor: React.RefObject<HTMLButtonElement | null>;
  onClose: (restoreFocus?: boolean) => void;
}) {
  const present = useIsPresent();
  const animated = useInteractionTransition().duration > 0;
  const panel = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [hovered, setHovered] = useState<string | null>(null);
  const [bounds, setBounds] = useState({ top: 0, bottom: 0, right: 12, width: 220, height: 108, above: false, maxHeight: 300 });
  const spring = animated ? { type: 'spring' as const, damping: 34, stiffness: 380, mass: .8 } : { duration: 0 };
  const indicatorSpring = animated ? { type: 'spring' as const, damping: 30, stiffness: 520, mass: .8 } : { duration: 0 };

  useLayoutEffect(() => {
    const update = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      const left = viewport?.offsetLeft || 0;
      const width = Math.min(220, (viewport?.width || innerWidth) - 24);
      const bottom = top + (viewport?.height || innerHeight);
      const height = content.current?.scrollHeight || 108;
      const above = rect.top + height > bottom - 12 && rect.bottom - height >= top + 12;
      setBounds({ top: Math.max(top + 12, rect.top), bottom: innerHeight - rect.bottom,
        right: innerWidth - Math.min(left + (viewport?.width || innerWidth) - 12, Math.max(left + width + 12, rect.right)),
        width, height, above, maxHeight: Math.max(60, above ? rect.bottom - top - 12 : bottom - Math.max(top + 12, rect.top) - 12) });
    };
    update();
    const observer = new ResizeObserver(update);
    if (content.current) observer.observe(content.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); window.visualViewport?.removeEventListener('resize', update); };
  }, [anchor]);

  useEffect(() => {
    if (!present) return;
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true }));
    const outside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !anchor.current?.contains(event.target as Node)) close.current();
    };
    document.addEventListener('pointerdown', outside);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside); };
  }, [anchor, present]);

  const active = hovered || (retained && onRetain ? 'retain' : null);
  const rows = [...(onRetain ? ['retain'] : []), 'delete'];
  return <motion.div ref={panel} id={id} role="menu" aria-label="记录操作" inert={!present} aria-hidden={!present || undefined}
    className="session-actions-menu fixed z-[70] overflow-hidden border border-stone-200/80 bg-[#fbfaf7] text-stone-700 shadow-[0_18px_50px_rgba(28,25,23,0.18)]"
    style={{ top: bounds.above ? undefined : bounds.top, bottom: bounds.above ? bounds.bottom : undefined, right: bounds.right, transformOrigin: bounds.above ? 'bottom right' : 'top right' }}
    initial={{ width: 40, height: 40, borderRadius: 12 }} animate={{ width: bounds.width, height: Math.min(bounds.height, bounds.maxHeight), borderRadius: 14 }}
    exit={{ width: 40, height: 40, borderRadius: 12 }} transition={spring}
    onClick={(event) => event.stopPropagation()}
    onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== anchor.current) close.current(); }}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); close.current(true); return; }
      if (event.key === 'Tab') { close.current(true); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }}>
    <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: animated ? .8 : 1 }} exit={{ opacity: 1, scale: 1 }}
      transition={{ duration: animated ? .15 : 0 }}>
      <svg viewBox="0 0 24 24" className="size-6 text-stone-600" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" /><circle cx="8" cy="12" r=".7" fill="currentColor" /><circle cx="12" cy="12" r=".7" fill="currentColor" /><circle cx="16" cy="12" r=".7" fill="currentColor" />
      </svg>
    </motion.div>
    <div className="overflow-y-auto overscroll-contain" style={{ width: bounds.width, maxHeight: bounds.maxHeight }}>
      <motion.div ref={content} className="p-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: animated ? .2 : 0, delay: present && animated ? .08 : 0 }}>
        <SelectionGroup><div className="flex flex-col gap-0.5" onPointerLeave={() => setHovered(null)}>
          {rows.map((row, index) => <motion.div key={row} className="relative rounded-lg"
            initial={{ opacity: 0, x: animated ? 8 : 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: animated ? 8 : 0 }}
            transition={{ duration: animated ? row === 'delete' ? .12 : .15 : 0, delay: animated && present ? .06 + index * .02 : 0, ease: [.23, 1, .32, 1] }}
            onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(row); }} onFocus={() => setHovered(row)}>
            {active === row && <>
              <motion.span aria-hidden="true" layoutId="action-background" transition={indicatorSpring} className={`pointer-events-none absolute inset-0 rounded-lg ${row === 'delete' ? 'bg-red-50' : 'bg-stone-100'}`} />
              <motion.span aria-hidden="true" layoutId="action-bar" transition={indicatorSpring} className={`pointer-events-none absolute left-0 top-3 z-10 h-5 w-[3px] rounded-full ${row === 'delete' ? 'bg-red-500' : retained ? 'bg-amber-600' : 'bg-stone-700'}`} />
            </>}
            {row === 'retain' && onRetain ? <SessionRetentionButton enabled={Boolean(retained)} onChange={onRetain} /> : <DeleteButton variant="menu" neutral disabled={!present} className="relative w-full" onDelete={async () => {
              const result = await onDelete();
              if (result !== false) close.current();
              return result;
            }} />}
          </motion.div>)}
        </div></SelectionGroup>
      </motion.div>
    </div>
  </motion.div>;
}
