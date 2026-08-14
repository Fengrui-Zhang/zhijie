import { Prisma } from '@prisma/client';
import { DEEPSEEK_PRO_MODEL } from '../analysis-models';
import { prisma } from '../prisma';
import { calculateAgentPoints, MAX_AGENT_AI_CALLS, shouldReserveAgentPoint } from './billing';
import { appendAgentDisclaimer } from './system-prompt';
import { getAgentQuota, refreshAgentLock, refundAgentPoint, reserveAgentPoint } from './quota';
import { buildAgentTools, getAgentToolLabel, toDeepSeekTools } from './tools';
import { calculateAgentCallBudget } from './time-budget';
import { detectMultipleDivinationQuestions, hasPositiveNumbersForQuestions } from './time-rules';
import {
  AgentInputError,
  AgentQuotaError,
  type AgentEvent,
  type AgentToolContext,
  type AgentToolDefinition,
} from './types';
import { buildAgentSystemPrompt } from './system-prompt';

type ProviderMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ProviderToolCall[];
};

type ProviderToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type ProviderResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      role?: 'assistant';
      content?: string | null;
      tool_calls?: ProviderToolCall[];
    };
  }>;
};

type RunAgentTurnInput = {
  userId: string;
  sessionId: string;
  turnId: string;
  message: string;
  selectedCaseIds: string[];
  selectedSessionIds: string[];
  knowledgeEnabled: boolean;
  personalizationPrompt?: string;
  emit: (event: AgentEvent) => void;
};

type CallState = { aiCalls: number; pointsUsed: number };

const MAX_HISTORY_MESSAGES = 24;
const MAX_CONTEXT_TEXT = 18_000;
const AGENT_MAX_OUTPUT_TOKENS = 4_096;

const toJsonValue = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

function extractProviderError(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } | string; message?: string };
    if (typeof parsed.error === 'string') return parsed.error;
    if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) return parsed.error.message;
    return parsed.message || raw;
  } catch {
    return raw;
  }
}

async function callDeepSeek(
  userId: string,
  turnId: string,
  messages: ProviderMessage[],
  tools: ReturnType<typeof toDeepSeekTools> | undefined,
  state: CallState,
  emit: (event: AgentEvent) => void,
  timeoutMs: number,
  finalCall: boolean,
) {
  if (state.aiCalls >= MAX_AGENT_AI_CALLS) throw new Error('AI_CALL_LIMIT');
  const call = state.aiCalls + 1;
  const pointReserved = shouldReserveAgentPoint(call);
  if (pointReserved) await reserveAgentPoint(userId);
  emit({ type: 'ai_call_started', call });
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    if (pointReserved) await refundAgentPoint(userId);
    throw new Error('DEEPSEEK_API_KEY is missing.');
  }
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEEPSEEK_PRO_MODEL,
        messages,
        temperature: 0.35,
        max_tokens: AGENT_MAX_OUTPUT_TOKENS,
        thinking: { type: 'disabled' },
        ...(tools?.length ? { tools, tool_choice: 'auto' } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (pointReserved) await refundAgentPoint(userId);
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError' || /timeout/i.test(error.message));
    throw new Error(timeout
      ? `${finalCall ? '最终综合分析' : 'Agent 分析'}超时，本次未完成的 AI 调用不会扣除点数，请稍后重试。`
      : error instanceof Error ? `模型服务连接失败：${error.message}` : '模型服务连接失败');
  }
  if (!response.ok) {
    const raw = await response.text();
    if (pointReserved) await refundAgentPoint(userId);
    throw new Error(extractProviderError(raw) || '模型服务请求失败');
  }
  const payload = await response.json() as ProviderResponse;
  const message = payload.choices?.[0]?.message;
  if (!message || (typeof message.content !== 'string' && !Array.isArray(message.tool_calls))) {
    if (pointReserved) await refundAgentPoint(userId);
    throw new Error('模型返回格式无效，本次调用未扣点。');
  }
  state.aiCalls += 1;
  state.pointsUsed = calculateAgentPoints(state.aiCalls);
  await prisma.agentTurn.update({
    where: { id: turnId },
    data: { aiCallCount: state.aiCalls, pointsUsed: state.pointsUsed },
  });
  await refreshAgentLock(userId, turnId);
  emit({ type: 'ai_call_completed', call, pointsUsed: state.pointsUsed });
  return message;
}

