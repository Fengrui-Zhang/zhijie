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
