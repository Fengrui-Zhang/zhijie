import { NextResponse } from 'next/server';
import { auth } from '../../../lib/auth';
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
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'DeepSeek API key is missing.' },
      { status: 500 }
    );
  }

  const messages = body.messages as ChatMessage[] | undefined;
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
  const stream = body.stream === true;
  const knowledge = body.knowledge as KnowledgeRequest | undefined;
  const requestedModel = body.model === 'deepseek-chat' ? 'deepseek-chat' : 'deepseek-reasoner';

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

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: requestedModel,
      messages: finalMessages,
      temperature,
      stream,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText }, { status: response.status });
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
