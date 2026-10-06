'use client';

import React, { useRef, useState } from 'react';
import { SESSION_RETENTION_DAYS } from '../../lib/session-retention';

export default function SessionRetentionButton({ enabled, onChange }: {
  enabled: boolean;
  onChange: (enabled: boolean) => Promise<void>;
}) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const toggle = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    try { await onChange(!enabled); }
    catch { setError('保存失败，请重试'); }
    finally { inFlight.current = false; setPending(false); }
  };

  return <div className="shrink-0" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  }}>
    <button type="button" role="menuitemcheckbox" aria-label="留存" aria-checked={enabled} aria-busy={pending} aria-disabled={pending}
      title={`开启后不再自动清理；关闭后从关闭日期起重新保留 ${SESSION_RETENTION_DAYS} 天`}
      onClick={() => void toggle()}
      className={`session-retain-button relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors aria-disabled:cursor-wait aria-disabled:opacity-60 ${enabled ? 'bg-amber-100 text-amber-900' : 'text-stone-600'}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] shrink-0" fill={enabled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z" /></svg>
      <span>留存</span>
    </button>
    {error && <div role="alert" className="mt-1 text-xs text-red-600">{error}</div>}
  </div>;
}
