'use client';

import React from 'react';
import { motion } from 'motion/react';
import { SelectionGroup, useInteractionTransition } from '../InteractionMotion';

type Props = {
  value: number;
  onChange: (value: number) => void;
  labels?: readonly [string, string];
  className?: string;
  compact?: boolean;
};

export default function GenderSwitch({ value, onChange, labels = ['男', '女'], className = 'gap-2', compact = false }: Props) {
  const animated = useInteractionTransition().duration > 0;
  const spring = animated ? { type: 'spring' as const, bounce: 0.28, duration: 0.45 } : { duration: 0 };

  return <SelectionGroup><div role="group" aria-label="性别" className={`gender-switch grid grid-cols-2 ${className}`}>
    {labels.map((label, index) => <motion.button
      key={index}
      type="button"
      aria-pressed={value === index}
      data-motion={animated ? 'on' : 'off'}
      onClick={() => onChange(index)}
      whileTap={animated ? { scale: 0.96 } : undefined}
      transition={animated ? { type: 'spring', bounce: 0.3, duration: 0.3 } : { duration: 0 }}
      className={`gender-switch-option interaction-choice min-w-0 rounded-2xl border py-2.5 ${compact ? 'px-3 text-sm font-semibold' : ''} ${value === index ? 'border-transparent text-amber-200' : 'glass-chip text-stone-600'}`}
    >
      {value === index && <motion.span aria-hidden="true" layoutId="gender-selection" initial={false} transition={spring} className="interaction-selection glass-panel-dark" />}
      <span className="interaction-choice-label">{label}</span>
    </motion.button>)}
  </div></SelectionGroup>;
}
