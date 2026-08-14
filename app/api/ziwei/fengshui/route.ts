import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { resolveChatModel } from '../../../../lib/analysis-models';
import { friendlyChatError, isTimeoutLike } from '../../../../lib/chat-errors';
import { prisma } from '../../../../lib/prisma';
import {
  ZIWEI_FENGSHUI_LAYERS,
  ZIWEI_FENGSHUI_PROMPT_VERSION,
  resolveZiweiFengshuiPeriod,
  validateZiweiFengshuiGeneration,
  type ZiweiFengshuiLayer,
  type ZiweiFengshuiPeriod,
} from '../../../../lib/ziwei-fengshui';
import {
  buildZiweiFengshuiChartContext,
  buildZiweiFengshuiPrompt,
} from '../../../../lib/ziwei-fengshui-prompt';
import type { ZiweiResponse } from '../../../../types';

export const runtime = 'nodejs';
export const maxDuration = 180;

const PROVIDER_TIMEOUT_MS = 150_000;
const PENDING_TTL_MS = 5 * 60_000;

const shanghaiYear = () => Number(new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
}).format(new Date()));

const parseLayer = (value: unknown): ZiweiFengshuiLayer => {
  const layer = String(value || 'natal') as ZiweiFengshuiLayer;
  if (!ZIWEI_FENGSHUI_LAYERS.includes(layer)) throw new Error('紫微风水时间层无效');
  return layer;
};

const chartFingerprint = (chartData: unknown) => {
  const record = chartData && typeof chartData === 'object' ? chartData as Record<string, unknown> : {};
  return createHash('sha256')
    .update(JSON.stringify({ calcInput: record.calcInput || null, taibuJson: record.taibuJson || null }))
    .digest('hex');
};

const parseProviderError = (input: string) => {
  try {
    const parsed = JSON.parse(input) as { error?: string | { message?: string }; message?: string };
    if (typeof parsed.error === 'string') return parsed.error;
    if (parsed.error && typeof parsed.error === 'object' && typeof parsed.error.message === 'string') return parsed.error.message;
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // The provider may return plain text.
  }
  return input.trim();
};

const parseModelJson = (content: string) => {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(trimmed) as unknown;
};

async function readOwnedCase(userId: string, caseId: string) {
  const divinationCase = await prisma.divinationCase.findFirst({
    where: { id: caseId, userId, modelType: 'ziwei' },
    select: { id: true, chartData: true },
  });
  if (!divinationCase) throw new Error('紫微命例不存在或无权访问');
  return divinationCase;
}

async function getQuota(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { quota: true } });
  return user?.quota ?? 0;
}

