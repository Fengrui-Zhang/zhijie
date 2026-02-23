import { NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

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
    select: { id: true },
  });

  if (!divSession) {
    return NextResponse.json({ error: '会话不存在' }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(messages);
}

export async function POST(
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

  const messages = Array.isArray(body) ? body : [body];

  const created = await prisma.chatMessage.createMany({
    data: messages.map((msg: { role: string; content: string }) => ({
      sessionId: id,
      role: msg.role,
      content: msg.content,
    })),
  });

  await prisma.divinationSession.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
