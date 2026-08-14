import { Prisma } from '@prisma/client';
import { ModelType, LiuyaoMode, type BaseParams, type BaziResponse } from '../../types';
import { formatBaziCompatibilityChart } from '../bazi-compatibility';
import { buildCaseRelationPromptText } from '../case-relations';
import { buildCaseTitle, normalizeCaseChartParams, type CaseModelType } from '../divination-cases';
import { prisma } from '../prisma';
import { calculateTaibuChart } from '../taibu-chart';
import { formatKnowledgeContext, retrieveKnowledge } from '../../utils/knowledge';
import {
  AgentInputError,
  type AgentToolContext,
  type AgentToolDefinition,
  type AgentToolResult,
} from './types';
import {
  getEarthlyBranchBucket,
  getEarthlyBranchLabel,
  getShanghaiDateTime,
  getShanghaiParts,
  inferMatterKey,
  isLikelyFollowUp,
  parseAgentDateTime,
} from './time-rules';

const MAX_TOOL_TEXT = 16_000;
const TOOL_RESULT_PREVIEW = 240;
const TIME_DIVINATION_TOOLS = new Set([
  'qimen_divination',
  'meihua_divination',
  'liuyao_divination',
  'daliuren_divination',
  'taiyi_divination',
  'xiaoliuren_divination',
]);

const toJsonValue = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const stringProp = (description: string, enumValues?: string[]) => ({
  type: 'string',
  description,
  ...(enumValues ? { enum: enumValues } : {}),
});
const numberProp = (description: string, minimum?: number, maximum?: number) => ({
  type: 'integer',
  description,
  ...(minimum !== undefined ? { minimum } : {}),
  ...(maximum !== undefined ? { maximum } : {}),
});
const booleanProp = (description: string) => ({ type: 'boolean', description });

const birthProperties = {
  caseId: stringProp('已有命例 ID；已知 ID 时优先使用'),
  name: stringProp('命主姓名或命例名称'),
  sex: numberProp('性别：0 男，1 女', 0, 1),
  year: numberProp('出生年', 1900, 2100),
  month: numberProp('出生月', 1, 12),
  day: numberProp('出生日', 1, 31),
  hour: numberProp('出生小时，0-23', 0, 23),
  minute: numberProp('出生分钟，0-59', 0, 59),
  calendarType: stringProp('历法', ['solar', 'lunar']),
  isLeapMonth: booleanProp('农历是否闰月'),
  province: stringProp('出生省份，可选'),
  city: stringProp('出生城市，可选'),
};

function assertObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AgentInputError('工具参数必须是对象');
  }
  return input as Record<string, unknown>;
}

function assertAllowedKeys(input: Record<string, unknown>, allowed: string[]) {
  const extras = Object.keys(input).filter((key) => !allowed.includes(key));
  if (extras.length) throw new AgentInputError(`不支持的参数：${extras.join('、')}`);
}

function requiredString(input: Record<string, unknown>, key: string, label = key) {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new AgentInputError(`请提供${label}`, 'CLARIFICATION_REQUIRED', [key]);
  }
  return value.trim();
}

function optionalString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new AgentInputError(`${key} 必须是字符串`);
  return value.trim() || undefined;
}

function optionalInt(input: Record<string, unknown>, key: string, min: number, max: number) {
  const value = input[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new AgentInputError(`${key} 必须是 ${min}-${max} 的整数`);
  }
  return Number(value);
}

function compactText(value: unknown) {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.taibuText === 'string' && record.taibuText.trim()) return record.taibuText.trim().slice(0, MAX_TOOL_TEXT);
  }
  return JSON.stringify(value, null, 2).slice(0, MAX_TOOL_TEXT);
}

function preview(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, TOOL_RESULT_PREVIEW);
}

async function protectedCase(userId: string, caseId: string, expected?: CaseModelType) {
  const item = await prisma.divinationCase.findFirst({ where: { id: caseId, userId } });
  if (!item) throw new AgentInputError('命例不存在或无权访问', 'CASE_NOT_FOUND');
  if (expected && item.modelType !== expected) {
    throw new AgentInputError(`该命例不是${expected === ModelType.BAZI ? '八字' : '紫微'}命例`, 'CASE_TYPE_MISMATCH');
  }
  return item;
}

