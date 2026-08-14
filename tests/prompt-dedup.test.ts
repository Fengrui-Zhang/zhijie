import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALMANAC_SYSTEM_PROMPT,
  DAILY_FORTUNE_SYSTEM_PROMPT,
  DALIUREN_SYSTEM_PROMPT,
  LIUYAO_SYSTEM_PROMPT,
  MEIHUA_SYSTEM_PROMPT,
  MONTHLY_FORTUNE_SYSTEM_PROMPT,
  QIMEN_SYSTEM_PROMPT,
  TAIYI_SYSTEM_PROMPT,
  XIAOLIUREN_SYSTEM_PROMPT,
} from '../lib/analysis-system-prompts';
import {
  buildZiweiAnalysisPrompt,
  buildZiweiSystemPrompt,
} from '../lib/ziwei-prompt';
import {
  formatAlmanacPrompt,
  formatDailyFortunePrompt,
  formatDaliurenPrompt,
  formatLiuyaoPrompt,
  formatMeihuaPrompt,
  formatMonthlyFortunePrompt,
  formatQimenPrompt,
  formatTaiyiPrompt,
  formatXiaoliurenPrompt,
  formatZiweiPrompt,
} from '../services/apiService';
import type {
  GenericTaibuResponse,
  LiuyaoResponse,
  MeihuaResponse,
  QimenResponse,
  ZiweiResponse,
} from '../types';

const occurrences = (text: string, fragment: string) => text.split(fragment).length - 1;

test('紫微命盘和当前时间只注入 system，user 只保留任务与问题', () => {
  const chart = { taibuText: '# 紫微命盘\n紫微唯一盘面标识' } as ZiweiResponse;
  const currentTime = '当前时间: 2026年8月14日10时30分';
  const system = buildZiweiSystemPrompt(chart, currentTime);
  const user = buildZiweiAnalysisPrompt('事业发展如何？');
  const combined = `${system}\n${user}`;

  assert.equal(occurrences(combined, '紫微唯一盘面标识'), 1);
  assert.equal(occurrences(combined, currentTime), 1);
  assert.match(system, /【紫微斗数命盘上下文】/);
  assert.doesNotMatch(user, /紫微唯一盘面标识|当前时间|【紫微斗数命盘上下文】/);
  assert.match(user, /事业发展如何/);
});

test('紫微合并后的 system 保留原有独有分析要求', () => {
  const chart = { taibuText: '紫微盘面' } as ZiweiResponse;
  const system = buildZiweiSystemPrompt(chart);

  for (const requirement of [
    '三合紫微',
    '紫府同宫',
    '四化飞星',
    '三方四正',
    '大限、流年叠宫',
    '优势、潜在风险',
    '800-1200',
  ]) {
    assert.match(system, new RegExp(requirement));
  }
});

test('紫微上下文格式化函数仍返回完整盘面，供引用命例使用', () => {
  const chart = { taibuText: '# 紫微命盘\n引用上下文唯一标识' } as ZiweiResponse;
  assert.equal(formatZiweiPrompt(chart), chart.taibuText);
});

test('占卜类 user prompt 只携带盘面与问题，不重复 system 方法指令', () => {
  const question = '这次工作调动是否有利？';
  const qimen = formatQimenPrompt({ taibuText: '奇门唯一盘面' } as QimenResponse, question);
  const meihua = formatMeihuaPrompt({ taibuText: '梅花唯一盘面' } as MeihuaResponse, question);
  const liuyao = formatLiuyaoPrompt({ taibuText: '六爻唯一盘面' } as LiuyaoResponse, question);
  const generic = { taibuText: '通用唯一盘面' } as GenericTaibuResponse;
  const prompts = [
    qimen,
    meihua,
    liuyao,
    formatDaliurenPrompt(generic, question),
    formatTaiyiPrompt(generic, question),
    formatXiaoliurenPrompt(generic, question),
    formatAlmanacPrompt(generic, question),
    formatDailyFortunePrompt(generic, question),
    formatMonthlyFortunePrompt(generic, question),
  ];

  for (const prompt of prompts) {
    assert.match(prompt, new RegExp(question.replace(/[?？]/g, '.')));
    assert.doesNotMatch(prompt, /你是.+(?:大师|专家|预测师|顾问|占卜师)/);
    assert.doesNotMatch(prompt, /请以.+体系为基础|请利用梅花易数|请基于六亲/);
  }
});

test('移出 user prompt 的术数方法信息完整保留在统一 system 常量', () => {
  const requirements: Array<[string, string[]]> = [
    [QIMEN_SYSTEM_PROMPT, ['值符值使', '九宫生克', '应期']],
    [MEIHUA_SYSTEM_PROMPT, ['体用生克', '应期', '建议']],
    [LIUYAO_SYSTEM_PROMPT, ['六亲', '五行生克', '变卦', '空亡']],
    [DALIUREN_SYSTEM_PROMPT, ['四课三传', '天将', '课体', '应期']],
    [TAIYI_SYSTEM_PROMPT, ['局式', '主客', '星神', '格局信号']],
    [XIAOLIUREN_SYSTEM_PROMPT, ['六宫课体', '五行属性', '诗诀']],
    [ALMANAC_SYSTEM_PROMPT, ['黄历宜忌', '冲煞', '替代建议']],
    [DAILY_FORTUNE_SYSTEM_PROMPT, ['当日干支', '风险提醒', '可执行建议']],
    [MONTHLY_FORTUNE_SYSTEM_PROMPT, ['月度趋势', '节奏安排', '可执行建议']],
  ];

  for (const [prompt, fragments] of requirements) {
    for (const fragment of fragments) assert.match(prompt, new RegExp(fragment));
  }
});
