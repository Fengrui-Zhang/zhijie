import { NextResponse } from 'next/server';
import { auth } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { getRetentionCutoff } from '../../../lib/session-retention';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const cutoff = getRetentionCutoff();
  const sessions = await prisma.divinationSession.findMany({
    where: {
      userId: session.user.id,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      modelType: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { modelType, title, chartParams, chartData } = await request.json();

  if (!modelType || !chartData) {
    return NextResponse.json(
      { error: '缺少必填字段' },
      { status: 400 }
    );
  }

  const created = await prisma.divinationSession.create({
    data: {
      userId: session.user.id,
      modelType,
      title: title || `${modelType} - ${new Date().toLocaleDateString('zh-CN')}`,
      chartParams: chartParams || {},
      chartData,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
