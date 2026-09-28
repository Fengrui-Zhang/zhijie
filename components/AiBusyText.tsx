'use client';

import { ThinkingOrb } from 'thinking-orbs';
import { useDelayedBusy } from './useDelayedBusy';

type OrbState = 'working' | 'searching' | 'solving' | 'composing' | 'breathing';

type Props = {
  active: boolean;
  children: React.ReactNode;
  state?: OrbState;
  theme?: 'dark' | 'light';
};

export default function AiBusyText({ active, children, state = 'working', theme = 'dark' }: Props) {
  const showOrb = useDelayedBusy(active);

  return (
    <span className="inline-flex items-center justify-center gap-2">
      {active && (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
          {showOrb && <ThinkingOrb state={state} size={20} theme={theme} />}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
}
