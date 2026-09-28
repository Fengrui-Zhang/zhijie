'use client';

import React, { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion, useIsPresent } from 'motion/react';

const KeyboardContext = createContext(false);
const ease = [0.22, 1, 0.36, 1] as const;

export function InteractionMotionProvider({ children }: { children: React.ReactNode }) {
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const update = (value: boolean) => {
      setKeyboard(value);
      document.documentElement.dataset.inputMode = value ? 'keyboard' : 'pointer';
    };
    const onKey = (event: KeyboardEvent) => { if (!event.metaKey && !event.ctrlKey && !event.altKey) update(true); };
    const onPointer = () => update(false);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);
  return <KeyboardContext.Provider value={keyboard}><MotionConfig reducedMotion="user">{children}</MotionConfig></KeyboardContext.Provider>;
}

export function useInteractionTransition(duration = 0.2) {
  const reduced = useReducedMotion();
  const keyboard = useContext(KeyboardContext);
  return { duration: reduced || keyboard ? 0 : duration, ease };
}

export function SelectionGroup({ children }: { children: React.ReactNode }) {
  const id = useId();
  return <LayoutGroup id={id}>{children}</LayoutGroup>;
}

export function SelectionHighlight({ active, className }: { active: boolean; className: string }) {
  const transition = useInteractionTransition();
  return active ? <motion.span aria-hidden="true" layoutId="selected" initial={false} transition={transition} className={`interaction-selection ${className}`} /> : null;
}

export function SmoothCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return <AnimatePresence initial={false}>{open ? <CollapseContent key="content">{children}</CollapseContent> : null}</AnimatePresence>;
}

function CollapseContent({ children }: { children: React.ReactNode }) {
  const transition = useInteractionTransition();
  const present = useIsPresent();
  return <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition} className="interaction-collapse" inert={!present} aria-hidden={!present || undefined}>{children}</motion.div>;
}

export function TransitionText({ children, value }: { children: React.ReactNode; value: string }) {
  const transition = useInteractionTransition(0.16);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();
  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <motion.span className="inline-flex max-w-full align-middle" initial={false} animate={{ width: width ?? 'auto' }} transition={transition}>
    <span ref={measureRef} className="inline-flex shrink-0 items-center whitespace-nowrap">
      <motion.span key={value} initial={transition.duration ? { opacity: 0, y: 2 } : false} animate={{ opacity: 1, y: 0 }} transition={transition} className="inline-flex items-center justify-center gap-2">{children}</motion.span>
    </span>
  </motion.span>;
}
