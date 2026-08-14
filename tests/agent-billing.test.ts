import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateAgentPoints,
  MAX_AGENT_AI_CALLS,
  MAX_AGENT_POINTS_PER_TURN,
  shouldReserveAgentPoint,
} from '../lib/agent/billing.ts';

test('Agent 单轮最多调用 6 次、最多消耗 3 点', () => {
  assert.equal(MAX_AGENT_AI_CALLS, 6);
  assert.equal(MAX_AGENT_POINTS_PER_TURN, 3);
});

test('每次按 0.5 点计算并对单轮总额向上取整', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map(calculateAgentPoints),
    [0, 1, 1, 2, 2, 3, 3],
  );
});

test('仅在奇数次调用前新增预占 1 点', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map(shouldReserveAgentPoint),
    [true, false, true, false, true, false],
  );
});
