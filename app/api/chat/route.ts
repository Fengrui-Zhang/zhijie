import { NextResponse } from 'next/server';
import { auth } from '../../../lib/auth';
import {
  resolveChatModel,
} from '../../../lib/analysis-models';
import { prisma } from '../../../lib/prisma';
import { VISUAL_RESPONSE_INSTRUCTION } from '../../../lib/chat-prompt-copy';
import { CHAT_TIMEOUT_MESSAGE, friendlyChatError, isTimeoutLike } from '../../../lib/chat-errors';
import { formatKnowledgeContext, retrieveKnowledge, type RetrievedChunk } from '../../../utils/knowledge';

export const runtime = 'nodejs';
export const maxDuration = 180;

const DEFAULT_TIMEOUT_MS = 150_000;
const MIN_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 160_000;
const DEFAULT_MAX_TOKENS = 8_192;
const MIN_MAX_TOKENS = 512;
const MAX_MAX_TOKENS = 8_192;

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

type KnowledgeSourceSummary = {
  id: string;
  title: string;
  source: string;
  score: number;
  preview: string;
};

const summarizeKnowledgeSources = (chunks: RetrievedChunk[]): KnowledgeSourceSummary[] =>
  chunks.slice(0, 6).map((chunk, index) => {
    const title = chunk.title || chunk.source || `参考资料 ${index + 1}`;
    return {
      id: chunk.id || chunk.docId || `${chunk.source}-${index}`,
      title,
      source: chunk.source,
      score: Number(chunk.score.toFixed(4)),
      preview: chunk.text.replace(/\s+/g, ' ').trim().slice(0, 140),
    };
  });

const encodeHeaderJson = (value: unknown) => encodeURIComponent(JSON.stringify(value));

const clampInteger = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
};

async function reserveChatPoint(userId: string) {
  const updated = await prisma.user.updateMany({
    where: { id: userId, quota: { gt: 0 } },
    data: { quota: { decrement: 1 } },
  });
  return updated.count === 1;
}

