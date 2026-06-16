import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '../../../../lib/auth';
import { DEFAULT_ANALYSIS_MODEL, resolveChatModel } from '../../../../lib/analysis-models';
import { prisma } from '../../../../lib/prisma';

type BaziAnalysisType = 'wuxing' | 'personality';

const WUXING_PROMPT = `你是一位专业的命理分析师，擅长八字五行分析。请根据用户提供的八字信息，进行专业的五行分析。

分析要求：
1. 分析五行的整体配置和平衡状态
2. 判断五行的强弱对比，结合日主在月令的十二长生状态（长生、帝旺为旺，病、死、绝为衰）
3. 确定喜用神和忌神
4. 分析地支关系（三合局、六合、六冲）对五行的影响：
   - 三合局（申子辰水、亥卯未木、寅午戌火、巳酉丑金）力量最强
   - 六合可增强相关五行
   - 六冲主动荡变化
5. 给出五行调理建议（颜色、方位、职业等）
6. 分析五行对性格和命运的影响

输出格式：
- 使用清晰的段落结构
- 每个要点单独成段
- 语言专业但通俗易懂
- 总字数控制在500-800字`;

const PERSONALITY_PROMPT = `你是一位专业的命理分析师，擅长通过八字分析人格特征。请根据用户提供的八字信息，进行深度人格分析。

分析要求：
1. 分析核心性格特征（3-5个主要特质），结合日主十二长生状态：
   - 长生、帝旺：有冲劲、主动积极
   - 沐浴、冠带：注重外表、追求进步
   - 衰、病、死：内敛稳重、深思熟虑
   - 墓、绝、胎、养：潜力待发、厚积薄发
2. 分析优势与潜质
3. 分析需要注意的性格盲点
4. 结合地支关系分析人际关系：
   - 三合局主团结协作
   - 六合主亲和人缘
   - 六冲主性格冲突或变动
5. 分析适合的发展方向

输出格式：
- 使用清晰的段落结构
- 每个特质单独成段并有具体说明
- 语言温暖亲切，富有洞察力
- 总字数控制在500-800字`;

const VISUAL_RESPONSE_INSTRUCTION = [
  '当分析适合用图示总结时，可在自然语言结论之后附加一个 fenced code block，语言标记使用 chart-json。',
  'chart-json 必须是严格 JSON，支持 chartType：wuxing_energy、fortune_radar、life_timeline、fortune_trend。',
  '五行分析优先使用 wuxing_energy；人格分析可使用 fortune_radar 或 life_timeline。',
  '不要为了图表牺牲正文判断；没有明确评分、趋势或阶段信息时不要输出图表块。',
].join('\n');

const extractErrorMessage = (input: unknown): string => {
  if (!input) return '';
  if (typeof input === 'string') {
    try {
      return extractErrorMessage(JSON.parse(input));
    } catch {
      return input.trim();
    }
  }
  if (typeof input === 'object') {
    const record = input as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  return '';
};

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再使用 AI 分析' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    type?: BaziAnalysisType;
    chartText?: string;
    caseId?: string;
    force?: boolean;
  };
  if (body.type !== 'wuxing' && body.type !== 'personality') {
    return NextResponse.json({ error: '分析类型无效' }, { status: 400 });
  }
  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
  let chartText = typeof body.chartText === 'string' ? body.chartText.trim() : '';
  let existingInitialAnalysisData: unknown = null;

  if (caseId) {
    const divinationCase = await prisma.divinationCase.findFirst({
      where: { id: caseId, userId, modelType: 'bazi' },
      select: {
        chartData: true,
        initialAnalysisData: true,
      },
    });
    if (!divinationCase) {
      return NextResponse.json({ error: '命例不存在' }, { status: 404 });
    }

    existingInitialAnalysisData = divinationCase.initialAnalysisData;
    const savedContent = getSavedBaziAnalysis(existingInitialAnalysisData, body.type);
    if (savedContent && !body.force) {
      return NextResponse.json({
        content: savedContent,
        saved: true,
        initialAnalysisData: existingInitialAnalysisData,
      });
    }

    if (!chartText) {
      const chartData = toRecord(divinationCase.chartData);
      chartText = typeof chartData?.taibuText === 'string'
        ? chartData.taibuText.trim()
        : JSON.stringify(divinationCase.chartData ?? {}, null, 2);
    }
  }

  if (!chartText) {
    return NextResponse.json({ error: '缺少八字盘面信息' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { quota: true } });
  if (!user || user.quota <= 0) {
    return NextResponse.json({ error: '您的提问额度已用完' }, { status: 403 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY is missing.' }, { status: 500 });
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const systemPrompt = [
    body.type === 'wuxing' ? WUXING_PROMPT : PERSONALITY_PROMPT,
    VISUAL_RESPONSE_INSTRUCTION,
  ].join('\n\n');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolveChatModel(undefined),
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请分析以下八字：\n\n${chartText}` },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: extractErrorMessage(errorText) || '模型服务请求失败，请稍后重试' },
      { status: response.status },
    );
  }

  await prisma.user.update({ where: { id: userId }, data: { quota: { decrement: 1 } } });
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  let nextInitialAnalysisData: unknown = existingInitialAnalysisData;

  if (caseId && content) {
    nextInitialAnalysisData = buildNextInitialAnalysisData(existingInitialAnalysisData, body.type, content);
    await prisma.divinationCase.update({
      where: { id: caseId },
      data: {
        initialAnalysisData: nextInitialAnalysisData as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ content, initialAnalysisData: nextInitialAnalysisData });
}

const toRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const getSavedBaziAnalysis = (initialAnalysisData: unknown, type: BaziAnalysisType) => {
  const root = toRecord(initialAnalysisData);
  const store = toRecord(root?.baziBasicAnalyses);
  const item = toRecord(store?.[type]);
  const content = item?.content;
  return typeof content === 'string' && content.trim() ? content.trim() : '';
};

const buildNextInitialAnalysisData = (
  initialAnalysisData: unknown,
  type: BaziAnalysisType,
  content: string,
) => {
  const root = toRecord(initialAnalysisData);
  const generatedAt = new Date().toISOString();
  const store = toRecord(root?.baziBasicAnalyses) || {};
  return {
    ...(root || {
      content: '',
      model: DEFAULT_ANALYSIS_MODEL,
      generatedAt,
    }),
    baziBasicAnalyses: {
      ...store,
      [type]: {
        content,
        model: DEFAULT_ANALYSIS_MODEL,
        generatedAt,
      },
    },
  };
};
