import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAgentCallBudget } from '../lib/agent/time-budget';

test('Agent 为最终综合回答预留时间', () => {
  const first = calculateAgentCallBudget(0, 0, 6);
  assert.equal(first.forcedFinal, false);
  assert.equal(first.timeoutMs, 90_000);

  const later = calculateAgentCallBudget(2, 170_000, 6);
  assert.equal(later.forcedFinal, true);
  assert.equal(later.timeoutMs, 90_000);
});

test('Agent 接近总时限时停止新增模型调用', () => {
  const result = calculateAgentCallBudget(3, 255_000, 6);
  assert.equal(result.exhausted, true);
  assert.equal(result.timeoutMs, 15_000);
});
