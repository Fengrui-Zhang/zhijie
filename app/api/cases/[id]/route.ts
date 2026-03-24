import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import {
  buildCaseTitle,
  isCaseModelType,
  normalizeCaseChartParams,
} from '../../../../lib/divination-cases';
import { prisma } from '../../../../lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

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
    },
  });

  if (!divinationCase) {
    return NextResponse.json({ error: '命例不存在' }, { status: 404 });
  }

  return NextResponse.json(divinationCase);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.divinationCase.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, modelType: true, chartParams: true, chartData: true, klineData: true },
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
      chartParams,
      chartData,
      klineData,
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
