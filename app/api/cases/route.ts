import { NextResponse } from 'next/server';
import { auth } from '../../../lib/auth';
import { backfillDivinationCases } from '../../../lib/case-migration';
import {
  buildCaseTitle,
  isCaseModelType,
  normalizeCaseChartParams,
} from '../../../lib/divination-cases';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const modelType = searchParams.get('modelType');

  if (!isCaseModelType(modelType)) {
    return NextResponse.json({ error: '无效的命例类型' }, { status: 400 });
  }

  await backfillDivinationCases(session.user.id);

  const cases = await prisma.divinationCase.findMany({
    where: {
      userId: session.user.id,
      modelType,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      modelType: true,
      title: true,
      chartParams: true,
      chartData: true,
      klineData: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(cases);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();
  const modelType = body.modelType;
  const chartParams = normalizeCaseChartParams(body.chartParams);
  const chartData = body.chartData;
  const klineData = body.klineData ?? null;
  const title = typeof body.title === 'string' ? body.title.trim() : '';

  if (!isCaseModelType(modelType) || !chartData) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
  }

  const created = await prisma.divinationCase.create({
    data: {
      userId: session.user.id,
      modelType,
      title: title || buildCaseTitle(modelType, chartParams),
      chartParams,
      chartData,
      klineData,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
