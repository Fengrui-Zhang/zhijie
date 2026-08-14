'use client';

import type { FormEvent, KeyboardEvent } from 'react';
import MarkdownContent from '../MarkdownContent';
import { ChatWorkspace } from '../WorkspacePanels';
import { AgentToolCards } from './AgentToolCards';
import type { AgentToolCard, AgentTurnUsage } from './useAgentChat';

export type AgentChatCaseOption = { id: string; title: string; modelLabel: string };
export type AgentChatSessionOption = { id: string; title: string; modelLabel: string };
export type AgentChatMessage = {
  id: string;
  role: 'user' | 'model';
  content: string;
  agentMeta?: { tools?: AgentToolCard[]; usage?: AgentTurnUsage };
};

type Props = {
  messages: AgentChatMessage[];
  input: string;
  loading: boolean;
  error: string;
  statusText: string;
  liveTools: AgentToolCard[];
  liveUsage: AgentTurnUsage | null;
  contextOpen: boolean;
  knowledgeEnabled: boolean;
  selectedCases: AgentChatCaseOption[];
  availableCases: AgentChatCaseOption[];
  selectedSessions: AgentChatSessionOption[];
  availableSessions: AgentChatSessionOption[];
  caseSelectValue: string;
  sessionSelectValue: string;
  copied: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event?: FormEvent) => void;
  onNewChat: () => void;
  onToggleContext: () => void;
  onToggleKnowledge: () => void;
  onSelectCase: (id: string) => void;
  onRemoveCase: (id: string) => void;
  onSelectSession: (id: string) => void;
  onRemoveSession: (id: string) => void;
  onCopyPrompt: () => void;
};

const STARTER_PROMPTS = [
  '这次工作调动是否有利？请自动选择合适的方法分析。',
  '分析命例库里的张三，看看他的事业格局。',
  '我准备下个月搬家，请帮我选择合适日期。',
  '我想问工作和感情两件事，应该怎样分别报数？',
];

