'use client';

import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { SmoothCollapse, useInteractionTransition } from '../InteractionMotion';
import AiBusyText from '../AiBusyText';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  busy?: boolean;
  submitLabel?: string;
  allowEmpty?: boolean;
  maxLength?: number;
  onCopy?: () => void;
  copied?: boolean;
  context?: React.ReactNode;
  contextOpen?: boolean;
  contextCount?: number;
  onToggleContext?: () => void;
};

export default function PromptBox({ value, onChange, onSubmit, placeholder = '输入你的问题…', disabled, busy, submitLabel = '发送', allowEmpty = false, maxLength, onCopy, copied, context, contextOpen, contextCount = 0, onToggleContext }: Props) {
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const contextId = useId();
  const transition = useInteractionTransition(.22);
  const expanded = focused || Boolean(value) || Boolean(busy) || Boolean(contextOpen) || allowEmpty;
  useLayoutEffect(() => {
    if (!input.current) return;
    input.current.style.height = 'auto';
    input.current.style.height = `${Math.min(192, Math.max(48, input.current.scrollHeight))}px`;
  }, [value]);
  const submit = () => { if (!disabled && !busy && (allowEmpty || value.trim())) onSubmit(); };
  return <motion.div layout="size" initial={false} transition={transition}
    className={`prompt-box ${expanded ? 'prompt-box-expanded' : ''}`}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocused(false); }}>
    <SmoothCollapse open={Boolean(contextOpen && context)}><div id={contextId} className="prompt-context">{context}</div></SmoothCollapse>
    <textarea ref={input} aria-label={placeholder} rows={1} maxLength={maxLength} value={value} disabled={disabled || busy} placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); submit(); }
        if (event.key === 'Escape' && contextOpen) { event.stopPropagation(); onToggleContext?.(); }
      }} className="prompt-field" />
    <SmoothCollapse open={expanded}>
      <div className="prompt-toolbar">
        {context && onToggleContext && <button type="button" disabled={busy} aria-expanded={contextOpen} aria-controls={contextId} onClick={onToggleContext} className="prompt-context-trigger">添加上下文{contextCount ? ` · ${contextCount}` : ''}<span aria-hidden="true">{contextOpen ? '⌃' : '⌄'}</span></button>}
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {onCopy && <button type="button" onClick={onCopy} disabled={busy} className="prompt-copy">{copied ? '已复制' : '复制AI提示词'}</button>}
          <button type="button" onClick={submit} disabled={disabled || busy || (!allowEmpty && !value.trim())} aria-busy={busy} className="prompt-send" aria-label={busy ? '正在生成' : submitLabel}>
            <AiBusyText active={Boolean(busy)} theme="dark">{busy ? '生成中…' : <><span className="text-xs">{submitLabel}</span><span aria-hidden="true">↑</span></>}</AiBusyText>
          </button>
        </div>
      </div>
    </SmoothCollapse>
  </motion.div>;
}