function birthIdentity(params: Record<string, unknown>) {
  const normalized = normalizeCaseChartParams(params);
  return [
    normalized.sex,
    normalized.year,
    normalized.month,
    normalized.day,
    normalized.hours,
    normalized.minute,
    normalized.calendarType || 'solar',
    normalized.isLeapMonth ? 1 : 0,
  ].join('|');
}

function parseBirthArgs(args: Record<string, unknown>): BaseParams {
  const required = ['sex', 'year', 'month', 'day', 'hour', 'minute'] as const;
  const missing = required.filter((key) => args[key] === undefined || args[key] === null || args[key] === '');
  if (missing.length) {
    throw new AgentInputError(
      '请补充完整的出生年月日、出生时间和性别，并说明公历或农历。',
      'CLARIFICATION_REQUIRED',
      missing.map(String),
    );
  }
  const calendarType = args.calendarType;
  if (calendarType !== 'solar' && calendarType !== 'lunar') {
    throw new AgentInputError('请说明出生日期使用公历还是农历。', 'CLARIFICATION_REQUIRED', ['calendarType']);
  }
  return {
    name: optionalString(args, 'name') || '匿名',
    sex: optionalInt(args, 'sex', 0, 1)!,
    year: optionalInt(args, 'year', 1900, 2100)!,
    month: optionalInt(args, 'month', 1, 12)!,
    day: optionalInt(args, 'day', 1, 31)!,
    hours: optionalInt(args, 'hour', 0, 23)!,
    minute: optionalInt(args, 'minute', 0, 59)!,
    calendarType,
    isLeapMonth: args.isLeapMonth === true,
    province: optionalString(args, 'province'),
    city: optionalString(args, 'city'),
  };
}

async function calculateAndSaveCase(
  modelType: CaseModelType,
  args: Record<string, unknown>,
  context: AgentToolContext,
) {
  const caseId = optionalString(args, 'caseId');
  if (caseId) return protectedCase(context.userId, caseId, modelType);
  const params = parseBirthArgs(args);
  const candidates = await prisma.divinationCase.findMany({ where: { userId: context.userId, modelType } });
  const identity = birthIdentity(params as unknown as Record<string, unknown>);
  const existing = candidates.find((item) => birthIdentity((item.chartParams || {}) as Record<string, unknown>) === identity);
  if (existing) return existing;
  const chartData = await calculateTaibuChart({ modelType, params });
  return prisma.divinationCase.create({
    data: {
      userId: context.userId,
      modelType,
      title: buildCaseTitle(modelType, params),
      chartParams: params as unknown as Prisma.InputJsonValue,
      chartData: toJsonValue(chartData),
    },
  });
}

function commonCurrentParams(date: Date, question: string): BaseParams {
  const parts = getShanghaiParts(date);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hours: parts.hour,
    minute: parts.minute,
    sex: 0,
    name: '问事人',
    question,
  } as BaseParams;
}

async function enforceTimeRule(
  toolName: string,
  question: string,
  context: AgentToolContext,
) {
  const matterKey = inferMatterKey(question);
  const timeBucketKey = getEarthlyBranchBucket(context.now);
  const previous = await prisma.agentToolRun.findFirst({
    where: {
      userId: context.userId,
      timeBucketKey,
      divinationMode: 'time',
      status: 'completed',
      turnId: { not: context.turnId },
    },
    orderBy: { startedAt: 'desc' },
  });
  if (!previous) return { matterKey, timeBucketKey };
  const sameMatter = previous.matterKey === matterKey || isLikelyFollowUp(context.userMessage);
  if (!sameMatter) {
    throw new AgentInputError(
      '同一时辰已经用时间起卦问过另一件事。连续用同一时间问多个不同问题可能影响参考价值，请为当前问题报一个正整数，我会改用梅花易数报数起卦。',
      'NUMBER_REQUIRED',
      ['number'],
    );
  }
  if (previous.toolName === toolName && previous.resultText) {
    return { matterKey, timeBucketKey, reused: previous.resultText, summary: previous.resultSummary || '复用同一时辰原盘' };
  }
  return { matterKey, timeBucketKey };
}

