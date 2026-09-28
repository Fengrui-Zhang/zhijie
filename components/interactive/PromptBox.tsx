'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useInteractionTransition } from '../InteractionMotion';
import AiBusyText from '../AiBusyText';

type Props = {
  value: string; onChange: (value: string) => void; onSubmit: () => void;
  placeholder?: string; disabled?: boolean; busy?: boolean; submitLabel?: string;
  allowEmpty?: boolean; maxLength?: number; onCopy?: () => void; copied?: boolean;
  context?: React.ReactNode; contextOpen?: boolean; contextCount?: number; onToggleContext?: () => void;
};
const easeOut = [.215, .61, .355, 1] as const;
const easeOutQuad = [.25, .46, .45, .94] as const;
function ContextIcon() { return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

export default function PromptBox({ value, onChange, onSubmit, placeholder = '输入你的问题…', disabled, busy, submitLabel = '发送', allowEmpty = false, maxLength, onCopy, copied, context, contextOpen, contextCount = 0, onToggleContext }: Props) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hoverReady, setHoverReady] = useState(true);
  const [fieldHeight, setFieldHeight] = useState(44);
  const [panelBounds, setPanelBounds] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const contextTrigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef(onToggleContext); toggle.current = onToggleContext;
  const contextId = useId();
  const enabled = useInteractionTransition().duration > 0;
  const shellTransition = enabled ? { type: 'spring' as const, stiffness: 400, damping: 25, mass: 1.5 } : { duration: 0 };
  const expanded = focused || Boolean(value) || Boolean(busy) || Boolean(contextOpen) || allowEmpty;
  useEffect(() => {
    setHoverReady(false); setHovered(false);
    if (expanded) return;
    const timer = window.setTimeout(() => setHoverReady(true), enabled ? 320 : 0);
    return () => window.clearTimeout(timer);
  }, [expanded, enabled]);
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    const measure = () => { element.style.height = 'auto'; const height = Math.min(254, Math.max(44, element.scrollHeight)); element.style.height = `${height}px`; setFieldHeight(height); };
    measure();
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => { if (Math.abs(entry.contentRect.width - width) > .5) { width = entry.contentRect.width; measure(); } });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, expanded]);
  useLayoutEffect(() => {
    if (!contextOpen) return;
    const position = () => {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const above = rect.top - 16, below = window.innerHeight - rect.bottom - 16;
      const width = Math.min(440, window.innerWidth - 24);
      const opensAbove = above >= Math.min(320, below);
      setPanelBounds({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width,
        ...(opensAbove ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }), maxHeight: Math.max(80, Math.min(420, opensAbove ? above : below)) });
    };
    position();
    window.addEventListener('resize', position); window.addEventListener('scroll', position, true);
    const observer = new ResizeObserver(position); if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [contextOpen]);
  useEffect(() => {
    if (!contextOpen) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) { setFocused(false); toggle.current?.(); } };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); toggle.current?.(); contextTrigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [contextOpen]);
  const submit = () => { if (!disabled && !busy && (allowEmpty || value.trim())) { if (contextOpen) toggle.current?.(); onSubmit(); } };
  return <>
    <motion.div ref={root} initial={false} animate={{ maxWidth: expanded ? 440 : 320 }} transition={shellTransition} className="prompt-frame"
      onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node) && !panel.current?.contains(event.relatedTarget as Node)) setFocused(false); }}>
      <motion.div initial={false} animate={{ height: expanded ? fieldHeight + 60 : 52 }} transition={shellTransition} className={`prompt-box ${expanded ? 'prompt-box-expanded' : ''}`}
        onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}>
        <textarea ref={input} aria-label={placeholder} rows={1} maxLength={maxLength} value={value} disabled={disabled || busy} placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); submit(); }
            if (event.key === 'Escape' && !contextOpen && !value) { event.preventDefault(); input.current?.blur(); setFocused(false); }
          }} className="prompt-field" />
        <AnimatePresence>{!expanded && context && hovered && hoverReady && <motion.span aria-hidden="true" className="prompt-collapsed-icon"
          initial={enabled ? { opacity: 0, x: 28, rotate: -360 } : { opacity: 0 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={enabled ? { opacity: 0, x: 22, rotate: 120 } : { opacity: 0 }} transition={{ duration: enabled ? .38 : 0, ease: easeOut }}><ContextIcon /></motion.span>}</AnimatePresence>
        <motion.div initial={false} animate={{ opacity: expanded ? 1 : 0 }} transition={{ duration: enabled ? .2 : 0, delay: enabled && expanded ? .08 : 0, ease: easeOutQuad }}
          inert={!expanded} aria-hidden={!expanded || undefined} className="prompt-toolbar">
          {context && onToggleContext && <button ref={contextTrigger} type="button" disabled={busy} aria-expanded={contextOpen} aria-controls={contextId} aria-haspopup="dialog" onClick={onToggleContext} className="prompt-context-trigger"><ContextIcon /><span>添加上下文{contextCount ? ` · ${contextCount}` : ''}</span><motion.svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" initial={false} animate={{ rotate: contextOpen ? 180 : 0 }} transition={{ duration: enabled ? .16 : 0, ease: easeOutQuad }}><path d="m5 7 5 5 5-5" /></motion.svg></button>}
          <div className="ml-auto flex min-w-0 items-center gap-2">
            {onCopy && <button type="button" onClick={onCopy} disabled={busy} className="prompt-copy">{copied ? '已复制' : '复制AI提示词'}</button>}
            <motion.button type="button" onClick={submit} disabled={disabled || busy || (!allowEmpty && !value.trim())} aria-busy={busy} className="prompt-send" aria-label={busy ? '正在生成' : submitLabel}
              initial={false} animate={{ opacity: expanded ? 1 : 0, scale: expanded || !enabled ? 1 : .85 }} whileTap={enabled ? { scale: .92 } : undefined} transition={{ duration: enabled ? .15 : 0, ease: easeOutQuad }}>
              <AnimatePresence initial={false} mode="wait"><motion.span key={busy ? 'busy' : 'send'} className="inline-flex items-center gap-1.5" initial={{ opacity: 0, scale: enabled ? .5 : 1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: enabled ? .5 : 1 }} transition={{ duration: enabled ? .15 : 0, ease: easeOutQuad }}>
                {busy ? <AiBusyText active theme="dark">生成中…</AiBusyText> : <>{submitLabel !== '发送' && <span className="text-xs">{submitLabel}</span>}<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25"><path d="M12 19V5m-6 6 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg></>}
              </motion.span></AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
    {context && panelBounds && typeof document !== 'undefined' && createPortal(<div ref={panel} inert={!contextOpen} onBlurCapture={(event) => { if (contextOpen && event.relatedTarget && !panel.current?.contains(event.relatedTarget as Node) && !root.current?.contains(event.relatedTarget as Node)) { setFocused(false); toggle.current?.(); } }} className="prompt-context-anchor" style={{ ...panelBounds, pointerEvents: contextOpen ? 'auto' : 'none' }}>
      <AnimatePresence>{contextOpen && <motion.div id={contextId} role="dialog" aria-label="添加上下文" className="prompt-context" style={{ maxHeight: panelBounds.maxHeight, transformOrigin: panelBounds.bottom !== undefined ? 'bottom left' : 'top left' }}
        initial={{ opacity: 0, scale: enabled ? .94 : 1, y: enabled ? (panelBounds.bottom !== undefined ? 8 : -8) : 0 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: enabled ? .98 : 1, y: enabled ? (panelBounds.bottom !== undefined ? 5 : -5) : 0, transition: { duration: enabled ? .14 : 0, ease: easeOutQuad } }}
        transition={enabled ? { type: 'spring', stiffness: 480, damping: 24, mass: .85 } : { duration: 0 }}>{context}</motion.div>}</AnimatePresence>
    </div>, document.body)}
  </>;
}
