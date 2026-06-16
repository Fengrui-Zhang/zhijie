import { NextResponse } from 'next/server';
import { auth } from '../../../lib/auth';
import {
  resolveChatModel,
} from '../../../lib/analysis-models';
import { prisma } from '../../../lib/prisma';
import { formatKnowledgeContext, retrieveKnowledge } from '../../../utils/knowledge';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type KnowledgeRequest = {
  enabled?: boolean;
  board?: string;
  query?: string;
  topK?: number;
};

const extractErrorMessage = (input: unknown): string => {
  if (!input) return '';
  if (typeof input === 'string') {
    try {
      return extractErrorMessage(JSON.parse(input));
    } catch {
      return input.trim();
    }
  }
  if (typeof input === 'object') {
    const record = input as Record<string, unknown>;
    if (typeof record.error === 'string') {
      const nested = extractErrorMessage(record.error);
      return nested || record.error;
    }
    if (record.error && typeof record.error === 'object') {
      const nestedError = record.error as Record<string, unknown>;
      if (typeof nestedError.message === 'string' && nestedError.message.trim()) {
        return nestedError.message.trim();
      }
      return extractErrorMessage(nestedError);
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim();
    }
  }
  return '';
};

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { quota: true } });
    if (user && user.quota <= 0) {
      return NextResponse.json({ error: '您的提问额度已用完' }, { status: 403 });
    }
  }

  const body = await request.json();
  const messages = body.messages as ChatMessage[] | undefined;
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
  const stream = body.stream === true;
  const knowledge = body.knowledge as KnowledgeRequest | undefined;
  const requestedModel = resolveChatModel(body.model);

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: 'Messages are required.' },
      { status: 400 }
    );
  }

  let finalMessages = messages;
  let knowledgeFailed = '';
  if (knowledge?.enabled) {
    const board = knowledge.board || 'bazi';
    const query =
      knowledge.query || messages[messages.length - 1]?.content || '';

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Knowledge retrieval requires a non-empty query.' },
        { status: 400 }
      );
    }

    try {
      const chunks = await retrieveKnowledge(board, query, knowledge.topK, false);
      const context = formatKnowledgeContext(chunks);
      if (context) {
        if (messages[0]?.role === 'system') {
          finalMessages = [
            {
              role: 'system',
              content: `${messages[0].content}\n\n${context}`,
            },
            ...messages.slice(1),
          ];
        } else {
          const knowledgeMessage: ChatMessage = {
            role: 'system',
            content: context,
          };
          finalMessages = [knowledgeMessage, ...messages];
        }
      }
    } catch (error) {
      knowledgeFailed = error instanceof Error ? error.message : '知识库检索失败';
      console.warn('[chat] Knowledge retrieval failed, proceeding without context:', knowledgeFailed);
    }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'DEEPSEEK_API_KEY is missing.' },
      { status: 500 }
    );
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const apiUrl = `${baseUrl}/chat/completions`;
  const requestBody: Record<string, unknown> = {
    model: requestedModel,
    messages: finalMessages,
    temperature,
    stream,
  };

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const message = error instanceof Error && error.message
      ? `模型服务连接失败：${error.message}`
      : '模型服务连接失败，请稍后重试';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!response.ok) {
    const errorText = await response.text();
    const providerMessage = extractErrorMessage(errorText);
    return NextResponse.json(
      { error: providerMessage || '模型服务请求失败，请稍后重试' },
      { status: response.status }
    );
  }

  if (userId) {
    await prisma.user.update({ where: { id: userId }, data: { quota: { decrement: 1 } } });
  }

  if (stream) {
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
    };
    if (knowledgeFailed) {
      headers['X-Knowledge-Failed'] = encodeURIComponent(knowledgeFailed);
    }
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  const json: { content: string; knowledgeFailed?: string } = { content };
  if (knowledgeFailed) json.knowledgeFailed = knowledgeFailed;
  return NextResponse.json(json);
}
