'use client';

import { useEffect, useState } from 'react';

export function useDelayedBusy(active: boolean, delayMs = 2_000) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return;
    }

    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return active && elapsed;
}
