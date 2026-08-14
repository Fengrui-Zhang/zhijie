import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAT_TIMEOUT_MESSAGE, friendlyChatError } from '../lib/chat-errors';

test('Vercel 英文超时被转换为中文且明确退款', () => {
  assert.equal(friendlyChatError(new Error('The operation was aborted due to timeout')), CHAT_TIMEOUT_MESSAGE);
});
