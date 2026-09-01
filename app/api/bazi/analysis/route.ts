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
import { friendlyChatError, isTimeoutLike } from '../../../../lib/chat-errors';
import { EMPTY_MODEL_CONTENT_MESSAGE, hasUsableAssistantContent } from '../../../../lib/deepseek-response';

export const runtime = 'nodejs';
export const maxDuration = 180;

const PROVIDER_TIMEOUT_MS = 150_000;
const MAX_OUTPUT_TOKENS = 8_192;

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

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY is missing.' }, { status: 500 });
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const personalizationPrompt = typeof body.personalizationPrompt === 'string'
    ? body.personalizationPrompt.trim().slice(0, 5000)
    : '';
  const systemPrompt = buildBaziBasicAnalysisSystemPrompt(body.type, personalizationPrompt);
  const reserved = await prisma.user.updateMany({
    where: { id: userId, quota: { gt: 0 } },
    data: { quota: { decrement: 1 } },
  });
  if (reserved.count !== 1) {
    return NextResponse.json({ error: '您的提问额度已用完' }, { status: 403 });
  }

  let refunded = false;
  const refundOnce = async () => {
    if (refunded) return;
    refunded = true;
    await prisma.user.update({ where: { id: userId }, data: { quota: { increment: 1 } } });
  };
  const requestStartedAt = Date.now();

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolveChatModel(undefined),
        temperature: 0.7,
        max_tokens: MAX_OUTPUT_TOKENS,
        thinking: { type: 'disabled' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildBaziBasicAnalysisUserPrompt(chartText) },
        ],
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!response.ok) {
      const providerMessage = extractErrorMessage(await response.text());
      await refundOnce();
      console.warn('[bazi-analysis] provider_rejected', {
        type: body.type,
        status: response.status,
        durationMs: Date.now() - requestStartedAt,
        message: (providerMessage || 'unknown').slice(0, 300),
      });
      return NextResponse.json(
        { error: providerMessage || '模型服务请求失败，本次不会扣除点数，请稍后重试' },
        { status: response.status },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    if (!hasUsableAssistantContent(content)) {
      await refundOnce();
      console.warn('[bazi-analysis] empty_content', {
        type: body.type,
        reasoningChars: String(data.choices?.[0]?.message?.reasoning_content || '').length,
        finishReason: String(data.choices?.[0]?.finish_reason || 'unknown'),
        durationMs: Date.now() - requestStartedAt,
      });
      return NextResponse.json({ error: EMPTY_MODEL_CONTENT_MESSAGE }, { status: 502 });
    }

    let nextInitialAnalysisData: unknown = existingInitialAnalysisData;
    if (caseId) {
      nextInitialAnalysisData = buildNextInitialAnalysisData(existingInitialAnalysisData, body.type, content);
      await prisma.divinationCase.update({
        where: { id: caseId },
        data: { initialAnalysisData: nextInitialAnalysisData as Prisma.InputJsonValue },
      });
    }

    console.info('[bazi-analysis] completed', {
      type: body.type,
      contentChars: content.length,
      durationMs: Date.now() - requestStartedAt,
    });
    return NextResponse.json({ content, initialAnalysisData: nextInitialAnalysisData });
  } catch (error) {
    await refundOnce();
    console.warn('[bazi-analysis] failed', {
      type: body.type,
      timeout: isTimeoutLike(error),
      durationMs: Date.now() - requestStartedAt,
    });
    const message = isTimeoutLike(error)
      ? '八字分析时间较长，本次已超时且不会扣除点数，请稍后重试。'
      : friendlyChatError(error, '八字分析失败，本次不会扣除点数，请稍后重试。');
    return NextResponse.json({ error: message }, { status: isTimeoutLike(error) ? 504 : 502 });
  }
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
