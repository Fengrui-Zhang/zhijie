import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.caseRelation.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: '关系标签不存在' }, { status: 404 });
  }

  await prisma.caseRelation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
