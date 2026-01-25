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

let chatMessages: ChatMessage[] = [];

export const startQimenChat = async (systemInstruction: string) => {
  chatMessages = [{ role: 'system', content: systemInstruction }];
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
    throw new Error(errorText || 'Failed to reach DeepSeek API.');
  }

  const data = await response.json();
  const content = data.content || '无法获取回复';
  chatMessages.push({ role: 'assistant', content });
  return content;
};

type StreamState = {
  reasoning: string;
  content: string;
};

export const sendMessageToDeepseekStream = async (
  message: string,
  onDelta: (state: StreamState) => void,
  knowledge?: KnowledgeOptions
): Promise<StreamState> => {
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
      stream: true,
      knowledge,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to reach DeepSeek API.');
  }

  if (!response.body) {
    const data = await response.json();
    const content = data.content || '无法获取回复';
    chatMessages.push({ role: 'assistant', content });
    return { reasoning: '', content };
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

        try {
          const json = JSON.parse(payload);
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
        } catch {
          // Ignore malformed SSE chunks.
        }
      }
    }
  }

  if (!reasoningText && !contentText) {
    contentText = '无法获取回复';
  }

  chatMessages.push({ role: 'assistant', content: contentText });
  return { reasoning: reasoningText, content: contentText };
};

export const clearChatSession = () => {
  chatMessages = [];
};
