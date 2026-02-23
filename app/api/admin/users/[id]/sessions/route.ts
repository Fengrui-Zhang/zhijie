import { NextResponse } from 'next/server';
import { auth } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';
import { getRetentionCutoff } from '../../../../../../lib/session-retention';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'admin') return null;
  return session;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const { id } = await params;
  const cutoff = getRetentionCutoff();

  const sessions = await prisma.divinationSession.findMany({
    where: {
      userId: id,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      modelType: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(sessions);
}
