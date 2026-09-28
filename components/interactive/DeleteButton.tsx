'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TransitionText, useInteractionTransition } from '../InteractionMotion';

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
  const transition = useInteractionTransition(0.2);
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
      aria-label={remaining !== null ? `取消${label}，剩余${remaining}秒` : label}
      className="delete-action"
      animate={{ backgroundColor: remaining !== null ? '#fff0ee' : '#fff7f5', color: '#b42318' }} transition={transition}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setRemaining(null); } }}
      onClick={() => { setError(''); setRemaining((value) => value === null ? countdown : null); }}>
      <TransitionText value={pending ? 'pending' : remaining === null ? 'delete' : 'cancel'}>
        {pending ? '删除中…' : remaining === null ? label : '↶ 取消删除'}
      </TransitionText>
      <AnimatePresence initial={false}>{remaining !== null && <motion.span className="delete-count" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .8 }} transition={transition}>
        <AnimatePresence mode="popLayout" initial={false}><motion.span key={remaining} initial={{ y: transition.duration ? 8 : 0, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: transition.duration ? -8 : 0, opacity: 0 }} transition={transition}>{remaining}</motion.span></AnimatePresence>
      </motion.span>}</AnimatePresence>
    </motion.button>
    <span className="sr-only" role="status">{remaining !== null ? `${remaining}秒后删除，可再次点击取消` : pending ? '正在删除' : ''}</span>
    {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
  </span>;
}
