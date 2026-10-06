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
    <button type="button" role="switch" aria-label="永久保存" aria-checked={enabled} aria-busy={pending} disabled={pending}
      title={`开启后不再自动清理；关闭后从关闭日期起重新保留 ${SESSION_RETENTION_DAYS} 天`}
      onClick={() => void toggle()}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${enabled ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-stone-200 bg-white/90 text-stone-600'}`}>
      <span>永久保存</span>
      <span aria-hidden="true" className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${enabled ? 'bg-stone-700' : 'bg-stone-200'}`}>
        <span className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full transition-transform motion-reduce:transition-none ${enabled ? 'translate-x-3 bg-amber-100' : 'bg-white'}`} />
      </span>
    </button>
    {error && <div role="alert" className="mt-1 text-xs text-red-600">{error}</div>}
  </div>;
}
