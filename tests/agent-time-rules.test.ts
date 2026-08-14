import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectMultipleDivinationQuestions,
  getEarthlyBranchBucket,
  getEarthlyBranchLabel,
  hasPositiveNumbersForQuestions,
  inferMatterKey,
} from '../lib/agent/time-rules.ts';

test('子时跨午夜使用同一个时辰键', () => {
  const beforeMidnight = new Date('2026-08-13T15:30:00.000Z'); // 上海 23:30
  const afterMidnight = new Date('2026-08-13T16:30:00.000Z'); // 上海次日 00:30
  assert.equal(getEarthlyBranchBucket(beforeMidnight), getEarthlyBranchBucket(afterMidnight));
  assert.equal(getEarthlyBranchBucket(beforeMidnight), '2026-08-13:branch-0');
});

test('跨出子时后产生新的时辰键', () => {
  const zi = new Date('2026-08-13T16:30:00.000Z');
  const chou = new Date('2026-08-13T17:10:00.000Z');
  assert.notEqual(getEarthlyBranchBucket(zi), getEarthlyBranchBucket(chou));
});

test('内部时辰编号对用户显示为中文时辰', () => {
  const chen = new Date('2026-08-12T23:30:00.000Z'); // 上海 07:30
  assert.equal(getEarthlyBranchBucket(chen), '2026-08-13:branch-4');
  assert.equal(getEarthlyBranchLabel(chen), '辰时（07:00–09:00）');
});

test('识别一条消息中的多个占问事项', () => {
  const questions = detectMultipleDivinationQuestions('这次工作调动是否有利？我和对象能不能复合？');
  assert.equal(questions.length, 2);
});

test('综合验证同一问题不误判为多问', () => {
  const questions = detectMultipleDivinationQuestions('请用奇门和大六壬综合验证这次工作调动是否有利？');
  assert.deepEqual(questions, []);
});

test('多问报数需要为每个问题提供正整数', () => {
  assert.equal(hasPositiveNumbersForQuestions('1：28；2：63', 2), true);
  assert.equal(hasPositiveNumbersForQuestions('只报 28', 2), false);
  assert.equal(hasPositiveNumbersForQuestions('1. 工作是否有利；2. 感情能否复合', 2), false);
});

test('事项分类允许同类追问复用时间盘', () => {
  assert.equal(inferMatterKey('这次工作调动是否有利'), 'career');
  assert.equal(inferMatterKey('大概什么时候能落实职位'), 'career');
  assert.equal(inferMatterKey('这段感情能否复合'), 'relationship');
});
