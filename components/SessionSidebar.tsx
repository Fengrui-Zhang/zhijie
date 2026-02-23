'use client';

import React, { useState } from 'react';

const MODEL_LABELS: Record<string, string> = {
  qimen: '奇门遁甲',
  bazi: '四柱八字',
  ziwei: '紫微斗数',
  meihua: '梅花易数',
  liuyao: '六爻纳甲',
};

const MODEL_ICONS: Record<string, string> = {
  qimen: '☰',
  bazi: '命',
  ziwei: '紫',
  meihua: '梅',
  liuyao: '爻',
};

export interface SessionItem {
  id: string;
  modelType: string;
  title: string;
  createdAt: string;
}

interface SessionSidebarProps {
  sessions: SessionItem[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewSession: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

function groupByDate(sessions: SessionItem[]) {
  const groups: Record<string, SessionItem[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  for (const s of sessions) {
    const d = new Date(s.createdAt);
    let label: string;
    if (d >= today) {
      label = '今天';
    } else if (d >= yesterday) {
      label = '昨天';
    } else if (d >= weekAgo) {
      label = '近7天';
    } else {
      label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  }
  return groups;
}

export default function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onNewSession,
  collapsed,
  onToggle,
}: SessionSidebarProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0 bg-stone-50/80 border-r border-stone-200 flex flex-col items-center pt-3">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
          title="展开侧边栏"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  }

  const groups = groupByDate(sessions);

  return (
    <div className="w-64 flex-shrink-0 bg-stone-50/80 border-r border-stone-200 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-stone-200 flex items-center justify-between">
        <span className="text-sm font-medium text-stone-600">历史记录</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewSession}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
            title="新建排盘"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
            title="收起侧边栏"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {sessions.length === 0 && (
          <p className="text-xs text-stone-400 text-center py-8">
            暂无历史记录
          </p>
        )}

        {Object.entries(groups).map(([label, items]) => (
          <div key={label}>
            <div className="text-xs text-stone-400 px-2 py-1 font-medium">{label}</div>
            <div className="space-y-0.5">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                    activeSessionId === item.id
                      ? 'bg-amber-100/80 text-amber-900'
                      : 'hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  <span className="text-base flex-shrink-0 w-6 text-center opacity-70">
                    {MODEL_ICONS[item.modelType] || '卦'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm leading-snug">{item.title}</div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {MODEL_LABELS[item.modelType] || item.modelType}
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (confirmDelete === item.id) {
                        onDelete(item.id);
                        setConfirmDelete(null);
                      } else {
                        setConfirmDelete(item.id);
                        setTimeout(() => setConfirmDelete(null), 3000);
                      }
                    }}
                    className={`flex-shrink-0 p-1 rounded transition-colors ${
                      confirmDelete === item.id
                        ? 'text-red-500 bg-red-50'
                        : 'text-stone-300 hover:text-red-400 opacity-0 group-hover:opacity-100'
                    }`}
                    title={confirmDelete === item.id ? '再次点击确认删除' : '删除'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.31l.461 6.15A1.5 1.5 0 005.02 13h5.96a1.5 1.5 0 001.499-1.35l.46-6.15h.311a.75.75 0 000-1.5H11v-.75A1.75 1.75 0 009.25 1.5h-2.5A1.75 1.75 0 005 3.25zm1.5 0a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V4h-3v-.75z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
