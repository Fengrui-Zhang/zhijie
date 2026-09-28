'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useInteractionTransition } from '../InteractionMotion';

type Props = {
  onSave: () => void | boolean | Promise<void | boolean>;
  label?: string;
  pendingLabel?: string;
  successLabel?: string;
  disabled?: boolean;
  className?: string;
  secondary?: boolean;
  compact?: boolean;
};

export default function SaveButton({ onSave, label = '保存', pendingLabel = '保存中', successLabel = '已保存', disabled, className = '', secondary, compact }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');
  const running = useRef(false);
  const mounted = useRef(true);
  const enabled = useInteractionTransition().duration > 0;
  const letters = enabled ? { type: 'spring' as const, stiffness: 500, damping: 30, mass: 1 } : { duration: 0 };
  const badge = enabled ? { type: 'spring' as const, stiffness: 300, damping: 20 } : { duration: 0 };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (status !== 'success') return;
    const timer = window.setTimeout(() => setStatus('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);
  const save = async () => {
    if (disabled || running.current || status === 'success') return;
    running.current = true;
    setError('');
    setStatus('loading');
    try {
      const result = await onSave();
      if (mounted.current) {
        setStatus(result === false ? 'idle' : 'success');
        if (result === false) setError('未能保存，请检查后重试');
      }
    } catch (cause) {
      if (mounted.current) {
        setStatus('idle');
        setError(cause instanceof Error ? cause.message : '保存失败，请重试');
      }
    } finally { running.current = false; }
  };
  const text = status === 'loading' ? pendingLabel : status === 'success' ? successLabel : label;
  return <span className={`save-action-wrap ${className}`}>
    <motion.button type="button" disabled={disabled || status !== 'idle'} aria-busy={status === 'loading'} aria-label={text}
      data-status={status} data-secondary={secondary || undefined} data-compact={compact || undefined}
      className="save-action" onClick={() => void save()}>
      <span className="inline-flex justify-center" aria-hidden="true">
        <AnimatePresence initial={false} mode="popLayout">{Array.from(text).map((char, index) => <motion.span
          key={`${char}-${index}`} layout initial={{ opacity: 0, scale: enabled ? 0 : 1, filter: enabled ? 'blur(4px)' : 'blur(0px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: enabled ? 0 : 1, filter: enabled ? 'blur(4px)' : 'blur(0px)' }} transition={letters}
          className="inline-block whitespace-pre">{char}</motion.span>)}</AnimatePresence>
      </span>
      <AnimatePresence initial={false}>{status !== 'idle' && <motion.span aria-hidden="true" className="save-action-badge"
        initial={{ opacity: 0, scale: enabled ? 0 : 1, filter: enabled ? 'blur(4px)' : 'blur(0px)', x: enabled ? -8 : 0 }} animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: enabled ? 0 : 1, x: enabled ? -8 : 0, filter: enabled ? 'blur(4px)' : 'blur(0px)' }} transition={badge}>
        <AnimatePresence mode="popLayout" initial={false}>
          {status === 'success' ? <motion.span key="check" className="save-action-symbol" initial={{ scale: enabled ? 0 : 1, opacity: 0, filter: enabled ? 'blur(4px)' : 'blur(0px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} exit={{ scale: enabled ? 0 : 1, opacity: 0, filter: enabled ? 'blur(4px)' : 'blur(0px)' }} transition={enabled ? { type: 'spring', stiffness: 500, damping: 25 } : { duration: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4 10-10" /></svg>
          </motion.span> : <motion.span key="loader" className="save-action-symbol" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ scale: enabled ? 0 : 1, opacity: 0 }} transition={{ duration: enabled ? .2 : 0 }}>
            <svg className="save-action-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9" opacity=".25" /><path d="M12 3a9 9 0 0 1 9 9" /></svg>
          </motion.span>}
        </AnimatePresence>
      </motion.span>}</AnimatePresence>
    </motion.button>
    <span role="status" className="sr-only">{status === 'idle' ? '' : text}</span>
    {error && <span role="alert" className="mt-1 text-xs text-red-600">{error}</span>}
  </span>;
}
