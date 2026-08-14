import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAgentTools, toDeepSeekTools } from '../lib/agent/tools.ts';

test('Agent 注册所有用户侧核心术数工具且名称唯一', () => {
  const tools = buildAgentTools({ knowledgeEnabled: true });
  const names = tools.map((tool) => tool.name);
  assert.equal(new Set(names).size, names.length);
  for (const required of [
    'search_cases', 'load_case', 'load_session', 'search_knowledge',
    'bazi_analysis', 'ziwei_analysis', 'joint_bazi_ziwei', 'bazi_compatibility',
    'daily_fortune', 'monthly_fortune', 'qimen_divination', 'meihua_divination',
    'liuyao_divination', 'daliuren_divination', 'taiyi_divination',
    'xiaoliuren_divination', 'almanac_day', 'select_favorable_dates',
  ]) assert.ok(names.includes(required), `missing tool: ${required}`);
});
test('每个工具都禁止未声明参数', () => {
  const tools = toDeepSeekTools(buildAgentTools({ knowledgeEnabled: false }));
  for (const tool of tools) {
    assert.equal(tool.type, 'function');
    assert.equal((tool.function.parameters as { additionalProperties?: boolean }).additionalProperties, false, tool.function.name);
  }
  assert.equal(tools.some((tool) => tool.function.name === 'search_knowledge'), false);
});