async function runDivination(
  toolName: string,
  modelType: ModelType,
  args: Record<string, unknown>,
  context: AgentToolContext,
): Promise<AgentToolResult> {
  const allowed = ['question', 'dateTime', 'method', 'number', 'numberUp', 'numberDown', 'birthYear', 'sex'];
  assertAllowedKeys(args, allowed);
  const question = requiredString(args, 'question', '要占问的具体问题');
  const method = optionalString(args, 'method') || 'time';
  if (!['time', 'number', 'manual'].includes(method)) throw new AgentInputError('不支持的起卦方式');
  if (method !== 'time' && modelType !== ModelType.MEIHUA && modelType !== ModelType.LIUYAO) {
    throw new AgentInputError(`${toolLabel(toolName)}当前只支持时间起局`, 'INVALID_DIVINATION_METHOD');
  }
  const date = parseAgentDateTime(args.dateTime, context.now);
  let matterKey = inferMatterKey(question);
  let timeBucketKey: string | undefined;
  if (method === 'time' && TIME_DIVINATION_TOOLS.has(toolName)) {
    const timeRule = await enforceTimeRule(toolName, question, context);
    matterKey = timeRule.matterKey;
    timeBucketKey = timeRule.timeBucketKey;
    if (timeRule.reused) {
      return {
        summary: timeRule.summary,
        content: timeRule.reused,
        detail: '同一事项、同一时辰，已复用原盘。',
        matterKey,
        timeBucketKey,
        divinationMode: 'time',
      };
    }
  }

  const params = commonCurrentParams(date, question);
  params.born_year = optionalInt(args, 'birthYear', 1900, 2100);
  params.sex = optionalInt(args, 'sex', 0, 1) ?? 0;
  if (modelType === ModelType.MEIHUA || modelType === ModelType.LIUYAO) {
    if (method === 'number') {
      const number = optionalInt(args, 'number', 1, 999_999_999);
      const numberUp = optionalInt(args, 'numberUp', 1, 999_999_999);
      const numberDown = optionalInt(args, 'numberDown', 1, 999_999_999);
      if (!number && !(numberUp && numberDown)) {
        throw new AgentInputError('请报一个正整数；也可以提供上卦数和下卦数。', 'NUMBER_REQUIRED', ['number']);
      }
      if (numberUp && numberDown) {
        params.pan_model = LiuyaoMode.DOUBLE_NUM;
        params.number_up = numberUp;
        params.number_down = numberDown;
      } else {
        params.pan_model = LiuyaoMode.NUMBER;
        params.number = number;
      }
    } else {
      params.pan_model = LiuyaoMode.AUTO;
    }
  }
  if (modelType === ModelType.TAIYI) params.taiyi_mode = 'hour';
  const chart = await calculateTaibuChart({ modelType, params });
  const text = compactText(chart);
  return {
    summary: `${toolLabel(toolName)}排盘完成：${preview(text)}`,
    content: text,
    detail: `采用时间：${getShanghaiDateTime(date)}；起卦方式：${method === 'number' ? '报数' : method === 'manual' ? '手动' : '时间'}`,
    matterKey,
    timeBucketKey,
    divinationMode: method as 'time' | 'number' | 'manual',
    raw: chart,
  };
}

function toolLabel(name: string) {
  return TOOL_LABELS[name] || name;
}

const TOOL_LABELS: Record<string, string> = {
  get_current_time: '上海时间',
  search_cases: '命例搜索',
  load_case: '命例读取',
  load_session: '历史会话',
  search_knowledge: '知识库检索',
  bazi_analysis: '四柱八字',
  ziwei_analysis: '紫微斗数',
  joint_bazi_ziwei: '八字与紫微联合分析',
  bazi_compatibility: '八字合盘',
  daily_fortune: '每日运势',
  monthly_fortune: '每月运势',
  qimen_divination: '奇门遁甲',
  meihua_divination: '梅花易数',
  liuyao_divination: '六爻纳甲',
  daliuren_divination: '大六壬',
  taiyi_divination: '太乙神数',
  xiaoliuren_divination: '小六壬',
  almanac_day: '单日黄历',
  select_favorable_dates: '智能择日',
  read_case_analysis: '命例基线分析',
};

function lifeTool(name: string, modelType: CaseModelType): AgentToolDefinition {
  return {
    name,
    label: toolLabel(name),
    description: modelType === ModelType.BAZI
      ? '分析长期性格、格局、事业基础、财富、婚恋或人生趋势。可读取已有八字命例，或用完整出生资料自动排盘并保存。'
      : '按用户明确要求使用紫微斗数分析。可读取已有紫微命例，或用完整出生资料自动排盘并保存。',
    parameters: objectSchema(birthProperties),
    async execute(rawArgs, context) {
      const args = assertObject(rawArgs);
      assertAllowedKeys(args, Object.keys(birthProperties));
      const item = await calculateAndSaveCase(modelType, args, context);
      const text = compactText(item.chartData);
      return {
        summary: `已加载${toolLabel(name)}命例“${item.title}”：${preview(text)}`,
        content: `【命例】${item.title}\n【命例 ID】${item.id}\n${text}`,
        detail: `命例：${item.title}`,
        divinationMode: 'case',
        raw: item.chartData,
      };
    },
  };
}

