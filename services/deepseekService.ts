import { ChatModel } from '../lib/analysis-models';
import { formatPromptCopyMessages, type PromptCopyMessage } from '../lib/chat-prompt-copy';
import { friendlyChatError } from '../lib/chat-errors';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type KnowledgeOptions = {
  enabled?: boolean;
  board?: string;
  query?: string;
  topK?: number;
};

type StreamRequestOptions = {
  timeoutMs?: number;
  maxTokens?: number;
  thinking?: 'enabled' | 'disabled';
  responseFormat?: 'text' | 'json_object';
  visualResponse?: boolean;
  temperature?: number;
};

export type KnowledgeSourceSummary = {
  id: string;
  title: string;
  source: string;
  score: number;
  preview: string;
};

const extractResponseError = (raw: string, fallback: string) => {
  if (!raw.trim()) return fallback;

  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim();
    }
    if (parsed.error && typeof parsed.error === 'object') {
      const nested = parsed.error as { message?: unknown };
      if (typeof nested.message === 'string' && nested.message.trim()) {
        return nested.message.trim();
      }
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    return raw.trim();
  }

  return fallback;
};

const parseKnowledgeSourcesHeader = (value: string | null): KnowledgeSourceSummary[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        return {
          id: String(record.id || record.source || ''),
          title: String(record.title || record.source || '参考资料'),
          source: String(record.source || ''),
          score: typeof record.score === 'number' ? record.score : 0,
          preview: String(record.preview || ''),
        };
      })
      .filter((item): item is KnowledgeSourceSummary => Boolean(item?.id || item?.source || item?.preview));
  } catch {
    return [];
  }
};

let chatMessages: ChatMessage[] = [];

const toPromptCopyMessages = (messages: ChatMessage[]): PromptCopyMessage[] =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

export const startQimenChat = async (systemInstruction: string) => {
  chatMessages = [{ role: 'system', content: systemInstruction }];
};

export const restoreChatSession = (
  systemInstruction: string,
  history: { role: 'user' | 'model'; content: string }[]
) => {
  chatMessages = [{ role: 'system', content: systemInstruction }];
  for (const msg of history) {
    chatMessages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.content,
    });
  }
};

export const sendMessageToDeepseek = async (
  message: string,
  knowledge?: KnowledgeOptions
): Promise<string> => {
  if (chatMessages.length === 0) {
    throw new Error('Chat session not initialized. Please start a reading first.');
  }

  chatMessages.push({ role: 'user', content: message });

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: chatMessages,
      knowledge,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(extractResponseError(errorText, '模型请求失败，请稍后重试'));
  }

  const data = await response.json();
  const content = data.content || '无法获取回复';
  chatMessages.push({ role: 'assistant', content });
  return content;
};

type StreamState = {
  reasoning: string;
  content: string;
  knowledgeFailed?: string;
  knowledgeSources?: KnowledgeSourceSummary[];
};

export const sendMessageToDeepseekStream = async (
  message: string,
  onDelta: (state: StreamState) => void,
  knowledge?: KnowledgeOptions,
  model?: ChatModel,
  requestOptions?: StreamRequestOptions,
): Promise<StreamState> => {
  if (chatMessages.length === 0) {
    throw new Error('Chat session not initialized. Please start a reading first.');
  }

  const previousLength = chatMessages.length;
  chatMessages.push({ role: 'user', content: message });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: chatMessages,
        stream: true,
        knowledge,
        model,
        timeoutMs: requestOptions?.timeoutMs,
        maxTokens: requestOptions?.maxTokens,
        thinking: requestOptions?.thinking,
        responseFormat: requestOptions?.responseFormat,
        visualResponse: requestOptions?.visualResponse,
        temperature: requestOptions?.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(extractResponseError(errorText, '模型请求失败，请稍后重试'));
    }

    const knowledgeFailed = response.headers.get('X-Knowledge-Failed')
      ? decodeURIComponent(response.headers.get('X-Knowledge-Failed')!)
      : undefined;
    const knowledgeSources = parseKnowledgeSourcesHeader(response.headers.get('X-Knowledge-Sources'));

    if (!response.body) {
      const data = await response.json();
      const content = data.content || '无法获取回复';
      chatMessages.push({ role: 'assistant', content });
      return {
        reasoning: '',
        content,
        knowledgeFailed: data.knowledgeFailed ?? knowledgeFailed,
        knowledgeSources: data.knowledgeSources ?? knowledgeSources,
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let reasoningText = '';
    let contentText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.replace(/^data:\s?/, '').trim();
          if (!payload || payload === '[DONE]') continue;

          let json: Record<string, any>;
          try {
            json = JSON.parse(payload) as Record<string, any>;
          } catch {
            continue;
          }
          if (json.error) {
            throw new Error(extractResponseError(JSON.stringify(json), 'AI 请求失败，请稍后重试'));
          }
          const reasoningDelta = json.choices?.[0]?.delta?.reasoning_content ?? '';
          const contentDelta = json.choices?.[0]?.delta?.content ?? '';
          if (reasoningDelta) {
            reasoningText += reasoningDelta;
          }
          if (contentDelta) {
            contentText += contentDelta;
          }
          if (reasoningDelta || contentDelta) {
            onDelta({ reasoning: reasoningText, content: contentText });
          }
        }
      }
    }

    if (!reasoningText && !contentText) {
      throw new Error('AI 未返回有效内容，本次请求不会扣除点数，请稍后重试。');
    }

    chatMessages.push({ role: 'assistant', content: contentText });
    return { reasoning: reasoningText, content: contentText, knowledgeFailed, knowledgeSources };
  } catch (error) {
    chatMessages.length = previousLength;
    throw new Error(friendlyChatError(error));
  }
};

export const clearChatSession = () => {
  chatMessages = [];
};

export const getCurrentChatPromptCopyText = (nextUserPrompt?: string) => {
  const messages = toPromptCopyMessages(chatMessages);
  const trimmed = nextUserPrompt?.trim();
  if (trimmed) {
    messages.push({ role: 'user', content: trimmed });
  }
  if (messages.length === 0) return '';
  return formatPromptCopyMessages(messages, {
    title: '完整AI对话提示词',
    note: '以下内容包含本轮对话实际发送给模型的系统提示词、历史用户问题与AI回复。复制后可粘贴到其他 AI 软件继续询问。',
  });
};
