'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const dialogStack: symbol[] = [];

export function useDialogFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const dialogRef = useRef<T>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const dialogToken = Symbol('dialog');
    dialogStack.push(dialogToken);

    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
    const initialTarget = focusables()[0] || dialog;
    window.requestAnimationFrame(() => initialTarget.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== dialogToken) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const stackIndex = dialogStack.lastIndexOf(dialogToken);
      if (stackIndex !== -1) dialogStack.splice(stackIndex, 1);
      previouslyFocused?.focus();
    };
  }, [open]);

  return dialogRef;
}