function divinationTool(name: string, modelType: ModelType, description: string): AgentToolDefinition {
  return {
    name,
    label: toolLabel(name),
    description,
    parameters: objectSchema({
      question: stringProp('单一、明确的占问事项'),
      dateTime: stringProp('ISO 日期时间；不填时使用当前上海时间'),
      method: stringProp('起卦方式', ['time', 'number']),
      number: numberProp('报数起卦的正整数', 1, 999_999_999),
      numberUp: numberProp('双数起卦的上卦数', 1, 999_999_999),
      numberDown: numberProp('双数起卦的下卦数', 1, 999_999_999),
      birthYear: numberProp('问事人出生年，可选', 1900, 2100),
      sex: numberProp('问事人性别：0 男，1 女，可选', 0, 1),
    }, ['question']),
    execute: (args, context) => runDivination(name, modelType, assertObject(args), context),
  };
}

async function fortuneTool(args: Record<string, unknown>, context: AgentToolContext, modelType: ModelType) {
  assertAllowedKeys(args, ['caseId', 'targetDate']);
  const caseId = requiredString(args, 'caseId', '八字命例 ID');
  const item = await protectedCase(context.userId, caseId, ModelType.BAZI);
  const params = normalizeCaseChartParams(item.chartParams);
  const target = parseAgentDateTime(optionalString(args, 'targetDate'), context.now);
  const targetParts = getShanghaiParts(target);
  const chart = await calculateTaibuChart({
    modelType,
    params: {
      ...(params as BaseParams),
      targetYear: targetParts.year,
      targetMonth: targetParts.month,
      targetDay: targetParts.day,
    },
  });
  const text = compactText(chart);
  return {
    summary: `${toolLabel(modelType === ModelType.DAILY_FORTUNE ? 'daily_fortune' : 'monthly_fortune')}生成完成：${preview(text)}`,
    content: text,
    detail: `命例：${item.title}`,
    divinationMode: 'case' as const,
    raw: chart,
  };
}