async function getAvailableRecords(userId: string, caseId: string, fingerprint: string) {
  const records = await prisma.ziweiFengshuiAnalysis.findMany({
    where: {
      userId,
      caseId,
      chartFingerprint: fingerprint,
      promptVersion: ZIWEI_FENGSHUI_PROMPT_VERSION,
      status: 'ready',
      result: { not: Prisma.DbNull },
    },
    select: { analysisLayer: true, periodKey: true, periodLabel: true, generatedAt: true },
    orderBy: { generatedAt: 'desc' },
  });
  return records.map((record) => ({
    layer: record.analysisLayer,
    periodKey: record.periodKey,
    periodLabel: record.periodLabel,
    generatedAt: record.generatedAt?.toISOString() || null,
  }));
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: '请先登录后再使用紫微风水分析' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId')?.trim() || '';
  if (!caseId) return NextResponse.json({ error: '缺少命例 ID' }, { status: 400 });

  try {
    const divinationCase = await readOwnedCase(userId, caseId);
    const chartData = divinationCase.chartData as unknown as ZiweiResponse;
    const layer = parseLayer(searchParams.get('layer'));
    const requestedKey = searchParams.get('periodKey') || (layer === 'yearly' ? String(shanghaiYear()) : null);
    const period = resolveZiweiFengshuiPeriod(chartData, layer, requestedKey);
    const fingerprint = chartFingerprint(divinationCase.chartData);
    const analysis = await prisma.ziweiFengshuiAnalysis.findFirst({
      where: {
        userId,
        caseId,
        analysisLayer: period.layer,
        periodKey: period.key,
        chartFingerprint: fingerprint,
        promptVersion: ZIWEI_FENGSHUI_PROMPT_VERSION,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const [quota, availableRecords] = await Promise.all([
      getQuota(userId),
      getAvailableRecords(userId, caseId, fingerprint),
    ]);
    if (!analysis) return NextResponse.json({ status: 'empty', period, availableRecords, quota });
    return NextResponse.json({
      status: analysis.status,
      period,
      result: analysis.result || null,
      error: analysis.status === 'failed' ? analysis.lastError : null,
      generatedAt: analysis.generatedAt?.toISOString() || null,
      updatedAt: analysis.updatedAt.toISOString(),
      availableRecords,
      quota,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '读取紫微风水分析失败' }, { status: 400 });
  }
}

type ClaimResult =
  | { kind: 'cached'; result: Prisma.JsonValue; generatedAt: Date | null }
  | { kind: 'busy' }
  | { kind: 'claimed'; id: string };

async function claimAnalysis(input: {
  userId: string;
  caseId: string;
  period: ZiweiFengshuiPeriod;
  fingerprint: string;
  force: boolean;
}): Promise<ClaimResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.ziweiFengshuiAnalysis.findFirst({
      where: {
        caseId: input.caseId,
        analysisLayer: input.period.layer,
        periodKey: input.period.key,
        chartFingerprint: input.fingerprint,
        promptVersion: ZIWEI_FENGSHUI_PROMPT_VERSION,
      },
    });
    if (existing?.status === 'ready' && existing.result && !input.force) {
      return { kind: 'cached', result: existing.result, generatedAt: existing.generatedAt };
    }
    const pendingFresh = existing?.status === 'pending' && Date.now() - existing.updatedAt.getTime() < PENDING_TTL_MS;
    if (pendingFresh) return { kind: 'busy' };

    if (existing) {
      if (existing.status === 'pending' && existing.pointReserved) {
        await tx.user.update({ where: { id: input.userId }, data: { quota: { increment: 1 } } });
      }
      const updated = await tx.ziweiFengshuiAnalysis.updateMany({
        where: { id: existing.id, updatedAt: existing.updatedAt },
        data: {
          status: 'pending',
          lastError: null,
          pointReserved: false,
          generatedAt: null,
        },
      });
      return updated.count === 1 ? { kind: 'claimed', id: existing.id } : { kind: 'busy' };
    }

    const created = await tx.ziweiFengshuiAnalysis.create({
      data: {
        userId: input.userId,
        caseId: input.caseId,
        analysisLayer: input.period.layer,
        periodKey: input.period.key,
        periodLabel: input.period.label,
        targetYear: input.period.targetYear,
        chartFingerprint: input.fingerprint,
        promptVersion: ZIWEI_FENGSHUI_PROMPT_VERSION,
        status: 'pending',
      },
    });
    return { kind: 'claimed', id: created.id };
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: '请先登录后再使用紫微风水分析' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { caseId?: unknown; layer?: unknown; periodKey?: unknown; force?: unknown };
  const unknownKeys = Object.keys(body).filter((key) => !['caseId', 'layer', 'periodKey', 'force'].includes(key));
  if (unknownKeys.length > 0) {
    return NextResponse.json({ error: `请求包含不支持的字段：${unknownKeys.join('、')}` }, { status: 400 });
  }
  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
  if (!caseId) return NextResponse.json({ error: '缺少命例 ID' }, { status: 400 });

  let divinationCase: Awaited<ReturnType<typeof readOwnedCase>>;
  let context: ReturnType<typeof buildZiweiFengshuiChartContext>;
  let period: ZiweiFengshuiPeriod;
  try {
    divinationCase = await readOwnedCase(userId, caseId);
    const chartData = divinationCase.chartData as unknown as ZiweiResponse;
    const layer = parseLayer(body.layer);
    const requestedKey = typeof body.periodKey === 'string' ? body.periodKey : (layer === 'yearly' ? String(shanghaiYear()) : null);
    period = resolveZiweiFengshuiPeriod(chartData, layer, requestedKey);
    context = buildZiweiFengshuiChartContext(chartData, period);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '紫微风水分析参数无效' }, { status: 400 });
  }

  const fingerprint = chartFingerprint(divinationCase.chartData);
  let claim: ClaimResult;
  try {
    claim = await claimAnalysis({
      userId,
      caseId,
      period,
      fingerprint,
      force: body.force === true,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '该命例的所选周期正在分析，请稍候' }, { status: 409 });
    }
    return NextResponse.json({ error: friendlyChatError(error, '创建紫微风水分析任务失败') }, { status: 500 });
  }

  if (claim.kind === 'cached') {
    return NextResponse.json({
      status: 'ready',
      result: claim.result,
      generatedAt: claim.generatedAt?.toISOString() || null,
      charged: 0,
      quota: await getQuota(userId),
    });
  }
  if (claim.kind === 'busy') {
    return NextResponse.json({ error: '该命例的所选周期正在分析，请稍候' }, { status: 409 });
  }

  const pointReserved = await prisma.$transaction(async (tx) => {
    const reserved = await tx.user.updateMany({
      where: { id: userId, quota: { gt: 0 } },
      data: { quota: { decrement: 1 } },
    });
    if (reserved.count !== 1) {
      await tx.ziweiFengshuiAnalysis.update({
        where: { id: claim.id },
        data: { status: 'failed', lastError: '您的提问额度已用完', pointReserved: false },
      });
      return false;
    }
    await tx.ziweiFengshuiAnalysis.update({
      where: { id: claim.id },
      data: { pointReserved: true },
    });
    return true;
  });
  if (!pointReserved) {
    return NextResponse.json({ error: '您的提问额度已用完' }, { status: 403 });
  }

  let refunded = false;
  const failAndRefund = async (message: string) => {
    if (!refunded) {
      refunded = true;
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { quota: { increment: 1 } } }),
        prisma.ziweiFengshuiAnalysis.update({
          where: { id: claim.id },
          data: { status: 'failed', lastError: message.slice(0, 1000), pointReserved: false },
        }),
      ]);
    }
  };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    await failAndRefund('模型服务尚未配置，本次不会扣除点数');
    return NextResponse.json({ error: '模型服务尚未配置，本次不会扣除点数' }, { status: 500 });
  }

  const prompt = buildZiweiFengshuiPrompt(context);
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolveChatModel(undefined),
        temperature: 0.35,
        max_tokens: 8192,
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch (error) {
    const message = isTimeoutLike(error)
      ? '紫微风水分析超时，本次不会扣除点数，请稍后重试。'
      : friendlyChatError(error, '模型服务连接失败，本次不会扣除点数。');
    await failAndRefund(message);
    return NextResponse.json({ error: message }, { status: isTimeoutLike(error) ? 504 : 502 });
  }

  if (!response.ok) {
    const providerMessage = parseProviderError(await response.text());
    const message = providerMessage || '模型服务请求失败，本次不会扣除点数。';
    await failAndRefund(message);
    return NextResponse.json({ error: message }, { status: response.status });
  }

  try {
    const providerData = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = providerData.choices?.[0]?.message?.content || '';
    if (!content.trim()) throw new Error('模型未返回有效内容');
    const raw = parseModelJson(content);
    const result = validateZiweiFengshuiGeneration(
      raw,
      context.palaces.map((palace) => ({ palaceName: palace.palaceName, branch: palace.branch })),
      period,
    );
    await prisma.ziweiFengshuiAnalysis.update({
      where: { id: claim.id },
      data: {
        status: 'ready',
        result: result as unknown as Prisma.InputJsonValue,
        lastError: null,
        pointReserved: false,
        generatedAt: new Date(result.generatedAt),
      },
    });
    return NextResponse.json({
      status: 'ready',
      result,
      generatedAt: result.generatedAt,
      charged: 1,
      quota: await getQuota(userId),
    });
  } catch (error) {
    const message = `模型返回格式无效，本次不会扣除点数：${error instanceof Error ? error.message : '未知错误'}`;
    await failAndRefund(message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
