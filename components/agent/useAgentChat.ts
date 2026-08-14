'use client';

import { useCallback, useState } from 'react';

export type AgentToolCard = {
  id: string;
  toolName: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  summary: string;
  detail?: string;
};

export type AgentTurnUsage = {
  aiCalls: number;
  pointsUsed: number;
  remainingQuota: number;
};

export type AgentTurnResult = AgentTurnUsage & {
  content: string;
  sessionId: string;
  turnId: string;
  tools: AgentToolCard[];
};

type RunInput = {
  sessionId?: string | null;
  message: string;
  selectedCaseIds: string[];
  selectedSessionIds: string[];
  knowledgeEnabled: boolean;
  personalizationPrompt?: string;
};

type AgentWireEvent = Record<string, unknown> & { type: string };

export function useAgentChat() {
  const [tools, setTools] = useState<AgentToolCard[]>([]);
  const [usage, setUsage] = useState<AgentTurnUsage | null>(null);
  const [statusText, setStatusText] = useState('');

  const reset = useCallback(() => {
    setTools([]);
    setUsage(null);
    setStatusText('');
  }, []);

  const runTurn = useCallback(async (input: RunInput): Promise<AgentTurnResult> => {
    setTools([]);
    setUsage(null);
    setStatusText('正在理解你的问题...');
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(typeof payload.error === 'string' ? payload.error : 'Agent 请求失败') as Error & { code?: string };
      error.code = typeof payload.code === 'string' ? payload.code : undefined;
      throw error;
    }
    if (!response.body) throw new Error('Agent 响应流不可用');

    const localTools = new Map<string, AgentToolCard>();
    let final: AgentTurnResult | null = null;
    let failed = '';
    const applyEvent = (event: AgentWireEvent) => {
      if (event.type === 'ai_call_started') {
        setStatusText(`AI 正在进行第 ${Number(event.call) || 1} 次分析...`);
      } else if (event.type === 'tool_started') {
        const card: AgentToolCard = {
          id: String(event.runId),
          toolName: String(event.toolName),
          label: String(event.label || event.toolName),
          status: 'running',
          summary: String(event.inputSummary || '正在调用工具'),
        };
        localTools.set(card.id, card);
        setTools(Array.from(localTools.values()));
        setStatusText(`正在使用${card.label}...`);
      } else if (event.type === 'tool_completed' || event.type === 'tool_failed') {
        const id = String(event.runId);
        const previous = localTools.get(id);
        const card: AgentToolCard = {
          id,
          toolName: String(event.toolName),
          label: String(event.label || previous?.label || event.toolName),
          status: event.type === 'tool_completed' ? 'completed' : 'failed',
          summary: String(event.type === 'tool_completed' ? event.summary : event.error),
          detail: typeof event.detail === 'string' ? event.detail : undefined,
        };
        localTools.set(id, card);
        setTools(Array.from(localTools.values()));
      } else if (event.type === 'clarification_required') {
        setStatusText('需要补充信息');
      } else if (event.type === 'assistant_final') {
        const nextUsage = {
          aiCalls: Number(event.aiCalls) || 0,
          pointsUsed: Number(event.pointsUsed) || 0,
          remainingQuota: Number(event.remainingQuota) || 0,
        };
        setUsage(nextUsage);
        setStatusText('');
        final = {
          ...nextUsage,
          content: String(event.content || ''),
          sessionId: String(event.sessionId || ''),
          turnId: String(event.turnId || ''),
          tools: Array.from(localTools.values()),
        };
      } else if (event.type === 'turn_failed') {
        failed = String(event.error || 'Agent 执行失败');
      }
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';
      for (const chunk of chunks) {
        const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'));
        if (!dataLine) continue;
        try {
          applyEvent(JSON.parse(dataLine.replace(/^data:\s*/, '')) as AgentWireEvent);
        } catch {
          // Ignore a malformed event and continue reading the turn.
        }
      }
    }
    if (failed) throw new Error(failed);
    if (!final) throw new Error('Agent 未返回最终回复');
    return final;
  }, []);

  return { tools, usage, statusText, runTurn, reset };
}
