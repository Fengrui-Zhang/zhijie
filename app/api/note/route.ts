import { NextResponse } from 'next/server';
import { auth } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const note = await prisma.userNote.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
    select: {
      content: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(note);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const content = typeof body?.content === 'string' ? body.content : null;

  if (content === null) {
    return NextResponse.json({ error: '笔记内容必须为文本' }, { status: 400 });
  }

  const note = await prisma.userNote.upsert({
    where: { userId: session.user.id },
    update: { content },
    create: {
      userId: session.user.id,
      content,
    },
    select: {
      content: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(note);
}
