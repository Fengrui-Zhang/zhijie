'use client';

import React, { forwardRef, useCallback, useRef } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useInteractionTransition } from '../InteractionMotion';

export function useTransitionElementRef<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const bind = useCallback((element: T | null) => {
    if (!element) return;
    ref.current = element;
    return () => {
      if (ref.current === element) ref.current = null;
    };
  }, []);
  return [ref, bind] as const;
}

export function BentoSelection({ active }: { active: boolean }) {
  const animated = useInteractionTransition().duration > 0;
  const transition = animated ? { type: 'spring' as const, bounce: .2, duration: .6 } : { duration: 0 };
  if (!active) return null;
  return <>
    <motion.span aria-hidden="true" layoutId="bento-background" initial={false} className="bento-selection" transition={transition} />
    <motion.span aria-hidden="true" layoutId="bento-sidebar-pill" initial={false} className="bento-selection-mark" transition={transition} />
  </>;
}

const BentoPane = forwardRef<HTMLDivElement, { children: React.ReactNode; pageKey: string }>(function BentoPane({ children, pageKey }, ref) {
  const present = useIsPresent();
  const animated = useInteractionTransition().duration > 0;
  return <motion.div ref={ref} data-bento-page={pageKey} className="bento-switch-pane" inert={!present} aria-hidden={!present || undefined}
    initial={animated ? { opacity: 0, y: 8, filter: 'blur(4px)' } : false}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none', transform: 'none' } }}
    exit={{ opacity: 0, y: animated ? -8 : 0, filter: animated ? 'blur(4px)' : 'none' }}
    transition={{ duration: animated ? .3 : 0, ease: [.23, 1, .32, 1] }}>
    {children}
  </motion.div>;
});

export function BentoContentSwitch({ activeKey, children }: { activeKey: string; children: React.ReactNode }) {
  return <div className="bento-switch-stage">
    <AnimatePresence mode="popLayout" initial={false}>
      <BentoPane key={activeKey} pageKey={activeKey}>{children}</BentoPane>
    </AnimatePresence>
  </div>;
}