async function buildSelectedContext(userId: string, caseIds: string[], sessionIds: string[]) {
  const [cases, sessions] = await Promise.all([
    caseIds.length
      ? prisma.divinationCase.findMany({ where: { userId, id: { in: caseIds.slice(0, 4) } } })
      : Promise.resolve([]),
    sessionIds.length
      ? prisma.divinationSession.findMany({
          where: { userId, id: { in: sessionIds.slice(0, 4) } },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 16 } },
        })
      : Promise.resolve([]),
  ]);
  const blocks = [
    ...cases.map((item) => `【用户手动引用命例｜${item.title}｜${item.modelType}｜ID ${item.id}】\n${JSON.stringify(item.chartData)}`),
    ...sessions.map((item) => `【用户手动引用会话｜${item.title}｜ID ${item.id}】\n${item.messages.map((message) => `${message.role}：${message.content}`).join('\n')}`),
  ];
  return blocks.join('\n\n').slice(0, MAX_CONTEXT_TEXT);
}

async function executeToolCall(
  call: ProviderToolCall,
  toolMap: Map<string, AgentToolDefinition>,
  context: AgentToolContext,
  emit: (event: AgentEvent) => void,
) {
  const tool = toolMap.get(call.function.name);
  const label = getAgentToolLabel(call.function.name);
  let args: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(call.function.arguments || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('参数不是对象');
    args = parsed as Record<string, unknown>;
  } catch {
    args = { _invalidArguments: call.function.arguments };
  }
  const run = await prisma.agentToolRun.create({
    data: {
      userId: context.userId,
      sessionId: context.sessionId,
      turnId: context.turnId,
      toolCallId: call.id,
      toolName: call.function.name,
      input: args as Prisma.InputJsonValue,
    },
  });
  emit({
    type: 'tool_started',
    runId: run.id,
    toolCallId: call.id,
    toolName: call.function.name,
    label,
    inputSummary: typeof args.question === 'string' ? args.question.slice(0, 100) : label,
  });
  try {
    if (!tool) throw new AgentInputError('模型请求了未注册工具', 'UNKNOWN_TOOL');
    if ('_invalidArguments' in args) throw new AgentInputError('工具参数不是有效 JSON');
    const result = await tool.execute(args, context);
    await prisma.agentToolRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        resultSummary: result.summary.slice(0, 1_000),
        resultText: result.content.slice(0, 20_000),
        rawResult: result.raw === undefined ? undefined : toJsonValue(result.raw),
        matterKey: result.matterKey,
        divinationMode: result.divinationMode,
        timeBucketKey: result.timeBucketKey,
        completedAt: new Date(),
      },
    });
    emit({ type: 'tool_completed', runId: run.id, toolCallId: call.id, toolName: call.function.name, label, summary: result.summary, detail: result.detail });
    return { toolCallId: call.id, content: result.content, failed: false as const };
  } catch (error) {
    const code = error instanceof AgentInputError ? error.code : 'TOOL_FAILED';
    const message = error instanceof Error ? error.message : '工具执行失败';
    await prisma.agentToolRun.update({ where: { id: run.id }, data: { status: 'failed', errorCode: code, resultSummary: message.slice(0, 1_000), completedAt: new Date() } });
    emit({ type: 'tool_failed', runId: run.id, toolCallId: call.id, toolName: call.function.name, label, error: message });
    if (error instanceof AgentInputError && ['CLARIFICATION_REQUIRED', 'NUMBER_REQUIRED'].includes(error.code)) {
      emit({ type: 'clarification_required', message, fields: error.fields });
    }
    return { toolCallId: call.id, content: JSON.stringify({ error: message, code }), failed: true as const };
  }
}

async function persistFinal(
  input: RunAgentTurnInput,
  content: string,
  state: CallState,
  status: 'completed' | 'clarification' = 'completed',
) {
  const remainingQuota = await getAgentQuota(input.userId);
  const toolRuns = await prisma.agentToolRun.findMany({
    where: { turnId: input.turnId },
    orderBy: { startedAt: 'asc' },
    select: { id: true, toolName: true, status: true, resultSummary: true, errorCode: true, divinationMode: true, timeBucketKey: true, startedAt: true, completedAt: true },
  });
  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        sessionId: input.sessionId,
        agentTurnId: input.turnId,
        role: 'model',
        content,
        metadata: {
          aiCalls: state.aiCalls,
          pointsUsed: state.pointsUsed,
          remainingQuota,
          toolRuns: toolRuns.map((run) => ({
            ...run,
            startedAt: run.startedAt.toISOString(),
            completedAt: run.completedAt?.toISOString() || null,
          })),
        } as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.agentTurn.update({
      where: { id: input.turnId },
      data: { status, aiCallCount: state.aiCalls, pointsUsed: state.pointsUsed, completedAt: new Date() },
    }),
    prisma.divinationSession.update({ where: { id: input.sessionId }, data: { updatedAt: new Date() } }),
  ]);
}