export default function AgentChatWorkspace(props: Props) {
  const contextCount = props.selectedCases.length + props.selectedSessions.length;
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      props.onSubmit();
    }
  };
  return (
    <ChatWorkspace>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-6 py-4 md:px-8">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-2xl font-bold text-stone-800">问智解</div>
            <div className="mt-0.5 text-xs text-stone-400">AI 自动选择并调用合适的命理与占卜工具</div>
          </div>
          <button type="button" onClick={props.onNewChat} className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white/70 text-lg font-semibold text-stone-600 transition hover:bg-white" aria-label="新建问答">+</button>
        </div>
        <button type="button" onClick={props.onToggleContext} aria-expanded={props.contextOpen} className="rounded-2xl border border-stone-200 bg-white/70 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-white">
          添加上下文{contextCount ? ` · ${contextCount}` : ''}
        </button>
      </div>

      {props.contextOpen ? (
        <div className="grid gap-4 border-b border-stone-100 bg-white/45 px-6 py-4 md:grid-cols-3 md:px-8">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-stone-500">引用命例</span>
            <select value={props.caseSelectValue} onChange={(event) => props.onSelectCase(event.target.value)} disabled={!props.availableCases.length} className="w-full rounded-2xl border border-stone-200 bg-white/80 px-3 py-2.5 text-sm font-semibold text-stone-600 outline-none disabled:opacity-45">
              <option value="">{props.availableCases.length ? '引用命例' : '暂无命例'}</option>
              {props.availableCases.map((item) => <option key={item.id} value={item.id}>{item.modelLabel} · {item.title}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-stone-500">引用历史会话</span>
            <select value={props.sessionSelectValue} onChange={(event) => props.onSelectSession(event.target.value)} disabled={!props.availableSessions.length} className="w-full rounded-2xl border border-stone-200 bg-white/80 px-3 py-2.5 text-sm font-semibold text-stone-600 outline-none disabled:opacity-45">
              <option value="">{props.availableSessions.length ? '引用会话' : '暂无会话'}</option>
              {props.availableSessions.map((item) => <option key={item.id} value={item.id}>{item.modelLabel} · {item.title}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-bold text-stone-500">参考资料</span>
            <button type="button" role="switch" aria-checked={props.knowledgeEnabled} onClick={props.onToggleKnowledge} className={`w-full rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${props.knowledgeEnabled ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-stone-200 bg-white/70 text-stone-500'}`}>
              {props.knowledgeEnabled ? '允许 Agent 检索知识库' : '不使用知识库'}
            </button>
          </div>
        </div>
      ) : null}

      {contextCount ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100/80 bg-white/42 px-6 py-3 md:px-8">
          <span className="text-xs font-semibold text-stone-400">已引用</span>
          {props.selectedCases.map((item) => <span key={item.id} className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-stone-700"><span className="text-amber-700">{item.modelLabel}</span>{item.title}<button type="button" onClick={() => props.onRemoveCase(item.id)} aria-label={`移除${item.title}`}>×</button></span>)}
          {props.selectedSessions.map((item) => <span key={item.id} className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1.5 text-xs font-semibold text-stone-700"><span className="text-sky-700">会话</span>{item.title}<button type="button" onClick={() => props.onRemoveSession(item.id)} aria-label={`移除${item.title}`}>×</button></span>)}
        </div>
      ) : null}

      <div className="glass-chat-bg glass-scrollbar flex-1 overflow-y-auto px-4 py-5 md:px-8">
        {props.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-xl font-bold text-stone-700">告诉我你想了解什么</div>
            <div className="mt-2 max-w-xl text-sm leading-6 text-stone-500">我会判断是否需要排盘、选择适合的方法，并在信息不足时请你补充。</div>
            <div className="mt-7 grid w-full max-w-3xl gap-2 md:grid-cols-2">
              {STARTER_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => props.onInputChange(prompt)} className="rounded-2xl border border-white/65 bg-white/58 px-4 py-3 text-left text-sm text-stone-600 transition hover:bg-white/85 hover:text-stone-900">{prompt}</button>)}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5">
            {props.messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'model' ? <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-xs font-bold text-stone-500">解</div> : null}
                <div className={`max-w-[86%] rounded-[22px] px-4 py-3 text-sm leading-7 shadow-sm ${message.role === 'user' ? 'rounded-tr-md bg-stone-900 text-white' : 'rounded-tl-md border border-white/65 bg-white/72 text-stone-800'}`}>
                  <MarkdownContent content={message.content} />
                  {message.role === 'model' && message.agentMeta ? <AgentToolCards tools={message.agentMeta.tools || []} usage={message.agentMeta.usage} /> : null}
                </div>
                {message.role === 'user' ? <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-xs font-bold text-amber-200">我</div> : null}
              </div>
            ))}
            {props.loading ? (
              <div className="rounded-[22px] border border-white/65 bg-white/72 px-4 py-3">
                <div className="text-xs font-semibold text-stone-500">{props.statusText || 'Agent 正在工作...'}</div>
                <AgentToolCards tools={props.liveTools} usage={props.liveUsage} />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {props.error ? <div className="border-t border-red-100 bg-red-50/70 px-4 py-2 text-xs text-red-600">{props.error}</div> : null}
      <form onSubmit={(event) => props.onSubmit(event)} className="border-t border-white/60 bg-white/60 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] backdrop-blur-xl xl:pb-4">
        <div className="mx-auto flex max-w-4xl items-end gap-3 rounded-[26px] border border-white/70 bg-white/72 p-2 shadow-sm">
          <textarea value={props.input} onChange={(event) => props.onInputChange(event.target.value)} onKeyDown={handleKeyDown} placeholder="输入问题，Agent 会自动选择所需工具..." rows={1} className="max-h-36 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 text-stone-800 outline-none placeholder:text-stone-400" />
          <button type="button" disabled={props.loading} onClick={props.onCopyPrompt} className="hidden shrink-0 rounded-2xl border border-stone-200 bg-white/70 px-3 py-3 text-xs font-semibold text-stone-500 transition hover:bg-white disabled:opacity-45 sm:inline-flex">{props.copied ? '已复制' : '复制AI提示词'}</button>
          <button type="submit" disabled={!props.input.trim() || props.loading} className="glass-cta h-12 rounded-2xl px-5 text-sm font-semibold text-amber-300 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">{props.loading ? '执行中' : '发送'}</button>
        </div>
      </form>
    </ChatWorkspace>
  );
}
