'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import MarkdownContent from '../MarkdownContent';
import { useInteractionTransition } from '../InteractionMotion';

type Props = { value: string; disabled?: boolean; onSave: (value: string) => Promise<void | boolean>; };
export default function InlinePromptEdit({ value, disabled, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const submitting = useRef(false);
  const transition = useInteractionTransition(.2);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);
  const cancel = () => { if (!saving) { setDraft(value); setEditing(false); setError(''); } };
  const save = async () => {
    if (!draft.trim() || disabled || submitting.current) return;
    submitting.current = true; setSaving(true); setError('');
    try { if (await onSave(draft.trim()) !== false) setEditing(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '重新生成失败，请重试'); }
    finally { submitting.current = false; setSaving(false); }
  };
  return <motion.div layout="size" transition={transition} className={`inline-prompt-edit ${editing ? 'is-editing' : ''}`}>
    {editing ? <textarea ref={input} aria-label="修改已发送的问题" value={draft} disabled={saving || disabled} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); cancel(); }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void save(); }
    }} className="inline-prompt-field" rows={Math.min(7, Math.max(2, draft.split('\n').length))} /> : <div className="min-w-0 flex-1"><MarkdownContent content={value} /></div>}
    <div className="inline-prompt-actions">
      {editing && <button type="button" disabled={saving} onClick={cancel}>取消</button>}
      <AnimatePresence mode="wait" initial={false}><motion.button key={editing ? 'save' : 'edit'} type="button" disabled={disabled || saving || (editing && !draft.trim())}
        aria-label={editing ? '保存并重新生成' : '修改问题'} title={editing ? '将从这条问题重新生成后续对话' : '修改已发送的问题并重新生成'}
        initial={{ x: transition.duration ? 16 : 0, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: transition.duration ? 16 : 0, opacity: 0 }} transition={transition}
        onClick={() => { if (editing) void save(); else { setDraft(value); setEditing(true); } }}>
        {editing ? saving ? '生成中…' : '✓ 重新生成' : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5" /></svg>}
      </motion.button></AnimatePresence>
    </div>
    {editing && <span className="basis-full text-xs opacity-65">重新生成会替换此条之后的对话</span>}
    {error && <span role="alert" className="basis-full text-xs text-red-300">{error}</span>}
  </motion.div>;
}
