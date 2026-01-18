type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

let chatMessages: ChatMessage[] = [];

export const startQimenChat = async (systemInstruction: string) => {
  chatMessages = [{ role: 'system', content: systemInstruction }];
};

export const sendMessageToDeepseek = async (message: string): Promise<string> => {
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

export const sendMessageToDeepseekStream = async (
  message: string,
  onDelta: (delta: string, fullText: string) => void
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
      stream: true,
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
    return content;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

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
          const delta = json.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            fullText += delta;
            onDelta(delta, fullText);
          }
        } catch {
          // Ignore malformed SSE chunks.
        }
      }
    }
  }

  if (!fullText) {
    fullText = '无法获取回复';
  }

  chatMessages.push({ role: 'assistant', content: fullText });
  return fullText;
};

export const clearChatSession = () => {
  chatMessages = [];
};
