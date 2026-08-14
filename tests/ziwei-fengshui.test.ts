import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ZIWEI_DIRECTIONS,
  getZiweiFengshuiDecadalOptions,
  getZiweiDirection,
  getZiweiFengshuiFocusPalaces,
  resolveZiweiFengshuiPeriod,
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
  summary: '全盘物象预测与十二宫催旺方案已经按方位呈现。',
  periodNotice: '本命底色与目标时间层变化已经分层呈现。',
  priorityPalaceNames: ['命宫', '官禄宫', '田宅宫'],
  palaces: expectedPalaces.map(({ palaceName }) => ({
    palaceName,
    tendency: '中性成象',
    summary: `${palaceName}所在方位以柜体、纸张与柔和照明物象最为鲜明。`,
    predictedObjects: [
      { item: '木质柜体', state: '颜色偏深、体量适中，常位于墙边。', basis: '天府库藏与土性共同取象。' },
      { item: '暖色台灯', state: '灯体较小，光线集中向下。', basis: '太阳与文昌共同指向照明和阅读物件。' },
    ],
    natalEvidence: ['本命星曜与宫位结构支持该方位物象。'],
    timingEvidence: ['本年四化进一步修饰物品的强弱与状态。'],
    enhancementAdvice: {
      goal: '增强该宫位对应的人事主题',
      supportingStar: '天府化科',
      items: [{ item: '陶瓷聚宝罐', material: '陶瓷', color: '米黄色', quantity: '1件', symbolism: '承接天府库藏与化科稳定成形的正向类象。' }],
      placement: '摆在该宫对应方位内侧稳定台面，罐口朝向室内中心。',
      activationLogic: `${palaceName}→天府→化科→陶瓷库器→稳定承接宫位正向功能。`,
      expectedEffect: '强化该宫的资源承接、稳定与累积主题。',
    },
    contraindications: ['不搭配明火、刀具或过量金属物件。'],
    evidenceChains: [{
      chain: `${palaceName}→地支方向→星曜→辅煞四化→预测物品与状态`,
      grade: '稳定传统',
    }, {
      chain: `改善目标→${palaceName}→助力星曜→有利四化→催旺物→摆放方法`,
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
  const yearly = { layer: 'yearly' as const, key: '2026', label: '2026年流年', targetYear: 2026 };
  const result = validateZiweiFengshuiGeneration(makeRawResult(), expectedPalaces, yearly, '2026-08-14T00:00:00.000Z');
  assert.equal(result.palaces.length, 12);
  assert.equal(result.palaces[0].direction, '正北');
  assert.equal(result.palaces[3].direction, '正东');
  assert.equal(result.palaces[0].predictedObjects.length, 2);
  assert.equal(result.palaces[0].enhancementAdvice.items[0].item, '陶瓷聚宝罐');

  const duplicated = makeRawResult();
  duplicated.palaces[1].palaceName = '命宫';
  assert.throws(
    () => validateZiweiFengshuiGeneration(duplicated, expectedPalaces, yearly),
    /重复返回宫位/,
  );

  const invalidTendency = makeRawResult();
  invalidTendency.palaces[0].tendency = '大吉';
  assert.throws(
    () => validateZiweiFengshuiGeneration(invalidTendency, expectedPalaces, yearly),
    /物象倾向无效/,
  );
});

test('主题筛选最多高亮一个主宫和两个辅助宫', () => {
  const result = validateZiweiFengshuiGeneration(makeRawResult(), expectedPalaces, { layer: 'yearly', key: '2026', label: '2026年流年', targetYear: 2026 }) as ZiweiFengshuiResult;
  assert.deepEqual(getZiweiFengshuiFocusPalaces('career', result), ['官禄宫', '命宫', '迁移宫']);
  assert.deepEqual(getZiweiFengshuiFocusPalaces('social', result), ['仆役宫', '兄弟宫', '官禄宫']);
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
  const natal = resolveZiweiFengshuiPeriod(chart, 'natal');
  const natalContext = buildZiweiFengshuiChartContext(chart, natal);
  const yearly = resolveZiweiFengshuiPeriod(chart, 'yearly', '2027');
  const context = buildZiweiFengshuiChartContext(chart, yearly);

  assert.equal(natalContext.targetDate, null);
  assert.equal(natalContext.timing.decadal, null);
  assert.equal(natalContext.timing.yearly, null);
  assert.ok(natalContext.palaces.every((palace) => palace.timingSignals.length === 0));
  assert.equal(context.period.targetYear, 2027);
  assert.equal(context.targetDate, '2027-07-01');
  assert.equal(context.palaces.length, 12);
  assert.ok(context.palaces.every((palace) => palace.oppositePalace && palace.trinePalaces.length === 2));
  assert.ok(context.timing.decadal);
  assert.ok(context.timing.yearly);

  const options = getZiweiFengshuiDecadalOptions(chart);
  assert.ok(options.length > 0);
  const decadal = resolveZiweiFengshuiPeriod(chart, 'decadal', options[0].key);
  const decadalContext = buildZiweiFengshuiChartContext(chart, decadal);
  assert.ok(decadalContext.timing.decadal);
  assert.equal(decadalContext.timing.yearly, null);
  assert.equal(decadalContext.timing.transitStars.length, 0);
});

test('紫微风水 prompt 只注入一次命盘并分开物象预测与催旺建议', async () => {
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
  const prompt = buildZiweiFengshuiPrompt(buildZiweiFengshuiChartContext(chart, resolveZiweiFengshuiPeriod(chart, 'natal')));
  const combined = `${prompt.system}\n${prompt.user}`;

  assert.equal(combined.split('【确定性紫微命盘与时间层上下文】').length - 1, 1);
  assert.match(combined, /原命局紫微风水/);
  assert.doesNotMatch(combined, /2026年流年/);
  assert.doesNotMatch(combined, /【个性化偏好】|chart-json|知识库检索/);
  assert.doesNotMatch(combined, /先减后加|整理与优化|清走失效/);
  assert.match(combined, /物象预测|具体物品|催旺摆放方案/);
  assert.match(combined, /材质、颜色、数量|助力星曜|有利四化/);
  assert.doesNotMatch(combined, /不等同于真实户型勘察|仅供娱乐/);
  assert.match(combined, /大型水景|强电改造|结构拆改/);
});
