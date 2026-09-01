export const DEFAULT_CHAT_THINKING = 'disabled' as const;

export const EMPTY_MODEL_CONTENT_MESSAGE = 'AI 未返回有效正文，本次请求不会扣除点数，请稍后重试。';

export const hasUsableAssistantContent = (content: unknown): content is string =>
  typeof content === 'string' && content.trim().length > 0;

export type DeepSeekStreamObservation = {
  buffer: string;
  content: string;
  reasoning: string;
  finishReason: string;
};

export const createDeepSeekStreamObservation = (): DeepSeekStreamObservation => ({
  buffer: '',
  content: '',
  reasoning: '',
  finishReason: '',
});

const observeEventBlock = (state: DeepSeekStreamObservation, block: string) => {
  for (const line of block.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const raw = line.replace(/^data:\s?/, '').trim();
    if (!raw || raw === '[DONE]') continue;
    try {
      const payload = JSON.parse(raw) as {
        choices?: Array<{
          delta?: { content?: unknown; reasoning_content?: unknown };
          finish_reason?: unknown;
        }>;
      };
      const choice = payload.choices?.[0];
      if (typeof choice?.delta?.content === 'string') state.content += choice.delta.content;
      if (typeof choice?.delta?.reasoning_content === 'string') state.reasoning += choice.delta.reasoning_content;
      if (typeof choice?.finish_reason === 'string') state.finishReason = choice.finish_reason;
    } catch {
      // The upstream event is still forwarded unchanged. Invalid diagnostic chunks
      // are ignored here and remain the client's responsibility to surface.
    }
  }
};

export const observeDeepSeekSse = (
  state: DeepSeekStreamObservation,
  text: string,
  flush = false,
) => {
  state.buffer += text;
  const blocks = state.buffer.split(/\r?\n\r?\n/);
  state.buffer = blocks.pop() || '';
  for (const block of blocks) observeEventBlock(state, block);
  if (flush && state.buffer.trim()) {
    observeEventBlock(state, state.buffer);
    state.buffer = '';
  }
  return state;
};
