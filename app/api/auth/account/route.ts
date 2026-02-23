import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: '注销失败，请稍后重试' }, { status: 500 });
  }
}
