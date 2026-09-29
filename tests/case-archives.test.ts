import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveRepresentatives, findCaseArchive, groupCaseArchives, caseBirthKey, assertArchiveCanSwitch, sharedArchiveParams } from '../lib/case-archives';
import { normalizeCaseChartParams } from '../lib/divination-cases';
import { ModelType } from '../types';

const birth = { name: '档案测试', sex: 0, year: 2000, month: 1, day: 1, hours: 12, minute: 0, calendarType: 'solar' as const };
const record = (id: string, modelType = ModelType.BAZI, params = birth) => ({ id, modelType, chartParams: params, updatedAt: '2026-09-28T00:00:00.000Z' });

test('legacy Bazi and Ziwei become one archive without losing physical IDs', () => {
  const items = [record('z', ModelType.ZIWEI), record('b')];
  assert.deepEqual(archiveRepresentatives(items).map(item => item.id), ['b']);
  assert.deepEqual(findCaseArchive(items, 'z').map(item => item.id), ['z', 'b']);
});
test('same name with different birth, calendar or true solar settings stays separate', () => {
  for (const changes of [{ hours: 13 }, { sex: 1 }, { calendarType: 'lunar' }, { useTrueSolar: true, longitude: 102 }, { isLeapMonth: true }]) {
    const other = { ...record('z', ModelType.ZIWEI), chartParams: { ...birth, ...changes } };
    assert.equal(groupCaseArchives([record('b'), other]).length, 2);
  }
});
test('ambiguous duplicates and unnamed records are not automatically merged', () => {
  assert.equal(groupCaseArchives([record('b'), record('b2'), record('z', ModelType.ZIWEI)]).length, 3);
  assert.equal(groupCaseArchives([record('b', ModelType.BAZI, { ...birth, name: '' }), record('z', ModelType.ZIWEI, { ...birth, name: '' })]).length, 2);
});
test('explicit archive membership survives rename and is retained by normalizer', () => {
  const items = [record('b'), record('z', ModelType.ZIWEI)].map((item, index) => ({ ...item, chartParams: { ...birth, name: index ? '新名称' : birth.name, archiveId: 'shared' } }));
  assert.equal(groupCaseArchives(items).length, 1);
  assert.equal(normalizeCaseChartParams(items[0].chartParams).archiveId, 'shared');
});
test('chart identity includes calendar and birthplace but not display name', () => {
  assert.equal(caseBirthKey(birth), caseBirthKey({ ...birth, name: '另一个名称' }));
  assert.notEqual(caseBirthKey(birth), caseBirthKey({ ...birth, district: '某区' }));
});
test('archive edits preserve model metadata but remove obsolete birth fields', () => {
  const result = sharedArchiveParams({ ...birth, pillars: { year: '甲子', month: '甲子', day: '甲子', hour: '甲子' }, specialTags: ['测试'] }, birth, 'group');
  assert.equal(result.pillars, undefined);
  assert.deepEqual(result.specialTags, ['测试']);
  assert.equal(result.archiveId, 'group');
});
test('cannot fabricate a birth date for a pillars-only or incomplete archive', () => {
  assert.throws(() => assertArchiveCanSwitch({ ...birth, calendarType: 'pillars' }), /实际出生日期/);
  assert.throws(() => assertArchiveCanSwitch({ name: '缺少资料' }), /不完整/);
  assert.doesNotThrow(() => assertArchiveCanSwitch(birth));
});
