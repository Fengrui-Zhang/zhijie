import assert from 'node:assert/strict';
import test from 'node:test';
import { ModelType } from '../types';
import { Prisma } from '@prisma/client';

// An isolated transactional store exercises the production service without touching user records.
let records: any[] = [];
let serial = 0;
let sessions = [{ id: 'history-b', caseId: 'b' }, { id: 'history-z', caseId: 'z' }];
let failUpdate = false;
const tx = { divinationCase: {
  findMany: async ({ where }: any) => records.filter(item => item.userId === where.userId),
  update: async ({ where, data }: any) => {
    if (failUpdate && where.id === 'z') throw new Error('simulated failure');
    const index = records.findIndex(item => item.id === where.id);
    records[index] = { ...records[index], ...data };
    return records[index];
  },
  create: async ({ data }: any) => { const item = { id: `new-${++serial}`, createdAt: new Date(), updatedAt: new Date(), ...data }; records.push(item); return item; },
  deleteMany: async ({ where }: any) => { records = records.filter(item => item.userId !== where.userId || !where.id.in.includes(item.id)); },
} };
(globalThis as any).prisma = { $transaction: async (work: any, options: any) => {
  assert.equal(options.isolationLevel, 'Serializable');
  const before = structuredClone(records);
  try { return await work(tx); } catch (error) { records = before; throw error; }
} };
const { resolveArchiveChart, updateCaseArchive, deleteCaseArchive } = await import('../lib/case-archive-store');
const birth = { name: '档案测试', sex: 0, year: 2000, month: 1, day: 1, hours: 12, minute: 0, calendarType: 'solar' };
const make = (id: string, modelType: string, userId = 'owner') => ({ id, userId, modelType, title: birth.name, chartParams: { ...birth }, chartData: { saved: id }, initialAnalysisData: { saved: id }, createdAt: new Date(), updatedAt: new Date() });

test('resolve existing counterpart preserves IDs, analysis and history on repeated switches', async () => {
  records = [make('b', 'bazi'), make('z', 'ziwei'), make('foreign', 'ziwei', 'other')];
  const originalSessions = structuredClone(sessions);
  assert.equal((await resolveArchiveChart('owner', 'b', ModelType.ZIWEI)).id, 'z');
  assert.equal((await resolveArchiveChart('owner', 'z', ModelType.BAZI)).id, 'b');
  assert.equal(records.length, 3);
  assert.deepEqual(records[1].initialAnalysisData, { saved: 'z' });
  assert.deepEqual(sessions, originalSessions);
  await assert.rejects(resolveArchiveChart('other', 'b', ModelType.ZIWEI), /不存在/);
});
test('missing counterpart is calculated once using identical lunar and true solar birth input', async () => {
  records = [make('b', 'bazi')];
  records[0].chartParams = { ...birth, calendarType: 'lunar', useTrueSolar: true, longitude: 102.7, province: '云南省', city: '昆明市' };
  const original = structuredClone(records[0].chartParams);
  const result = await resolveArchiveChart('owner', 'b', ModelType.ZIWEI);
  assert.equal(records.length, 2);
  const ziwei = records.find(item => item.id === result.id);
  const { rechartAt, ...shared } = ziwei.chartParams;
  assert.deepEqual(shared, { ...original, archiveId: 'b' });
  assert.ok(rechartAt);
  assert.ok(ziwei.chartData.base_info);
  assert.equal(ziwei.chartData.detail_info.xiantian_info.gong_pan.length, 12);
  assert.ok(ziwei.chartData.base_info.zhen);
  assert.equal((await resolveArchiveChart('owner', 'b', ModelType.ZIWEI)).id, result.id);
  assert.equal(records.length, 2);
});
test('shared rename keeps both cached analyses, birth edit regenerates counterpart and invalidates caches', async () => {
  records = [make('b', 'bazi'), make('z', 'ziwei')];
  await updateCaseArchive('owner', 'b', { chartParams: { ...birth, name: '新名称' }, chartData: { saved: 'b' } });
  assert.deepEqual(records.map(item => item.title), ['新名称', '新名称']);
  assert.deepEqual(records[1].initialAnalysisData, { saved: 'z' });
  await updateCaseArchive('owner', 'b', { chartParams: { ...birth, name: '新名称', hours: 13 }, chartData: { recalculated: true } });
  assert.equal(records[1].chartParams.hours, 13);
  assert.ok(records[1].chartData.base_info);
  assert.equal(records[1].initialAnalysisData, Prisma.DbNull);
  assert.equal(sessions.length, 2);
});
test('failed edit rolls back every member', async () => {
  records = [make('b', 'bazi'), make('z', 'ziwei')];
  const before = structuredClone(records);
  failUpdate = true;
  await assert.rejects(updateCaseArchive('owner', 'b', { chartParams: { ...birth, name: '未保存' }, chartData: { saved: 'b' } }));
  failUpdate = false;
  assert.deepEqual(records, before);
});
test('archive deletion removes both models and leaves other people untouched', async () => {
  records = [make('b', 'bazi'), make('z', 'ziwei'), { ...make('keep', 'bazi'), chartParams: { ...birth, name: '其他人' } }, make('foreign', 'ziwei', 'other')];
  await deleteCaseArchive('owner', 'z');
  assert.deepEqual(records.map(item => item.id), ['keep', 'foreign']);
});
test('pillars-only archive fails without leaving a partial link or new chart', async () => {
  records = [make('b', 'bazi')]; records[0].chartParams.calendarType = 'pillars';
  const before = structuredClone(records);
  await assert.rejects(resolveArchiveChart('owner', 'b', ModelType.ZIWEI), /实际出生日期/);
  assert.deepEqual(records, before);
});
