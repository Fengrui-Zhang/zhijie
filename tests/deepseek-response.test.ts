import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDeepSeekStreamObservation,
  DEFAULT_CHAT_THINKING,
  hasUsableAssistantContent,
  observeDeepSeekSse,
} from '../lib/deepseek-response';

test('通用 AI 默认关闭深度思考', () => {
  assert.equal(DEFAULT_CHAT_THINKING, 'disabled');
});

test('只有 reasoning 没有正文时不能判定为成功', () => {
  const state = createDeepSeekStreamObservation();
  observeDeepSeekSse(state, 'data: {"choices":[{"delta":{"reasoning_content":"推理中"}}]}\n\n');
  observeDeepSeekSse(state, 'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n', true);
  assert.equal(state.reasoning, '推理中');
  assert.equal(state.content, '');
  assert.equal(state.finishReason, 'length');
  assert.equal(hasUsableAssistantContent(state.content), false);
});

test('跨数据块的正文可以被识别', () => {
  const state = createDeepSeekStreamObservation();
  observeDeepSeekSse(state, 'data: {"choices":[{"delta":{"content":"有效');
  observeDeepSeekSse(state, '正文"}}]}\n\n');
  assert.equal(state.content, '有效正文');
  assert.equal(hasUsableAssistantContent(state.content), true);
});
