import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { acquireAgentLock, releaseAgentLock } from '../../../../lib/agent/quota';
import { runAgentTurn } from '../../../../lib/agent/runner';
import type { AgentEvent } from '../../../../lib/agent/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

type AgentRequest = {
  sessionId?: string;
  message?: string;
  selectedCaseIds?: string[];
  selectedSessionIds?: string[];
  knowledgeEnabled?: boolean;
  personalizationPrompt?: string;
};

const safeIds = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, 4)
  : [];

const encodeEvent = (event: AgentEvent) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

export async function POST(request: Request) {
  if (process.env.AGENT_CHAT_ENABLED?.toLowerCase() === 'false') {
    return NextResponse.json({ error: 'Agent 模式已关闭', code: 'AGENT_DISABLED' }, { status: 404 });
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: '请先登录后再使用 Agent 问答', code: 'LOGIN_REQUIRED' }, { status: 401 });

  let body: AgentRequest;
  try {
    body = await request.json() as AgentRequest;
  } catch {
    return NextResponse.json({ error: '请求格式无效' }, { status: 400 });
  }
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4_000) : '';
  if (!message) return NextResponse.json({ error: '请输入问题' }, { status: 400 });

  let chatSession;
  if (body.sessionId) {
    chatSession = await prisma.divinationSession.findFirst({ where: { id: body.sessionId, userId } });
    if (!chatSession || chatSession.modelType !== 'chat') {
      return NextResponse.json({ error: '问智解会话不存在或无权访问' }, { status: 404 });
    }
  } else {
    chatSession = await prisma.divinationSession.create({
      data: {
        userId,
        modelType: 'chat',
        title: `问智解 - ${message.slice(0, 20)}`,
        chartParams: {
          type: 'agent_chat',
          sourceCaseIds: safeIds(body.selectedCaseIds),
          sourceSessionIds: safeIds(body.selectedSessionIds),
          knowledgeEnabled: body.knowledgeEnabled !== false,
        } as Prisma.InputJsonValue,
        chartData: { agentVersion: 1 } as Prisma.InputJsonValue,
      },
    });
  }
  const turn = await prisma.agentTurn.create({ data: { userId, sessionId: chatSession.id } });
  const locked = await acquireAgentLock(userId, turn.id);
  if (!locked) {
    await prisma.agentTurn.update({ where: { id: turn.id }, data: { status: 'failed', errorCode: 'TURN_IN_PROGRESS', completedAt: new Date() } });
    return NextResponse.json({ error: '上一轮 Agent 仍在运行，请等待完成后再发送', code: 'TURN_IN_PROGRESS' }, { status: 409 });
  }
  await prisma.chatMessage.create({
    data: {
      sessionId: chatSession.id,
      agentTurnId: turn.id,
      role: 'user',
      content: message,
      metadata: { selectedCaseIds: safeIds(body.selectedCaseIds), selectedSessionIds: safeIds(body.selectedSessionIds) } as Prisma.InputJsonValue,
    },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: AgentEvent) => controller.enqueue(encoder.encode(encodeEvent(event)));
      emit({ type: 'turn_started', turnId: turn.id, sessionId: chatSession.id });
      void runAgentTurn({
        userId,
        sessionId: chatSession.id,
        turnId: turn.id,
        message,
        selectedCaseIds: safeIds(body.selectedCaseIds),
        selectedSessionIds: safeIds(body.selectedSessionIds),
        knowledgeEnabled: body.knowledgeEnabled !== false,
        personalizationPrompt: typeof body.personalizationPrompt === 'string' ? body.personalizationPrompt.slice(0, 2_000) : undefined,
        emit,
      }).then((result) => {
        emit({
          type: 'assistant_final',
          content: result.content,
          aiCalls: result.aiCalls,
          pointsUsed: result.pointsUsed,
          remainingQuota: result.remainingQuota,
          sessionId: chatSession.id,
          turnId: turn.id,
        });
      }).catch(async (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Agent 执行失败';
        const existing = await prisma.agentTurn.findUnique({ where: { id: turn.id }, select: { aiCallCount: true, pointsUsed: true } });
        await prisma.agentTurn.update({
          where: { id: turn.id },
          data: { status: 'failed', errorCode: error instanceof Error ? error.name : 'AGENT_FAILED', completedAt: new Date() },
        }).catch(() => undefined);
        emit({ type: 'turn_failed', error: errorMessage, code: error instanceof Error ? error.name : 'AGENT_FAILED', aiCalls: existing?.aiCallCount || 0, pointsUsed: existing?.pointsUsed || 0 });
      }).finally(async () => {
        await releaseAgentLock(userId, turn.id).catch(() => undefined);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
