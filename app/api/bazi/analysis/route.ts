import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '../../../../lib/auth';
import { DEFAULT_ANALYSIS_MODEL, resolveChatModel } from '../../../../lib/analysis-models';
import { prisma } from '../../../../lib/prisma';
import {
  attachWuxingCalibration,
  extractWuxingCalibrationFromContent,
  getStoredWuxingCalibration,
} from '../../../../lib/bazi-wuxing-calibration';
import {
  buildBaziBasicAnalysisSystemPrompt,
  buildBaziBasicAnalysisUserPrompt,
  type BaziBasicAnalysisType,
} from '../../../../lib/bazi-basic-analysis-prompts';

type BaziAnalysisType = BaziBasicAnalysisType;

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
    personalizationPrompt?: string;
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
      let nextInitialAnalysisData = existingInitialAnalysisData;
      if (body.type === 'wuxing' && !getStoredWuxingCalibration(existingInitialAnalysisData)) {
        nextInitialAnalysisData = attachWuxingCalibration(existingInitialAnalysisData);
        if (nextInitialAnalysisData !== existingInitialAnalysisData) {
          await prisma.divinationCase.update({
            where: { id: caseId },
            data: {
              initialAnalysisData: nextInitialAnalysisData as Prisma.InputJsonValue,
            },
          });
        }
      }
      return NextResponse.json({
        content: savedContent,
        saved: true,
        initialAnalysisData: nextInitialAnalysisData,
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
  const personalizationPrompt = typeof body.personalizationPrompt === 'string'
    ? body.personalizationPrompt.trim().slice(0, 5000)
    : '';
  const systemPrompt = buildBaziBasicAnalysisSystemPrompt(body.type, personalizationPrompt);

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
        { role: 'user', content: buildBaziBasicAnalysisUserPrompt(chartText) },
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
  const nextStore: Record<string, unknown> = {
    ...store,
    [type]: {
      content,
      model: DEFAULT_ANALYSIS_MODEL,
      generatedAt,
    },
  };
  if (type === 'wuxing') {
    const calibration = extractWuxingCalibrationFromContent(content, { generatedAt });
    if (calibration) {
      nextStore.wuxingCalibration = calibration;
    } else {
      delete nextStore.wuxingCalibration;
    }
  }
  return {
    ...(root || {
      content: '',
      model: DEFAULT_ANALYSIS_MODEL,
      generatedAt,
    }),
    baziBasicAnalyses: nextStore,
  };
};
