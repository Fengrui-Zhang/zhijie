'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useInteractionTransition } from './InteractionMotion';

interface Props {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  email: string | null | undefined;
  name: string | null | undefined;
  quota: number | null;
  isAdmin: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenChangePassword: () => void;
  onOpenDeleteAccount: () => void;
}

export default function UserMenuPopup(props: Props) {
  const { open, anchorRef, onClose } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ top: 60, right: 12, width: 320, height: 440, triggerWidth: 96, triggerHeight: 36, maxHeight: 560 });
  const [hovered, setHovered] = useState<string | null>(null);
  const preference = useInteractionTransition(.2);
  const enabled = preference.duration > 0;
  const transition = enabled ? { type: 'spring' as const, damping: 34, stiffness: 380, mass: .8 } : { duration: 0 };
  const indicatorTransition = enabled ? { type: 'spring' as const, damping: 30, stiffness: 520, mass: .8 } : { duration: 0 };
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    if (containerRef.current) containerRef.current.inert = !open;
    if (!open) return;
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.top;
      const maxHeight = Math.max(80, window.innerHeight - top - 12);
      setBounds({ top, right: Math.max(12, window.innerWidth - rect.right), width: Math.min(320, window.innerWidth - 24), height: Math.min(contentRef.current?.scrollHeight || 440, maxHeight), triggerWidth: rect.width, triggerHeight: rect.height, maxHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    if (contentRef.current) observer.observe(contentRef.current);
    if (anchorRef.current) observer.observe(anchorRef.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    setHovered(null);
    const frame = requestAnimationFrame(() => containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }));
    const outside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node) && !anchorRef.current?.contains(event.target as Node)) closeRef.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); anchorRef.current?.focus({ preventScroll: true }); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open, anchorRef]);

  const close = () => { onClose(); anchorRef.current?.focus({ preventScroll: true }); };
  const items = [
    ...(props.isAdmin ? [{ id: 'admin', label: '管理系统', action: props.onOpenAdmin, danger: true }] : []),
    { id: 'password', label: '修改密码', action: props.onOpenChangePassword, danger: false },
    { id: 'logout', label: '退出账号', action: props.onLogout, danger: false },
    { id: 'delete', label: '注销账号', action: props.onOpenDeleteAccount, danger: true },
  ];
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open ? <motion.div
        id="account-dropdown"
        ref={containerRef}
        role="dialog"
        aria-labelledby="user-menu-title"
        className="account-dropdown fixed z-40 overflow-hidden rounded-[20px] border border-white/70 bg-[#fbfaf7] text-stone-700 shadow-[0_18px_50px_rgba(28,25,23,0.18)]"
        style={{ top: bounds.top, right: bounds.right, transformOrigin: 'top right' }}
        initial={{ width: bounds.triggerWidth, height: bounds.triggerHeight, opacity: 0, borderRadius: 12 }}
        animate={{ width: bounds.width, height: bounds.height, opacity: 1, borderRadius: 20 }}
        exit={{ width: bounds.triggerWidth, height: bounds.triggerHeight, opacity: 0, borderRadius: 12 }}
        transition={transition}
        onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== anchorRef.current) onClose(); }}
        onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
          event.preventDefault(); buttons[next]?.focus();
        }}
      >
        <div className="glass-scrollbar overflow-y-auto overscroll-contain" style={{ width: bounds.width, maxHeight: bounds.maxHeight }}>
          <motion.div ref={contentRef} className="p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: enabled ? .12 : 0 } }} transition={{ duration: enabled ? .2 : 0, delay: enabled ? .08 : 0 }}>
            <div className="flex items-center justify-between gap-3">
              <h3 id="user-menu-title" className="min-w-0 break-words text-sm font-bold text-stone-800">{props.name || '用户'}</h3>
              <button type="button" onClick={close} className="glass-chip shrink-0 rounded-full px-3 py-1.5 text-sm text-stone-500 hover:bg-white/70 hover:text-stone-700">关闭</button>
            </div>
            <div className="my-4 space-y-2 text-sm text-stone-600">
              <div className="break-words"><span className="text-stone-400">邮箱</span><span className="ml-2">{props.email || '—'}</span></div>
              <div><span className="text-stone-400">额度</span><span className="ml-2">{props.quota !== null ? props.quota : '—'}</span></div>
            </div>
            <LayoutGroup id="account-actions">
              <div className="space-y-1 border-t border-stone-200/70 pt-2" onPointerLeave={() => setHovered(null)}>
                {items.map((item, index) => <motion.button key={item.id} type="button"
                  initial={{ opacity: 0, x: enabled ? 8 : 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: enabled ? 8 : 0, transition: { duration: enabled ? .12 : 0 } }}
                  transition={{ duration: enabled ? (item.id === 'logout' ? .12 : .15) : 0, delay: enabled ? .06 + index * .02 : 0, ease: [.23, 1, .32, 1] }}
                  onClick={() => { close(); item.action(); }}
                  onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(item.id); }}
                  onFocus={() => setHovered(item.id)}
                  className={`relative flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-left text-sm ${item.danger ? 'text-red-600' : 'text-stone-600'}`}>
                  {hovered === item.id ? <>
                    <motion.span aria-hidden="true" layoutId="activeIndicator" className={`pointer-events-none absolute inset-0 rounded-xl ${item.danger ? 'bg-red-50' : 'bg-stone-100'}`} transition={indicatorTransition} />
                    <motion.span aria-hidden="true" layoutId="leftBar" className={`pointer-events-none absolute left-0 h-5 w-[3px] rounded-full ${item.danger ? 'bg-red-500' : 'bg-stone-700'}`} transition={indicatorTransition} />
                  </> : null}
                  <span className="relative">{item.label}</span>
                </motion.button>)}
              </div>
            </LayoutGroup>
          </motion.div>
        </div>
      </motion.div> : null}
    </AnimatePresence>, document.body
  );
}
