import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBaziCompatibilityChart } from '../lib/bazi-compatibility';
import { buildCaseRelationPromptText, mapPairRelationsToDrafts } from '../lib/case-relations';
import type { BaziResponse } from '../types';

const chart = (name: string): BaziResponse => ({
  taibuText: '这是一段很长的原始盘面'.repeat(2_000),
  base_info: { sex: '男', name, gongli: '1990-01-01 12:00', nongli: '庚午年', qiyun: '3岁', jiaoyun: '1993', zhengge: '正格' },
  bazi_info: { kw: '戌亥', tg_cg_god: ['比肩', '正财', '正官', '食神'], bazi: ['庚午', '戊子', '甲辰', '丙午'], dz_cg: ['丁己', '癸', '戊乙癸', '丁己'], dz_cg_god: ['伤官正财'], day_cs: ['死', '沐浴', '衰', '死'], na_yin: ['路旁土', '霹雳火', '佛灯火', '天河水'] },
  start_info: { jishen: ['天乙', '文昌'] },
  dayun_info: { big_god: ['偏印'], big: ['丁亥'], big_start_year: [1993], big_end_year: [2002], xu_sui: [3] },
  detail_info: { sizhu: { year: { tg: '庚', dz: '午' }, month: { tg: '戊', dz: '子' }, day: { tg: '甲', dz: '辰' }, hour: { tg: '丙', dz: '午' } }, shensha: { year: '将星', month: '桃花', day: '华盖', hour: '将星' } },
});

test('合盘摘要忽略冗长原始文本并保留关键盘面', () => {
  const result = formatBaziCompatibilityChart(chart('甲方'));
  assert.match(result, /姓名：甲方/);
  assert.match(result, /四柱：庚午 戊子 甲辰 丙午/);
  assert.match(result, /大运：丁亥/);
  assert.ok(result.length < 6_000);
  assert.doesNotMatch(result, /这是一段很长的原始盘面/);
});

test('已保存的双向关系标签在用户不编辑时仍会进入合盘提示词', () => {
  const drafts = mapPairRelationsToDrafts([{
    id: 'relation-1',
    caseAId: 'case-b',
    caseBId: 'case-a',
    labelAToB: '朋友',
    labelBToA: '同事',
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
  }], 'case-a', 'case-b');

  const prompt = buildCaseRelationPromptText(drafts, '甲方', '乙方');
  assert.equal(prompt, '甲方是乙方的同事；乙方是甲方的朋友');
});
