'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useInteractionTransition } from '../InteractionMotion';

type Props = {
  onDelete: () => void | boolean | Promise<void | boolean>;
  label?: string;
  disabled?: boolean;
  className?: string;
  countdown?: number;
};

export default function DeleteButton({ onDelete, label = '删除', disabled, className = '', countdown = 5 }: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const callback = useRef(onDelete);
  callback.current = onDelete;
  const running = useRef(false);
  const mounted = useRef(true);
  const enabled = useInteractionTransition().duration > 0;
  const layoutTransition = { duration: enabled ? .4 : 0, ease: [.77, 0, .175, 1] as const };
  const charTransition = { duration: enabled ? .3 : 0, ease: [.785, .135, .15, .86] as const };
  const cancelling = remaining !== null;
  const text = pending ? '删除中…' : cancelling ? '取消删除' : label;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (disabled) setRemaining(null);
  }, [disabled]);
  useEffect(() => {
    const cancel = () => { if (document.hidden) setRemaining(null); };
    document.addEventListener('visibilitychange', cancel);
    return () => document.removeEventListener('visibilitychange', cancel);
  }, []);
  useEffect(() => {
    if (remaining === null || disabled) return;
    const timer = window.setTimeout(async () => {
      if (remaining > 1) { setRemaining(remaining - 1); return; }
      if (running.current) return;
      running.current = true;
      setRemaining(null);
      setPending(true);
      try {
        const result = await callback.current();
        if (result === false) throw new Error('删除失败，请重试');
      } catch (cause) {
        if (mounted.current) setError(cause instanceof Error ? cause.message : '删除失败，请重试');
      } finally {
        running.current = false;
        if (mounted.current) setPending(false);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, disabled]);
  return <span className={`inline-flex max-w-full flex-col items-start gap-1 ${className}`} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
    <motion.button type="button" layout disabled={disabled || pending} aria-busy={pending}
      aria-label={cancelling ? `取消${label}，剩余${remaining}秒` : label}
      className="delete-action" data-cancelling={cancelling}
      animate={{ backgroundColor: cancelling ? '#FFEDF1' : '#FE322A', color: cancelling ? '#FE322A' : '#FFFFFF', filter: enabled ? ['blur(1px)', 'blur(0px)'] : 'blur(0px)' }}
      whileTap={enabled ? { scale: .95 } : undefined}
      transition={{ layout: layoutTransition, backgroundColor: { duration: enabled ? .4 : 0, ease: 'easeInOut' }, color: { duration: enabled ? .2 : 0 }, filter: { duration: enabled ? .1 : 0 } }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setRemaining(null); } }}
      onClick={() => { setError(''); setRemaining((value) => value === null ? countdown : null); }}>
      <AnimatePresence initial={false} mode="popLayout">{cancelling && <motion.span key="undo" aria-hidden="true" className="delete-undo"
        initial={{ opacity: 0, scale: enabled ? .5 : 1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: enabled ? .5 : 1 }}
        transition={{ duration: enabled ? .2 : 0, delay: enabled ? .05 : 0 }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 5 3 10l5 5M3 10h10a6 6 0 1 1 0 12" transform="translate(0 -2)" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </motion.span>}</AnimatePresence>
      <motion.span layout="position" className="relative inline-flex" aria-hidden="true" transition={layoutTransition}>
        <AnimatePresence initial={false} mode="popLayout">{Array.from(text).map((char, index) => <motion.span key={`${pending ? 'pending' : cancelling ? 'cancel' : 'delete'}-${index}-${char}`}
          initial={{ y: enabled ? 20 : 0, opacity: 0, scale: enabled ? .3 : 1 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: enabled ? -20 : 0, opacity: 0, scale: enabled ? .3 : 1 }}
          transition={{ ...charTransition, delay: enabled ? index * (cancelling ? .006 : .005) : 0 }} className="inline-block whitespace-pre">{char}</motion.span>)}</AnimatePresence>
      </motion.span>
      <AnimatePresence initial={false} mode="popLayout">{cancelling && <motion.span key="count" aria-hidden="true" className="delete-count" initial={{ opacity: 0, scale: enabled ? .5 : 1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: enabled ? .5 : 1 }} transition={{ duration: enabled ? .2 : 0, delay: enabled ? .1 : 0 }}>
        <AnimatePresence mode="popLayout" initial={false}><motion.span key={remaining} initial={{ y: enabled ? 10 : 0, opacity: 0, scale: enabled ? .8 : 1 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: enabled ? -10 : 0, opacity: 0, scale: enabled ? .8 : 1 }} transition={{ duration: enabled ? .2 : 0, ease: [.33, 1, .68, 1] }}>{remaining}</motion.span></AnimatePresence>
      </motion.span>}</AnimatePresence>
    </motion.button>
    <span className="sr-only" role="status">{remaining !== null ? `${remaining}秒后删除，可再次点击取消` : pending ? '正在删除' : ''}</span>
    {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
  </span>;
}
