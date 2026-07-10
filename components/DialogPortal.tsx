'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useDialogFocus } from '../hooks/useDialogFocus';

type DialogPortalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  ariaLabel?: string;
  mobileFill?: boolean;
  closeOnBackdrop?: boolean;
  layerClassName?: string;
  panelClassName?: string;
};

export default function DialogPortal({
  open,
  onClose,
  children,
  labelledBy,
  ariaLabel,
  mobileFill = false,
  closeOnBackdrop = true,
  layerClassName = 'z-50',
  panelClassName = '',
}: DialogPortalProps) {
  useBodyScrollLock(open);
  const dialogRef = useDialogFocus<HTMLDivElement>(open, onClose);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-dialog-root="true"
      className={`${layerClassName} fixed inset-0 flex overflow-hidden bg-black/35 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm md:items-center md:justify-center md:p-4`}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        tabIndex={-1}
        className={`glass-panel flex min-h-0 w-full flex-col overflow-hidden rounded-[26px] border border-white/60 shadow-[0_30px_90px_rgba(0,0,0,0.24)] md:rounded-[30px] ${
          mobileFill ? 'h-full max-h-full md:h-auto md:max-h-[calc(100dvh-2rem)]' : 'max-h-full md:max-h-[calc(100dvh-2rem)]'
        } ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function DialogBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      data-dialog-scroll="true"
      className={`glass-scrollbar min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] ${className}`}
    >
      {children}
    </div>
  );
}
