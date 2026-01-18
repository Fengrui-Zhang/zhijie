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

export const clearChatSession = () => {
  chatMessages = [];
};
