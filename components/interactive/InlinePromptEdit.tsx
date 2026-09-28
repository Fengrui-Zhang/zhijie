'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import MarkdownContent from '../MarkdownContent';
import { SmoothCollapse, useInteractionTransition } from '../InteractionMotion';

type Props = { value: string; disabled?: boolean; onSave: (value: string) => Promise<void | boolean>; };
export default function InlinePromptEdit({ value, disabled, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const editButton = useRef<HTMLButtonElement>(null);
  const transition = useInteractionTransition(.2);
  const slide = transition.duration ? { type: 'spring' as const, bounce: .1 } : { duration: 0 };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select(); } }, [editing]);
  useLayoutEffect(() => {
    if (input.current) { input.current.style.height = 'auto'; input.current.style.height = `${Math.min(260, Math.max(48, input.current.scrollHeight))}px`; }
  }, [draft, editing]);
  const cancel = () => { if (!saving) { setDraft(value); setEditing(false); setError(''); requestAnimationFrame(() => editButton.current?.focus()); } };
  const save = async () => {
    if (!draft.trim() || disabled || submitting.current) return;
    submitting.current = true; setSaving(true); setError('');
    try {
      const result = await onSave(draft.trim());
      if (mounted.current) { if (result !== false) setEditing(false); else setError('重新生成失败，请重试'); }
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : '重新生成失败，请重试'); }
    finally { submitting.current = false; if (mounted.current) setSaving(false); }
  };
  return <div className={`inline-prompt-edit ${editing ? 'is-editing' : ''}`}>
    <motion.div layout initial={false} className="inline-prompt-main" animate={{ borderRadius: editing ? 20 : 28, boxShadow: editing ? '0 0 0 2px rgba(226,200,130,.55), 0 0 0 5px rgba(226,200,130,.12)' : '0 0 2px rgba(255,255,255,.1)' }} transition={slide}>
      {editing ? <textarea ref={input} aria-label="修改已发送的问题" value={draft} disabled={saving || disabled} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); cancel(); }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void save(); }
      }} className="inline-prompt-field" rows={1} /> : <motion.div layout="position" className="inline-prompt-content"><MarkdownContent content={value} /></motion.div>}
      <AnimatePresence initial={false}>
        {!editing ? <motion.button ref={editButton} key="pen" layout="position" type="button" disabled={disabled} aria-label="修改问题" title="修改已发送的问题并重新生成"
          initial={{ x: transition.duration ? 50 : 0 }} animate={{ x: 0 }} exit={{ x: transition.duration ? 50 : 0 }} transition={slide}
          className="inline-prompt-icon" onClick={() => { setDraft(value); setEditing(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5" /></svg>
        </motion.button> : <motion.button key="check" layout="position" type="button" disabled={disabled || saving || !draft.trim()} aria-busy={saving}
          aria-label={saving ? '正在重新生成' : '保存并重新生成'} title="将从这条问题重新生成后续对话"
          initial={{ x: transition.duration ? 50 : 0 }} animate={{ x: 0 }} exit={{ x: transition.duration ? 50 : 0 }} transition={slide}
          className="inline-prompt-icon is-save" onClick={() => void save()}>
          {saving ? <svg aria-hidden="true" className="save-action-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" opacity=".25" /><path d="M12 3a9 9 0 0 1 9 9" /></svg> : <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4 10-10" /></svg>}
        </motion.button>}
      </AnimatePresence>
    </motion.div>
    <SmoothCollapse open={editing}><div className="inline-prompt-edit-footer"><span>重新生成会替换此条之后的对话</span><button type="button" disabled={saving} onClick={cancel}>取消</button></div></SmoothCollapse>
    {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
  </div>;
}
