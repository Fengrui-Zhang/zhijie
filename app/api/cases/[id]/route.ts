import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '../../../../lib/auth';
import { backfillDivinationCases } from '../../../../lib/case-migration';
import {
  buildCaseTitle,
  isCaseModelType,
  normalizeCaseChartParams,
} from '../../../../lib/divination-cases';
import {
  BAZI_COMPATIBILITY_SESSION_TYPE,
  getBaziCompatibilityCaseIds,
} from '../../../../lib/professional-features';
import { prisma } from '../../../../lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  await backfillDivinationCases(session.user.id);
  const { id } = await params;

  const divinationCase = await prisma.divinationCase.findFirst({
    where: { id, userId: session.user.id },
    include: {
      sessions: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          modelType: true,
          title: true,
          caseId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      relationLinksA: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          caseAId: true,
          caseBId: true,
          labelAToB: true,
          labelBToA: true,
          createdAt: true,
          updatedAt: true,
          caseA: { select: { title: true } },
          caseB: { select: { title: true } },
        },
      },
      relationLinksB: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          caseAId: true,
          caseBId: true,
          labelAToB: true,
          labelBToA: true,
          createdAt: true,
          updatedAt: true,
          caseA: { select: { title: true } },
          caseB: { select: { title: true } },
        },
      },
    },
  });

  if (!divinationCase) {
    return NextResponse.json({ error: '命例不存在' }, { status: 404 });
  }

  const linkedCompatibilitySessions = await prisma.divinationSession.findMany({
    where: {
      userId: session.user.id,
      modelType: BAZI_COMPATIBILITY_SESSION_TYPE,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      modelType: true,
      title: true,
      caseId: true,
      createdAt: true,
      updatedAt: true,
      chartParams: true,
    },
  });

  const mergedSessions = [
    ...divinationCase.sessions,
    ...linkedCompatibilitySessions.filter((item) => {
      const compatibilityCaseIds = getBaziCompatibilityCaseIds(item.chartParams);
      return compatibilityCaseIds?.caseAId === id || compatibilityCaseIds?.caseBId === id;
    }).map((item) => ({
      id: item.id,
      modelType: item.modelType,
      title: item.title,
      caseId: item.caseId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  ]
    .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const relations = [...divinationCase.relationLinksA, ...divinationCase.relationLinksB].map((relation) => ({
    id: relation.id,
    caseAId: relation.caseAId,
    caseBId: relation.caseBId,
    labelAToB: relation.labelAToB,
    labelBToA: relation.labelBToA,
    caseATitle: relation.caseA.title,
    caseBTitle: relation.caseB.title,
    createdAt: relation.createdAt.toISOString(),
    updatedAt: relation.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    ...divinationCase,
    sessions: mergedSessions,
    relations,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  await backfillDivinationCases(session.user.id);
  const { id } = await params;
  const existing = await prisma.divinationCase.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      modelType: true,
      chartParams: true,
      chartData: true,
      klineData: true,
      initialAnalysisData: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: '命例不存在' }, { status: 404 });
  }

  const body = await request.json();
  const hasChartParams = body.chartParams !== undefined;
  const chartParams = hasChartParams
    ? normalizeCaseChartParams(body.chartParams)
    : existing.chartParams;
  const hasChartData = body.chartData !== undefined;
  const chartData = hasChartData ? body.chartData : existing.chartData;
  const hasKlineData = body.klineData !== undefined;
  const klineData = hasKlineData ? body.klineData : existing.klineData;
  const hasInitialAnalysisData = body.initialAnalysisData !== undefined;
  const initialAnalysisData = hasInitialAnalysisData
    ? body.initialAnalysisData
    : existing.initialAnalysisData;
  const title = typeof body.title === 'string' ? body.title.trim() : '';

  if (!chartData) {
    return NextResponse.json({ error: '缺少排盘数据' }, { status: 400 });
  }

  if (!isCaseModelType(existing.modelType)) {
    return NextResponse.json({ error: '无效的命例类型' }, { status: 400 });
  }

  const updated = await prisma.divinationCase.update({
    where: { id },
    data: {
      title: title || buildCaseTitle(existing.modelType, chartParams),
      chartParams: chartParams as Prisma.InputJsonValue,
      chartData,
      klineData,
      initialAnalysisData,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  await backfillDivinationCases(session.user.id);
  const { id } = await params;

  const existing = await prisma.divinationCase.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: '命例不存在' }, { status: 404 });
  }

  await prisma.divinationCase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
