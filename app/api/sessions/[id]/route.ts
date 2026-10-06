import { NextResponse } from 'next/server';
import { restoreAgentSessionContext } from '../../../../lib/agent/session-context';
import { auth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { setSessionPermanence } from '../../../../lib/session-retention';

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

  return NextResponse.json(divSession.modelType === 'chat' ? { ...divSession, chartParams: restoreAgentSessionContext(divSession.chartParams, divSession.messages) } : divSession);
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

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: '请求格式无效' }, { status: 400 });
  }
  if ('isPermanent' in body && typeof body.isPermanent !== 'boolean') {
    return NextResponse.json({ error: '永久保存设置无效' }, { status: 400 });
  }
  const title = typeof body.title === 'string' ? body.title.trim() : undefined;
  const chartParams =
    body.chartParams && typeof body.chartParams === 'object' ? body.chartParams : undefined;
  const isPinned = typeof body.isPinned === 'boolean' ? body.isPinned : undefined;
  const isArchived = typeof body.isArchived === 'boolean' ? body.isArchived : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    if (typeof body.isPermanent === 'boolean') {
      await setSessionPermanence(tx, session.user.id, id, body.isPermanent);
    }
    return tx.divinationSession.update({
      where: { id, userId: session.user.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(chartParams !== undefined ? { chartParams } : {}),
        ...(isPinned !== undefined ? { isPinned } : {}),
        ...(isArchived !== undefined ? { isArchived } : {}),
        updatedAt: new Date(),
      },
    });
  });

  return NextResponse.json(updated);
}
