import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ZIWEI_DIRECTIONS,
  getZiweiDirection,
  getZiweiFengshuiFocusPalaces,
  validateZiweiFengshuiGeneration,
  type ZiweiFengshuiResult,
} from '../lib/ziwei-fengshui';
import {
  buildZiweiFengshuiChartContext,
  buildZiweiFengshuiPrompt,
} from '../lib/ziwei-fengshui-prompt';
import { calculateTaibuChart } from '../lib/taibu-chart';
import { ModelType, type ZiweiResponse } from '../types';

const expectedPalaces = [
  '命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫',
  '迁移宫', '仆役宫', '官禄宫', '田宅宫', '福德宫', '父母宫',
].map((palaceName, index) => ({
  palaceName,
  branch: Object.keys(ZIWEI_DIRECTIONS)[index],
}));

const makeRawResult = () => ({
  summary: '全盘物象与空间状态已经按十二方位呈现。',
  yearlyNotice: '本命底色与目标年份变化已经分层呈现。',
  priorityPalaceNames: ['命宫', '官禄宫', '田宅宫'],
  palaces: expectedPalaces.map(({ palaceName }) => ({
    palaceName,
    status: '基本平稳',
    summary: `${palaceName}所在方位有收纳柜、纸张与柔和照明，整体秩序平稳。`,
    currentObjects: ['一组木质收纳柜，内部文件较多。', '一盏暖色台灯，周围放有纸张和充电线。'],
    natalEvidence: ['本命星曜与宫位结构提示先做基础检查。'],
    yearlyEvidence: ['本年无直接流曜叠入时，以本命检查为主。'],
    optimizationSteps: ['清走失效纸张，将充电线整理到柜体一侧。'],
    placementAdvice: {
      item: '一只浅色文件托盘',
      method: '放在收纳柜上方靠内侧，集中承接当周使用的文件。',
      reason: '以少量、可逆的收纳动作稳定该宫位对应的空间功能。',
      avoidWhen: ['柜面潮湿、过热或已经影响通行时。'],
    },
    avoid: ['不自行进行强电、明火、管道或结构改造。'],
    evidenceChains: [{
      chain: `${palaceName}→地支方向→星曜→辅煞四化→可能物象→安全检查`,
      grade: '稳定传统',
    }],
  })),
});

test('十二地支方向使用正北零度并保持每宫三十度', () => {
  assert.deepEqual(getZiweiDirection('子'), {
    branch: '子', centerDegree: 0, degreeRange: '345°–15°', direction: '正北', element: '水',
  });
  assert.equal(getZiweiDirection('卯').centerDegree, 90);
  assert.equal(getZiweiDirection('午').centerDegree, 180);
  assert.equal(getZiweiDirection('酉').centerDegree, 270);
  assert.equal(new Set(Object.values(ZIWEI_DIRECTIONS).map((item) => item.centerDegree)).size, 12);
});

test('结构校验必须覆盖十二个唯一宫位并由程序补充方向', () => {
  const result = validateZiweiFengshuiGeneration(makeRawResult(), expectedPalaces, 2026, '2026-08-14T00:00:00.000Z');
  assert.equal(result.palaces.length, 12);
  assert.equal(result.palaces[0].direction, '正北');
  assert.equal(result.palaces[3].direction, '正东');
  assert.equal(result.palaces[0].currentObjects.length, 2);
  assert.equal(result.palaces[0].placementAdvice.item, '一只浅色文件托盘');

  const duplicated = makeRawResult();
  duplicated.palaces[1].palaceName = '命宫';
  assert.throws(
    () => validateZiweiFengshuiGeneration(duplicated, expectedPalaces, 2026),
    /重复返回宫位/,
  );

  const invalidStatus = makeRawResult();
  invalidStatus.palaces[0].status = '大吉';
  assert.throws(
    () => validateZiweiFengshuiGeneration(invalidStatus, expectedPalaces, 2026),
    /状态无效/,
  );
});

test('主题筛选最多高亮一个主宫和两个辅助宫', () => {
  const result = validateZiweiFengshuiGeneration(makeRawResult(), expectedPalaces, 2026) as ZiweiFengshuiResult;
  assert.deepEqual(getZiweiFengshuiFocusPalaces('career', result), ['官禄宫', '命宫', '迁移宫']);
  assert.equal(getZiweiFengshuiFocusPalaces('overall', result).length, 3);
});

test('真实排盘上下文分离本命与目标年份并计算对宫、三方四正', async () => {
  const chart = await calculateTaibuChart({
    modelType: ModelType.ZIWEI,
    params: {
      year: 2001,
      month: 4,
      day: 22,
      hours: 9,
      minute: 0,
      sex: 0,
      name: '测试命例',
      useTrueSolar: false,
      calendarType: 'solar',
    },
  }) as ZiweiResponse;
  const context = buildZiweiFengshuiChartContext(chart, 2027);

  assert.equal(context.targetYear, 2027);
  assert.equal(context.targetDate, '2027-07-01');
  assert.equal(context.palaces.length, 12);
  assert.ok(context.palaces.every((palace) => palace.oppositePalace && palace.trinePalaces.length === 2));
  assert.ok(context.annual.decadal);
  assert.ok(context.annual.yearly);
});

test('紫微风水 prompt 只注入一次命盘且直接推演当前物象', async () => {
  const chart = await calculateTaibuChart({
    modelType: ModelType.ZIWEI,
    params: {
      year: 1992,
      month: 8,
      day: 16,
      hours: 14,
      minute: 30,
      sex: 1,
      name: '隔离测试',
      useTrueSolar: false,
      calendarType: 'solar',
    },
  }) as ZiweiResponse;
  const prompt = buildZiweiFengshuiPrompt(buildZiweiFengshuiChartContext(chart, 2026));
  const combined = `${prompt.system}\n${prompt.user}`;

  assert.equal(combined.split('【确定性紫微命盘与流年上下文】').length - 1, 1);
  assert.doesNotMatch(combined, /【个性化偏好】|chart-json|知识库检索/);
  assert.match(combined, /先减后加/);
  assert.match(combined, /当前物象|具体物品|摆放方案/);
  assert.match(combined, /不要反复使用“可能、也许、待检查”/);
  assert.doesNotMatch(combined, /不等同于真实户型勘察|仅供娱乐/);
  assert.match(combined, /大型水景|强电改造|结构拆改/);
});
