import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, quota: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  return NextResponse.json(user);
}
