'use client';

import { useState } from 'react';
import type { AgentToolCard, AgentTurnUsage } from './useAgentChat';

export function AgentToolCards({ tools, usage }: { tools: AgentToolCard[]; usage?: AgentTurnUsage | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expectedPoints = usage ? Math.ceil(usage.aiCalls * 0.5) : 0;
  const usesCurrentPricing = usage ? usage.pointsUsed === expectedPoints : false;
  if (tools.length === 0 && !usage) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-stone-100 pt-3">
      {tools.map((tool) => (
        <button
          type="button"
          key={tool.id}
          onClick={() => setExpandedId((current) => current === tool.id ? null : tool.id)}
          className="block w-full rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-2 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            <span className={`h-2 w-2 rounded-full ${tool.status === 'completed' ? 'bg-emerald-500' : tool.status === 'failed' ? 'bg-red-400' : 'animate-pulse bg-amber-400'}`} />
            {tool.status === 'running' ? `正在使用${tool.label}` : tool.status === 'completed' ? `${tool.label}已完成` : `${tool.label}调用失败`}
          </span>
          {expandedId === tool.id ? (
            <span className="mt-2 block whitespace-pre-wrap text-xs leading-5 text-stone-500">{tool.detail || tool.summary}</span>
          ) : null}
        </button>
      ))}
      {usage ? (
        <div className="px-1 text-[11px] text-stone-400">
          本轮 AI 调用 {usage.aiCalls} 次，{usesCurrentPricing ? '按 0.5 点/次计费并向上取整' : '按当时计费规则'}，消耗 {usage.pointsUsed} 点 · 剩余 {usage.remainingQuota} 点
        </div>
      ) : null}
    </div>
  );
}
