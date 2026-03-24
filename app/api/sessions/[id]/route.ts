import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
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

  const divSession = await prisma.divinationSession.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!divSession) {
    return NextResponse.json({ error: '会话不存在' }, { status: 404 });
  }

  return NextResponse.json(divSession);
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

  const divSession = await prisma.divinationSession.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!divSession) {
    return NextResponse.json({ error: '会话不存在' }, { status: 404 });
  }

  await prisma.divinationSession.delete({ where: { id } });

  return NextResponse.json({ ok: true });
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

  const divSession = await prisma.divinationSession.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!divSession) {
    return NextResponse.json({ error: '会话不存在' }, { status: 404 });
  }

  const body = await request.json();
  const title = typeof body.title === 'string' ? body.title.trim() : undefined;
  const chartParams =
    body.chartParams && typeof body.chartParams === 'object' ? body.chartParams : undefined;

  const updated = await prisma.divinationSession.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(chartParams !== undefined ? { chartParams } : {}),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
