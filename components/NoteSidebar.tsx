'use client';

import React from 'react';

export const NoteIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M4.75 2A1.75 1.75 0 0 0 3 3.75v12.5C3 17.216 3.784 18 4.75 18h10.5A1.75 1.75 0 0 0 17 16.25v-8.94a1.75 1.75 0 0 0-.513-1.237l-2.56-2.56A1.75 1.75 0 0 0 12.69 3H4.75Zm3 4.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5H8.5a.75.75 0 0 1-.75-.75Zm0 3.5A.75.75 0 0 1 8.5 9h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Zm0 3.5a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Z" />
  </svg>
);

type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

interface NoteSidebarProps {
  content: string;
  onChange: (value: string) => void;
  saveState: SaveState;
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
}

export default function NoteSidebar({
  content,
  onChange,
  collapsed,
  onToggle,
  mobile = false,
}: NoteSidebarProps) {
  if (collapsed) {
    return (
      <div className="h-12 w-12 rounded-2xl border border-white/70 bg-white/62 backdrop-blur-xl shadow-[0_18px_50px_rgba(28,25,23,0.16)]">
        <button
          onClick={onToggle}
          className="flex h-full w-full items-center justify-center rounded-2xl hover:bg-white/75 text-stone-600 transition-colors"
          title="展开笔记"
        >
          <NoteIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 flex-shrink-0 flex-col overflow-hidden border border-white/70 bg-white/58 backdrop-blur-xl shadow-[0_24px_60px_rgba(28,25,23,0.14)] ${
        mobile ? 'h-full w-full rounded-none border-y-0 border-r-0' : 'h-[calc(100vh-112px)] w-72 rounded-[28px]'
      }`}
    >
      <div className="flex items-center justify-between border-b border-stone-200/70 bg-gradient-to-l from-white/70 to-stone-50/40 px-4 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-stone-400">Notes</div>
          <span className="text-sm font-semibold text-stone-700">笔记</span>
        </div>
        <button
          onClick={onToggle}
          className="rounded-xl p-2 text-stone-500 transition-colors hover:bg-white/80"
          title={mobile ? '关闭笔记' : '收起笔记'}
        >
          {mobile ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M4.47 4.47a.75.75 0 011.06 0L10 8.94l4.47-4.47a.75.75 0 111.06 1.06L11.06 10l4.47 4.47a.75.75 0 11-1.06 1.06L10 11.06l-4.47 4.47a.75.75 0 11-1.06-1.06L8.94 10 4.47 5.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.21 5.23a.75.75 0 011.06-.02l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.04-1.08L11.168 10 7.23 6.29a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 p-3">
        <div className="glass-panel-soft h-full rounded-[24px] border border-white/60 p-3 shadow-inner">
          <textarea
            value={content}
            onChange={(event) => onChange(event.target.value)}
            placeholder="在这里记录思路、灵感、待办，内容会自动保存到云端。"
            className="glass-scrollbar h-full w-full resize-none rounded-[18px] border border-white/55 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.22),rgba(255,255,255,0.18)),repeating-linear-gradient(to_bottom,transparent_0,transparent_30px,rgba(214,211,209,0.28)_30px,rgba(214,211,209,0.28)_31px)] px-3 py-3 text-sm leading-8 text-stone-700 outline-none placeholder:text-stone-400"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
