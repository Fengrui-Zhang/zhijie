import { normalizeCaseChartParams } from '../divination-cases';
import { formatBaziCompatibilityChart } from '../bazi-compatibility';

export const MAX_SELECTED_CONTEXT_TEXT = 18_000;
type CaseReference = { id: string; title: string; modelType: string; chartParams: unknown; chartData: unknown };
type SessionReference = { id: string; title: string; messages: { role: string; content: string }[] };
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const short = (value: unknown, limit = 120) => String(value ?? '').slice(0, limit);
const uniqueIds = (ids: string[]) => [...new Set(ids)].slice(0, 4);

export function formatAgentCaseIdentity(item: CaseReference) {
  const params = normalizeCaseChartParams(item.chartParams);
  const birth: Record<string, unknown> = {};
  for (const key of ['name', 'sex', 'year', 'month', 'day', 'hours', 'minute', 'calendarType', 'isLeapMonth', 'timeInputMode', 'useTrueSolar', 'birthPlace', 'province', 'city', 'district', 'longitude', 'latitude'] as const) {
    const value = params[key];
    if (value !== undefined) birth[key] = typeof value === 'string' ? short(value, 96) : value;
  }
  if (params.pillars) birth.pillars = Object.fromEntries(Object.entries(params.pillars).map(([key, value]) => [key, short(value, 12)]));
  const base = record(record(item.chartData).base_info);
  const recorded = Object.fromEntries(['name', 'sex', 'gongli', 'nongli'].filter((key) => typeof base[key] === 'string').map((key) => [key, short(base[key], 96)]));
  return [
    `【已引用命例｜${short(item.title)}｜${short(item.modelType, 32)}｜caseId=${short(item.id, 128)}】`,
    `出生参数（保存的原始输入；sex:0男/1女；未记录字段不补造）：${JSON.stringify(birth)}`,
    Object.keys(recorded).length ? `排盘中的基本信息：${JSON.stringify(recorded)}` : '',
  ].filter(Boolean).join('\n');
}

export function formatSelectedAgentContext(input: { caseIds: string[]; sessionIds: string[]; cases: CaseReference[]; sessions: SessionReference[] }) {
  const caseMap = new Map(input.cases.map((item) => [item.id, item]));
  const sessionMap = new Map(input.sessions.map((item) => [item.id, item]));
  const manifest: string[] = [];
  const details: { header: string; content: string; tool: string }[] = [];
  for (const id of uniqueIds(input.caseIds)) {
    const item = caseMap.get(id);
    if (!item) { manifest.push(`【引用命例 caseId=${short(id, 128)}】未找到当前用户可访问的记录；请说明引用未能读取，不要猜测其出生资料。`); continue; }
    manifest.push(formatAgentCaseIdentity(item));
    details.push({ header: `【命例排盘摘要｜caseId=${short(id, 128)}】`, content: item.modelType === 'bazi' ? formatBaziCompatibilityChart(record(item.chartData)) : JSON.stringify(item.chartData ?? {}), tool: 'load_case' });
  }
  for (const id of uniqueIds(input.sessionIds)) {
    const item = sessionMap.get(id);
    if (!item) { manifest.push(`【引用会话 sessionId=${short(id, 128)}】未找到当前用户可访问的记录。`); continue; }
    manifest.push(`【已引用会话｜${short(item.title)}｜sessionId=${short(id, 128)}】`);
    details.push({ header: `【会话摘录｜sessionId=${short(id, 128)}】`, content: item.messages.map((message) => `${message.role}：${message.content}`).join('\n'), tool: 'load_session' });
  }
  if (!manifest.length) return '';
  const index = ['以下是本轮全部引用，优先于历史回复中“未提供/缺少资料”的判断。排盘摘要被节选不代表命例未引用；需要完整资料时用对应 ID 调用工具。', ...manifest].join('\n\n');
  const available = MAX_SELECTED_CONTEXT_TEXT - index.length - details.length * 2;
  const perDetail = details.length ? Math.floor(available / details.length) : 0;
  const blocks = details.map(({ header, content, tool }) => {
    const suffix = `\n【内容已节选，完整记录可用 ${tool} 读取；合盘请用两位已引用命例的 caseId 调用 bazi_compatibility。】`;
    const budget = Math.max(0, perDetail - header.length - 1);
    return `${header}\n${content.length <= budget ? content : content.slice(0, Math.max(0, budget - suffix.length)) + suffix}`;
  });
  return [index, ...blocks].join('\n\n');
}