async function refundChatPoint(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { quota: { increment: 1 } } });
}

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
  const requestStartedAt = Date.now();
  const session = await auth();
  const userId = session?.user?.id;

  const body = await request.json();
  const messages = body.messages as ChatMessage[] | undefined;
  const temperature = typeof body.temperature === 'number' && Number.isFinite(body.temperature)
    ? Math.max(0, Math.min(2, body.temperature))
    : 0.7;
  const stream = body.stream === true;
  const knowledge = body.knowledge as KnowledgeRequest | undefined;
  const requestedModel = resolveChatModel(body.model);
  const timeoutMs = clampInteger(body.timeoutMs, DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const maxTokens = clampInteger(body.maxTokens, DEFAULT_MAX_TOKENS, MIN_MAX_TOKENS, MAX_MAX_TOKENS);
  const thinking = body.thinking === 'disabled' ? 'disabled' : 'enabled';
  const responseFormat = body.responseFormat === 'json_object' ? 'json_object' : 'text';
  const visualResponse = body.visualResponse !== false;

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { error: 'Messages are required.' },
      { status: 400 }
    );
  }

  let finalMessages = messages;
  let knowledgeFailed = '';
  let knowledgeSources: KnowledgeSourceSummary[] = [];

  if (!visualResponse) {
    finalMessages = messages;
  } else if (messages[0]?.role === 'system') {
    finalMessages = [
      {
        role: 'system',
        content: `${messages[0].content}\n\n${VISUAL_RESPONSE_INSTRUCTION}`,
      },
      ...messages.slice(1),
    ];
  } else {
    finalMessages = [{ role: 'system', content: VISUAL_RESPONSE_INSTRUCTION }, ...messages];
  }

  if (knowledge?.enabled) {
    const board = knowledge.board || 'bazi';
    const query =
      knowledge.query || finalMessages[finalMessages.length - 1]?.content || '';

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Knowledge retrieval requires a non-empty query.' },
        { status: 400 }
      );
    }

    try {
      const chunks = await retrieveKnowledge(board, query, knowledge.topK, false);
      knowledgeSources = summarizeKnowledgeSources(chunks);
      const context = formatKnowledgeContext(chunks);
      if (context) {
        if (finalMessages[0]?.role === 'system') {
          finalMessages = [
            {
              role: 'system',
              content: `${finalMessages[0].content}\n\n${context}`,
            },
            ...finalMessages.slice(1),
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
    max_tokens: maxTokens,
    thinking: { type: thinking },
    response_format: { type: responseFormat },
  };

  let pointReserved = false;
  if (userId) {
    pointReserved = await reserveChatPoint(userId);
    if (!pointReserved) {
      return NextResponse.json({ error: '您的提问额度已用完' }, { status: 403 });
    }
  }

  let refunded = false;
  const refundOnce = async () => {
    if (!userId || !pointReserved || refunded) return;
    refunded = true;
    await refundChatPoint(userId);
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
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    await refundOnce();
    const message = isTimeoutLike(error)
      ? CHAT_TIMEOUT_MESSAGE
      : friendlyChatError(error, '模型服务连接失败，请稍后重试');
    return NextResponse.json({ error: message }, { status: isTimeoutLike(error) ? 504 : 502 });
  }

  console.info('[chat] provider_headers', {
    model: requestedModel,
    stream,
    inputChars: finalMessages.reduce((total, message) => total + message.content.length, 0),
    maxTokens,
    thinking,
    responseFormat,
    visualResponse,
    timeoutMs,
    ttfbMs: Date.now() - requestStartedAt,
  });

  if (!response.ok) {
    const errorText = await response.text();
    await refundOnce();
    const providerMessage = extractErrorMessage(errorText);
    return NextResponse.json(
      { error: providerMessage || '模型服务请求失败，请稍后重试' },
      { status: response.status }
    );
  }

  if (stream) {
    if (!response.body) {
      await refundOnce();
      return NextResponse.json({ error: '模型响应流不可用，本次请求不会扣除点数。' }, { status: 502 });
    }
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    };
    if (knowledgeFailed) {
      headers['X-Knowledge-Failed'] = encodeURIComponent(knowledgeFailed);
    }
    if (knowledgeSources.length > 0) {
      headers['X-Knowledge-Sources'] = encodeHeaderJson(knowledgeSources);
    }
    const upstreamReader = response.body.getReader();
    const encoder = new TextEncoder();
    let streamedBytes = 0;
    let streamCompleted = false;
    const bodyStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { value, done } = await upstreamReader.read();
          if (done) {
            streamCompleted = true;
            console.info('[chat] stream_completed', {
              model: requestedModel,
              streamedBytes,
              durationMs: Date.now() - requestStartedAt,
            });
            controller.close();
            return;
          }
          streamedBytes += value.byteLength;
          controller.enqueue(value);
        } catch (error) {
          await refundOnce();
          const message = isTimeoutLike(error)
            ? CHAT_TIMEOUT_MESSAGE
            : friendlyChatError(error, 'AI 输出流中断，本次请求不会扣除点数，请稍后重试。');
          console.warn('[chat] stream_failed', {
            model: requestedModel,
            streamedBytes,
            durationMs: Date.now() - requestStartedAt,
            timeout: isTimeoutLike(error),
          });
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`));
          controller.close();
        }
      },
      async cancel() {
        await upstreamReader.cancel().catch(() => undefined);
        if (!streamCompleted) await refundOnce();
      },
    });
    return new Response(bodyStream, {
      status: response.status,
      headers,
    });
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    await refundOnce();
    return NextResponse.json({ error: friendlyChatError(error, '模型返回格式无效，本次请求不会扣除点数。') }, { status: 502 });
  }
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) {
    await refundOnce();
    return NextResponse.json({ error: '模型未返回有效内容，本次请求不会扣除点数。' }, { status: 502 });
  }

  const json: { content: string; knowledgeFailed?: string; knowledgeSources?: KnowledgeSourceSummary[] } = { content };
  if (knowledgeFailed) json.knowledgeFailed = knowledgeFailed;
  if (knowledgeSources.length > 0) json.knowledgeSources = knowledgeSources;
  return NextResponse.json(json);
}
