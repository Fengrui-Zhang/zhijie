import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareMessageRevision, revisionMatches } from '../lib/agent/message-revision';
import { getCaseCardPreview } from '../lib/case-card-preview';
import { ModelType } from '../types';
import type { CaseItem } from '../lib/divination-cases';

const messages = [
  { id: 'u1', role: 'user', content: '第一问' }, { id: 'm1', role: 'model', content: '第一答' },
  { id: 'u2', role: 'user', content: '第二问' }, { id: 'm2', role: 'model', content: '第二答' },
];
test('editing a question excludes its answer and all following turns from the new context', () => {
  const revision = prepareMessageRevision(messages, { index: 2, expectedContent: '第二问', expectedMessageCount: 4 });
  assert.deepEqual(revision.history.map((m) => m.id), ['u1', 'm1']);
  assert.deepEqual(revision.replacedIds, ['u2', 'm2']);
  assert.equal(messages.length, 4);
  assert.equal(prepareMessageRevision(messages, { index: 0, expectedContent: '第一问', expectedMessageCount: 4 }).history.length, 0);
});
test('stale edits and non-user targets cannot replace another message', () => {
  for (const revision of [
    { index: -1, expectedContent: '第二问', expectedMessageCount: 4 },
    { index: 1, expectedContent: '第一答', expectedMessageCount: 4 },
    { index: 2, expectedContent: '改过的问题', expectedMessageCount: 4 },
    { index: 2, expectedContent: '第二问', expectedMessageCount: 3 },
  ]) assert.throws(() => prepareMessageRevision(messages, revision));
  assert.equal(revisionMatches(messages, messages), true);
  assert.equal(revisionMatches([...messages, { id: 'u3', role: 'user', content: '新问' }], messages), false);
  assert.equal(revisionMatches(messages.map((m) => m.id === 'u2' ? { ...m, content: '被另一窗口修改' } : m), messages), false);
});
const base: CaseItem = { id: 'test', title: '测试', modelType: ModelType.BAZI, chartParams: { name: '测试', sex: 1, calendarType: 'solar', year: 2024, month: 2, day: 10, hours: 9 }, chartData: { bazi_info: { bazi: ['甲辰', '丙寅', '甲辰', '己巳'] } }, createdAt: '2026-09-28T00:00:00Z', updatedAt: '2026-09-28T00:00:00Z' };
test('case preview uses saved pillars, matching hidden stems and both birth calendars', () => {
  const preview = getCaseCardPreview(base);
  assert.equal(preview.sex, '坤造');
  assert.deepEqual(preview.pillars, ['甲辰', '丙寅', '甲辰', '己巳']);
  assert.deepEqual(preview.hidden[0], ['戊', '乙', '癸']);
  assert.match(preview.solar, /2024-02-10 09:00/);
  assert.match(preview.lunar, /正月初一/);
});
test('lunar inputs convert to solar, and Ziwei uses its recorded four pillars', () => {
  const preview = getCaseCardPreview({ ...base, modelType: ModelType.ZIWEI, chartParams: { ...base.chartParams, calendarType: 'lunar', month: 1, day: 1 }, chartData: { taibuJson: { 基本信息: { 四柱: '甲辰 丙寅 甲辰 己巳' } }, base_info: { zhen: { shicha: '08:32（校正-28分钟）' } } } });
  assert.match(preview.solar, /2024-02-10/);
  assert.deepEqual(preview.pillars, ['甲辰', '丙寅', '甲辰', '己巳']);
  assert.match(preview.trueSolar, /08:32/);
});
