'use client';

import React, { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useInteractionTransition } from '../InteractionMotion';

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'>;
type Option = { value: string; label: string; disabled: boolean };
type Bounds = { left: number; top: number; width: number; maxHeight: number; owner?: string };
const textOf = (node: React.ReactNode): string => Children.toArray(node).map((child) => isValidElement<{ children?: React.ReactNode }>(child) ? textOf(child.props.children) : String(child)).join('');
function readOptions(children: React.ReactNode, disabled = false): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: React.ReactNode; value?: string | number; disabled?: boolean; label?: string }>(child)) return [];
    if (child.type === 'option') return [{ value: String(child.props.value ?? textOf(child.props.children)), label: child.props.label ?? textOf(child.props.children), disabled: disabled || Boolean(child.props.disabled) }];
    return readOptions(child.props.children, disabled || Boolean(child.props.disabled));
  });
}

export default function FilterSelect({ children, value, defaultValue, onChange, className = '', id, disabled, ...props }: Props) {
  const uniqueId = useId();
  const listId = `${uniqueId}-list`;
  const options = useMemo(() => readOptions(children), [children]);
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? options[0]?.value ?? ''));
  const selectedValue = String(value ?? internalValue);
  const selected = options.find((option) => option.value === selectedValue) ?? options[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [label, setLabel] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const selectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typing = useRef({ text: '', at: 0 });
  const enabled = useInteractionTransition().duration > 0;
  const spring = enabled ? { type: 'spring' as const, duration: .85, bounce: .35 } : { duration: 0 };
  const close = () => { setOpen(false); setPendingValue(null); if (selectionTimer.current) clearTimeout(selectionTimer.current); };
  useEffect(() => () => { if (selectionTimer.current) clearTimeout(selectionTimer.current); }, []);
  useEffect(() => { if (disabled) close(); }, [disabled]);
  useLayoutEffect(() => {
    const button = trigger.current;
    if (!button) return;
    const labels = Array.from(button.labels ?? []);
    const wrapping = button.closest('label');
    if (wrapping && !labels.includes(wrapping)) labels.push(wrapping);
    const names = labels.map((element) => { const clone = element.cloneNode(true) as HTMLElement; clone.querySelectorAll('.filter-select').forEach((node) => node.remove()); return clone.textContent?.trim(); }).filter(Boolean);
    const previous = button.parentElement?.previousElementSibling;
    setLabel(names.join(' ') || (previous?.tagName === 'LABEL' ? previous.textContent?.trim() : '') || selected?.label || '选择');
  }, [selected?.label]);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const button = trigger.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 288), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 20, above = rect.top - 20;
      const desired = Math.min(320, options.length * 44 + 12);
      const opensAbove = below < desired && above > below;
      const maxHeight = Math.max(44, Math.min(320, opensAbove ? above : below));
      const height = Math.min(desired, maxHeight);
      setBounds({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: opensAbove ? rect.top - height - 8 : rect.bottom + 8, width, maxHeight,
        owner: button.closest('[data-prompt-context]')?.getAttribute('data-prompt-context') ?? undefined });
    };
    position();
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) close(); };
    const scroll = (event: Event) => { if (!popup.current?.contains(event.target as Node)) position(); };
    const observer = new ResizeObserver(position); if (trigger.current) observer.observe(trigger.current);
    window.addEventListener('resize', position); window.addEventListener('scroll', scroll, true); document.addEventListener('pointerdown', outside);
    return () => { observer.disconnect(); window.removeEventListener('resize', position); window.removeEventListener('scroll', scroll, true); document.removeEventListener('pointerdown', outside); };
  }, [open, options.length]);
  useLayoutEffect(() => {
    if (!open) return;
    const row = document.getElementById(`${listId}-${active}`);
    if (row && popup.current) {
      const list = popup.current.querySelector<HTMLElement>('[role="listbox"]');
      if (list) { const top = row.offsetTop, bottom = top + row.offsetHeight; if (top < list.scrollTop) list.scrollTop = top; else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight; }
    }
  }, [active, open, bounds?.maxHeight]);
  const show = (last = false) => {
    if (disabled || !options.some((option) => !option.disabled)) return;
    const index = options.findIndex((option) => option.value === selectedValue && !option.disabled);
    setActive(index >= 0 ? index : last ? options.length - 1 - [...options].reverse().findIndex((option) => !option.disabled) : options.findIndex((option) => !option.disabled));
    setOpen(true);
  };
  const select = (index: number) => {
    const option = options[index];
    if (!option || option.disabled || pendingValue !== null) return;
    setActive(index); setPendingValue(option.value);
    selectionTimer.current = setTimeout(() => {
      const element = native.current;
      setInternalValue(option.value); setOpen(false); setPendingValue(null);
      if (element && option.value !== selectedValue) {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(element, option.value);
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, enabled ? 150 : 0);
  };
  const keyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const { key } = event;
    if (key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (key === 'Tab') { close(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      if (!open) { show(key === 'ArrowUp' || key === 'End'); return; }
      const direction = key === 'ArrowUp' || key === 'End' ? -1 : 1;
      let next = key === 'Home' ? -1 : key === 'End' ? options.length : active;
      for (let count = 0; count < options.length; count++) { next = (next + direction + options.length) % options.length; if (!options[next].disabled) { setActive(next); break; } }
      return;
    }
    if ((key === 'Enter' || key === ' ') && open) { event.preventDefault(); select(active); return; }
    if (key.length === 1 && key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.nativeEvent.isComposing) {
      const now = Date.now(); typing.current = { text: now - typing.current.at < 600 ? typing.current.text + key : key, at: now };
      const next = options.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(typing.current.text.toLowerCase()));
      if (next >= 0) { event.preventDefault(); setOpen(true); setActive(next); }
    }
  };
  return <span className={`filter-select ${/(^|\s)w-full(\s|$)/.test(className) ? 'filter-select-full' : ''}`}>
    <button ref={trigger} id={id} type="button" role="combobox" disabled={disabled} aria-label={props['aria-label'] ?? label}
      aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} aria-invalid={props['aria-invalid']} aria-required={props.required}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open ? `${listId}-${active}` : undefined}
      className={`filter-select-trigger ${className.replace(/\bglass-select\b/g, '')}`} onClick={() => open ? close() : show()} onKeyDown={keyDown}
      onBlur={(event) => { if (!popup.current?.contains(event.relatedTarget as Node)) close(); }}>
      <motion.span aria-hidden="true" layoutId={`${uniqueId}-wrapper`} className="filter-select-surface" transition={spring} />
      <span className="filter-select-label">{selected?.label}</span>
      <motion.span aria-hidden="true" className="filter-select-indicator" animate={{ x: open && enabled ? -20 : 0 }} transition={enabled ? { type: 'spring', bounce: .3, duration: 1.5 } : { duration: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
      </motion.span>
    </button>
    <select {...props} ref={native} value={value ?? internalValue} disabled={disabled} onChange={onChange} hidden aria-hidden="true" tabIndex={-1}>{children}</select>
    {bounds && createPortal(<div ref={popup} inert={!open} aria-hidden={!open || undefined} data-filter-select-popup="" data-prompt-owner={bounds.owner} className="filter-select-anchor" style={{ left: bounds.left, top: bounds.top, width: bounds.width, pointerEvents: open ? 'auto' : 'none' }}>
      <AnimatePresence>{open && <motion.div layoutId={`${uniqueId}-wrapper`} role="listbox" id={listId} aria-label={props['aria-label'] ?? label}
        className="filter-select-list" style={{ maxHeight: bounds.maxHeight, borderRadius: 20 }} transition={spring} exit={{ opacity: 0, transition: { duration: enabled ? .15 : 0 } }}>
        {options.map((option, index) => <motion.div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={(pendingValue ?? selectedValue) === option.value} aria-disabled={option.disabled || undefined}
          data-active={active === index} className="filter-select-option" onPointerMove={() => { if (!option.disabled && pendingValue === null) setActive(index); }}
          onPointerDown={(event) => event.preventDefault()} onClick={(event) => { event.stopPropagation(); select(index); }}
          initial={enabled ? { opacity: 0, y: 40 } : false} animate={{ opacity: 1, y: 0 }}
          transition={enabled ? { type: 'spring', bounce: .1, duration: .25, delay: (Math.min(index, 8) + 8) * .025, ease: [.215, .61, .355, 1] } : { duration: 0 }}>
          <span className="filter-select-option-label">{option.label}</span><span aria-hidden="true" className="filter-select-tick">{(pendingValue ?? selectedValue) === option.value && <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 10 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span>
        </motion.div>)}
      </motion.div>}</AnimatePresence>
    </div>, document.body)}
  </span>;
}
