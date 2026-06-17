'use client';

import { useEffect } from 'react';

let lockCount = 0;
let lockedScrollY = 0;
let previousHtmlOverflow = '';
let previousBodyOverflow = '';
let previousBodyPosition = '';
let previousBodyTop = '';
let previousBodyLeft = '';
let previousBodyRight = '';
let previousBodyWidth = '';

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof window === 'undefined') return;

    if (lockCount === 0) {
      lockedScrollY = window.scrollY || window.pageYOffset || 0;
      previousHtmlOverflow = document.documentElement.style.overflow;
      previousBodyOverflow = document.body.style.overflow;
      previousBodyPosition = document.body.style.position;
      previousBodyTop = document.body.style.top;
      previousBodyLeft = document.body.style.left;
      previousBodyRight = document.body.style.right;
      previousBodyWidth = document.body.style.width;

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }

    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount > 0) return;

      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, lockedScrollY);
    };
  }, [locked]);
}