export async function runAgentTurn(input: RunAgentTurnInput) {
  const state: CallState = { aiCalls: 0, pointsUsed: 0 };
  const turnStartedAt = Date.now();
  const multipleQuestions = detectMultipleDivinationQuestions(input.message);
  if (multipleQuestions.length >= 2 && !hasPositiveNumbersForQuestions(input.message, multipleQuestions.length)) {
    const content = [
      '你这条消息里包含了多个不同的占问事项。时间起卦讲究一事一问，同一时刻连续问多件事会降低参考价值。',
      '',
      '请按下面顺序为每个问题分别报一个正整数，我会改用梅花易数报数起卦：',
      ...multipleQuestions.map((question, index) => `${index + 1}. ${question}`),
      '',
      '回复示例：1：28；2：63。',
    ].join('\n');
    input.emit({ type: 'clarification_required', message: content, fields: multipleQuestions.map((_, index) => `number_${index + 1}`) });
    await persistFinal(input, content, state, 'clarification');
    return { content, ...state, remainingQuota: await getAgentQuota(input.userId) };
  }

  const [history, selectedContext] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { sessionId: input.sessionId, agentTurnId: { not: input.turnId } },
      orderBy: { createdAt: 'desc' },
      take: MAX_HISTORY_MESSAGES,
    }),
    buildSelectedContext(input.userId, input.selectedCaseIds, input.selectedSessionIds),
  ]);
  const toolDefinitions = buildAgentTools({ knowledgeEnabled: input.knowledgeEnabled });
  const toolMap = new Map(toolDefinitions.map((tool) => [tool.name, tool]));
  const providerTools = toDeepSeekTools(toolDefinitions);
  const messages: ProviderMessage[] = [
    { role: 'system', content: buildAgentSystemPrompt({ selectedContext, personalizationPrompt: input.personalizationPrompt }) },
    ...history.reverse().map((message): ProviderMessage => ({ role: message.role === 'model' || message.role === 'assistant' ? 'assistant' : 'user', content: message.content })),
    { role: 'user', content: input.message },
  ];
  const toolContext: AgentToolContext = {
    userId: input.userId,
    sessionId: input.sessionId,
    turnId: input.turnId,
    userMessage: input.message,
    knowledgeEnabled: input.knowledgeEnabled,
    now: new Date(),
  };

  let finalContent = '';
  for (let iteration = 0; iteration < MAX_AGENT_AI_CALLS; iteration += 1) {
    const budget = calculateAgentCallBudget(iteration, Date.now() - turnStartedAt, MAX_AGENT_AI_CALLS);
    const isForcedFinalCall = budget.forcedFinal;
    if (budget.exhausted) {
      finalContent = '本轮工具资料已经保留，但 AI 综合分析达到时间上限。请在本会话中回复“继续分析”，系统会复用已有资料继续作答。';
      break;
    }
    let assistant;
    try {
      assistant = await callDeepSeek(
        input.userId,
        input.turnId,
        messages,
        isForcedFinalCall ? undefined : providerTools,
        state,
        input.emit,
        budget.timeoutMs,
        isForcedFinalCall,
      );
    } catch (error) {
      if (error instanceof AgentQuotaError && state.aiCalls > 0) {
        finalContent = '本轮已完成部分资料查询，但剩余额度不足以继续调用 AI 进行综合分析。请补充额度后继续本次会话。';
        break;
      }
      throw error;
    }
    const toolCalls = isForcedFinalCall ? [] : (Array.isArray(assistant.tool_calls) ? assistant.tool_calls.slice(0, 3) : []);
    if (toolCalls.length === 0) {
      finalContent = String(assistant.content || '').trim() || (isForcedFinalCall
        ? '已达到本轮最多 6 次 AI 调用。我已停止继续调用工具，请基于已完成的工具结果继续提问。'
        : '暂时无法形成有效回复，请稍后重试。');
      break;
    }
    messages.push({ role: 'assistant', content: assistant.content ?? null, tool_calls: toolCalls });
    const results = await Promise.all(toolCalls.map((call) => executeToolCall(call, toolMap, toolContext, input.emit)));
    await refreshAgentLock(input.userId, input.turnId);
    for (const result of results) {
      messages.push({ role: 'tool', tool_call_id: result.toolCallId, content: result.content });
    }
  }
  if (!finalContent) finalContent = '已达到本轮最多 6 次 AI 调用。我已停止继续调用工具，请基于上方已完成的工具结果继续提问。';
  finalContent = appendAgentDisclaimer(finalContent);
  await persistFinal(input, finalContent, state);
  const remainingQuota = await getAgentQuota(input.userId);
  return { content: finalContent, ...state, remainingQuota };
}