export function buildAgentTools(options: { knowledgeEnabled: boolean }): AgentToolDefinition[] {
  const tools: AgentToolDefinition[] = [
    {
      name: 'get_current_time',
      label: toolLabel('get_current_time'),
      description: '获取当前上海时间和地支时辰。需要判断当前时间、起卦时刻时使用。',
      parameters: objectSchema({}),
      async execute(args, context) {
        assertAllowedKeys(assertObject(args), []);
        const dateTime = getShanghaiDateTime(context.now);
        const branchLabel = getEarthlyBranchLabel(context.now);
        return {
          summary: `当前上海时间：${dateTime}，${branchLabel}`,
          content: `${dateTime}\n时辰：${branchLabel}`,
          detail: branchLabel,
          divinationMode: 'date',
        };
      },
    },
    {
      name: 'search_cases',
      label: toolLabel('search_cases'),
      description: '按用户提供的姓名或名称搜索其命例库。用户说“命例库里的某某”时必须先用此工具。',
      parameters: objectSchema({ query: stringProp('姓名或命例名称'), modelType: stringProp('可选术数类型', ['bazi', 'ziwei']) }, ['query']),
      async execute(rawArgs, context) {
        const args = assertObject(rawArgs);
        assertAllowedKeys(args, ['query', 'modelType']);
        const query = requiredString(args, 'query', '命例名称');
        const modelType = optionalString(args, 'modelType');
        const cases = await prisma.divinationCase.findMany({
          where: {
            userId: context.userId,
            ...(modelType ? { modelType } : {}),
            title: { contains: query, mode: 'insensitive' },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        });
        const rows = cases.map((item) => {
          const params = normalizeCaseChartParams(item.chartParams);
          return { id: item.id, title: item.title, modelType: item.modelType, birth: `${params.year || '?'}-${params.month || '?'}-${params.day || '?'} ${params.hours ?? '?'}:${params.minute ?? '?'}` };
        });
        return {
          summary: rows.length === 0 ? `未找到“${query}”相关命例` : `找到 ${rows.length} 个相关命例`,
          content: JSON.stringify(rows),
          detail: rows.map((row) => `${row.title} · ${row.modelType} · ${row.birth}`).join('\n'),
          divinationMode: 'case',
          raw: rows,
        };
      },
    },
    {
      name: 'load_case',
      label: toolLabel('load_case'),
      description: '读取当前用户一个已知 ID 的八字或紫微命例及已有基线分析。',
      parameters: objectSchema({ caseId: stringProp('命例 ID') }, ['caseId']),
      async execute(rawArgs, context) {
        const args = assertObject(rawArgs);
        assertAllowedKeys(args, ['caseId']);
        const item = await protectedCase(context.userId, requiredString(args, 'caseId', '命例 ID'));
        const text = compactText(item.chartData);
        const baseline = item.initialAnalysisData && typeof item.initialAnalysisData === 'object'
          ? String((item.initialAnalysisData as Record<string, unknown>).content || '').slice(0, 4_000)
          : '';
        return { summary: `已读取命例“${item.title}”`, content: `【${item.title}｜${item.modelType}】\n${text}${baseline ? `\n【基线分析】\n${baseline}` : ''}`, detail: item.title, divinationMode: 'case' };
      },
    },
    {
      name: 'load_session',
      label: toolLabel('load_session'),
      description: '读取当前用户一个已知 ID 的历史会话。',
      parameters: objectSchema({ sessionId: stringProp('历史会话 ID') }, ['sessionId']),
      async execute(rawArgs, context) {
        const args = assertObject(rawArgs);
        assertAllowedKeys(args, ['sessionId']);
        const item = await prisma.divinationSession.findFirst({
          where: { id: requiredString(args, 'sessionId', '会话 ID'), userId: context.userId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 30 } },
        });
        if (!item) throw new AgentInputError('历史会话不存在或无权访问', 'SESSION_NOT_FOUND');
        const text = item.messages.map((message) => `${message.role}：${message.content}`).join('\n').slice(0, MAX_TOOL_TEXT);
        return { summary: `已读取历史会话“${item.title}”`, content: text, detail: item.title };
      },
    },
    lifeTool('bazi_analysis', ModelType.BAZI),
    lifeTool('ziwei_analysis', ModelType.ZIWEI),
    {
      name: 'joint_bazi_ziwei',
      label: toolLabel('joint_bazi_ziwei'),
      description: '对同一人的八字和紫微命盘做联合分析。需要两个已有命例 ID，或完整出生资料。',
      parameters: objectSchema({ ...birthProperties, baziCaseId: stringProp('八字命例 ID'), ziweiCaseId: stringProp('紫微命例 ID') }),
      async execute(rawArgs, context) {
        const args = assertObject(rawArgs);
        assertAllowedKeys(args, [...Object.keys(birthProperties), 'baziCaseId', 'ziweiCaseId']);
        const baziArgs = { ...args, caseId: optionalString(args, 'baziCaseId') || optionalString(args, 'caseId') };
        const ziweiArgs = { ...args, caseId: optionalString(args, 'ziweiCaseId') };
        const [bazi, ziwei] = await Promise.all([
          calculateAndSaveCase(ModelType.BAZI, baziArgs, context),
          calculateAndSaveCase(ModelType.ZIWEI, ziweiArgs, context),
        ]);
        const content = `【八字｜${bazi.title}】\n${compactText(bazi.chartData)}\n\n【紫微｜${ziwei.title}】\n${compactText(ziwei.chartData)}`.slice(0, MAX_TOOL_TEXT);
        return { summary: `已加载“${bazi.title}”的八字与紫微命盘`, content, detail: `八字 ${bazi.id}；紫微 ${ziwei.id}`, divinationMode: 'case' };
      },
    },
    {
      name: 'bazi_compatibility',
      label: toolLabel('bazi_compatibility'),
      description: '比较两个人的八字关系、相处模式和婚恋合作适配。需要两个八字命例 ID。',
      parameters: objectSchema({ caseAId: stringProp('甲方八字命例 ID'), caseBId: stringProp('乙方八字命例 ID'), relationship: stringProp('关系说明，可选') }, ['caseAId', 'caseBId']),
      async execute(rawArgs, context) {
        const args = assertObject(rawArgs);
        assertAllowedKeys(args, ['caseAId', 'caseBId', 'relationship']);
        const caseAId = requiredString(args, 'caseAId');
        const caseBId = requiredString(args, 'caseBId');
        if (caseAId === caseBId) throw new AgentInputError('合盘需要两个不同的八字命例');
        const [a, b, storedRelations] = await Promise.all([
          protectedCase(context.userId, caseAId, ModelType.BAZI),
          protectedCase(context.userId, caseBId, ModelType.BAZI),
          prisma.caseRelation.findMany({
            where: {
              userId: context.userId,
              OR: [
                { caseAId, caseBId },
                { caseAId: caseBId, caseBId: caseAId },
              ],
            },
            orderBy: { updatedAt: 'desc' },
          }),
        ]);
        const aText = formatBaziCompatibilityChart(a.chartData as unknown as BaziResponse);
        const bText = formatBaziCompatibilityChart(b.chartData as unknown as BaziResponse);
        const storedRelationText = buildCaseRelationPromptText(
          storedRelations.map((relation) => relation.caseAId === caseAId
            ? { labelAToB: relation.labelAToB, labelBToA: relation.labelBToA }
            : { labelAToB: relation.labelBToA, labelBToA: relation.labelAToB }),
          a.title,
          b.title,
        );
        const explicitRelationship = optionalString(args, 'relationship');
        const relationshipText = [
          storedRelationText ? `命例库已保存标签：${storedRelationText}` : '',
          explicitRelationship ? `用户本次说明：${explicitRelationship}` : '',
        ].filter(Boolean).join('；') || '未说明';
        return {
          summary: `已加载“${a.title}”与“${b.title}”的八字合盘资料`,
          content: `【关系】${relationshipText}\n【甲方 ${a.title}】\n${aText}\n\n【乙方 ${b.title}】\n${bText}`,
          detail: `${a.title} × ${b.title}`,
          divinationMode: 'case',
        };
      },
    },
    {
      name: 'daily_fortune', label: toolLabel('daily_fortune'), description: '基于八字命例分析指定日期的每日运势。',
      parameters: objectSchema({ caseId: stringProp('八字命例 ID'), targetDate: stringProp('ISO 日期') }, ['caseId']),
      execute: (args, context) => fortuneTool(assertObject(args), context, ModelType.DAILY_FORTUNE),
    },
    {
      name: 'monthly_fortune', label: toolLabel('monthly_fortune'), description: '基于八字命例分析指定月份的月运。',
      parameters: objectSchema({ caseId: stringProp('八字命例 ID'), targetDate: stringProp('该月任意 ISO 日期') }, ['caseId']),
      execute: (args, context) => fortuneTool(assertObject(args), context, ModelType.MONTHLY_FORTUNE),
    },
    divinationTool('qimen_divination', ModelType.QIMEN, '具体事件、工作调动、决策、方位和时机判断。默认使用当前时间起局。'),
    divinationTool('meihua_divination', ModelType.MEIHUA, '具体事件预测；同一时辰多问时默认要求用户报数后使用。'),
    divinationTool('liuyao_divination', ModelType.LIUYAO, '用户明确指定六爻，或适合判断单一具体事件、成败和应期时使用。'),
    divinationTool('daliuren_divination', ModelType.DALIUREN, '具体人事事件、工作、出行和复杂关系预测。默认使用当前时间起课。'),
    divinationTool('taiyi_divination', ModelType.TAIYI, '用户明确指定太乙，或宏观趋势和时局问题时使用。'),
    divinationTool('xiaoliuren_divination', ModelType.XIAOLIUREN, '用户明确指定小六壬或需要快速判断短期事件时使用。'),
    {
      name: 'almanac_day', label: toolLabel('almanac_day'), description: '查询指定日期的黄历宜忌、神煞和吉时。',
      parameters: objectSchema({ date: stringProp('YYYY-MM-DD'), birthYear: numberProp('命主出生年，可选', 1900, 2100) }, ['date']),
      async execute(rawArgs) {
        const args = assertObject(rawArgs);
        assertAllowedKeys(args, ['date', 'birthYear']);
        const date = parseAgentDateTime(`${requiredString(args, 'date')}T12:00:00+08:00`);
        const params = commonCurrentParams(date, '查询黄历');
        params.born_year = optionalInt(args, 'birthYear', 1900, 2100);
        const chart = await calculateTaibuChart({ modelType: ModelType.ALMANAC, params });
        const text = compactText(chart);
        return { summary: `黄历查询完成：${preview(text)}`, content: text, detail: requiredString(args, 'date'), divinationMode: 'date', raw: chart };
      },
    },
    {
      name: 'select_favorable_dates', label: toolLabel('select_favorable_dates'), description: '在一个日期范围内为结婚、搬家、开业、签约、出行等事项筛选吉日。最终由 AI 基于候选黄历综合选择。',
      parameters: objectSchema({ matter: stringProp('择日事项'), startDate: stringProp('YYYY-MM-DD'), endDate: stringProp('YYYY-MM-DD'), caseId: stringProp('可选八字命例 ID') }, ['matter', 'startDate', 'endDate']),
      async execute(rawArgs, context) {
        const args = assertObject(rawArgs);
        assertAllowedKeys(args, ['matter', 'startDate', 'endDate', 'caseId']);
        const matter = requiredString(args, 'matter', '择日事项');
        const start = parseAgentDateTime(`${requiredString(args, 'startDate')}T12:00:00+08:00`);
        const end = parseAgentDateTime(`${requiredString(args, 'endDate')}T12:00:00+08:00`);
        const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
        if (days < 1 || days > 60) throw new AgentInputError('择日范围必须为 1 至 60 天');
        let birthYear: number | undefined;
        const caseId = optionalString(args, 'caseId');
        if (caseId) {
          const item = await protectedCase(context.userId, caseId, ModelType.BAZI);
          birthYear = normalizeCaseChartParams(item.chartParams).year;
        }
        const charts = await Promise.all(Array.from({ length: days }, async (_, index) => {
          const date = new Date(start.getTime() + index * 86_400_000);
          const params = commonCurrentParams(date, matter);
          params.born_year = birthYear;
          const chart = await calculateTaibuChart({ modelType: ModelType.ALMANAC, params });
          return { date: getShanghaiDateTime(date).slice(0, 10), chart };
        }));
        const content = charts.map((item) => `【${item.date}】\n${compactText(item.chart)}`).join('\n\n').slice(0, MAX_TOOL_TEXT);
        return { summary: `已生成 ${days} 天候选黄历，请从中综合筛选`, content, detail: `${matter} · ${days}天`, divinationMode: 'date', raw: charts };
      },
    },
    {
      name: 'read_case_analysis', label: toolLabel('read_case_analysis'), description: '读取命例已有的初始化分析和五行校准结果。',
      parameters: objectSchema({ caseId: stringProp('命例 ID') }, ['caseId']),
      async execute(rawArgs, context) {
        const args = assertObject(rawArgs);
        assertAllowedKeys(args, ['caseId']);
        const item = await protectedCase(context.userId, requiredString(args, 'caseId'));
        const content = JSON.stringify(item.initialAnalysisData || {}).slice(0, MAX_TOOL_TEXT);
        return { summary: item.initialAnalysisData ? `已读取“${item.title}”的基线分析` : `“${item.title}”尚无基线分析`, content, detail: item.title, divinationMode: 'case' };
      },
    },
  ];

  if (options.knowledgeEnabled) {
    tools.splice(5, 0, {
      name: 'search_knowledge',
      label: toolLabel('search_knowledge'),
      description: '检索站内命理知识库，为术语、古籍依据和盘面解释提供参考。不能代替排盘。',
      parameters: objectSchema({ query: stringProp('检索问题'), board: stringProp('知识板块', ['bazi', 'qimen']), topK: numberProp('返回条数', 1, 8) }, ['query']),
      async execute(rawArgs) {
        const args = assertObject(rawArgs);
        assertAllowedKeys(args, ['query', 'board', 'topK']);
        const query = requiredString(args, 'query');
        const chunks = await retrieveKnowledge(optionalString(args, 'board') || 'bazi', query, optionalInt(args, 'topK', 1, 8) || 5, false);
        const content = formatKnowledgeContext(chunks).slice(0, MAX_TOOL_TEXT);
        return { summary: chunks.length ? `检索到 ${chunks.length} 条知识资料` : '未检索到相关知识资料', content, detail: query, raw: chunks };
      },
    });
  }
  return tools;
}

export function toDeepSeekTools(tools: AgentToolDefinition[]) {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function getAgentToolLabel(name: string) {
  return toolLabel(name);
}
