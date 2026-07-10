import React from 'react';

export function RecordsWorkspace({ children }: { children: React.ReactNode }) {
  return <section className="glass-panel rounded-2xl p-5 md:p-7">{children}</section>;
}

export function ChatWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <section className="glass-panel flex h-[calc(100vh-128px)] min-h-[620px] flex-col overflow-hidden rounded-[32px]">
      {children}
    </section>
  );
}
