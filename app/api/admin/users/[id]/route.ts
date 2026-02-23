import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'admin') return null;
  return session;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (typeof body.quota === 'number') data.quota = body.quota;
  if (typeof body.role === 'string' && ['user', 'admin'].includes(body.role)) data.role = body.role;
  if (typeof body.password === 'string' && body.password.trim()) {
    const pwd = body.password.trim();
    if (pwd.length < 6) {
      return NextResponse.json({ error: '密码至少需要6位' }, { status: 400 });
    }
    data.password = await bcrypt.hash(pwd, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: '无有效字段' }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id }, data });

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    quota: updated.quota,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const { id } = await params;

  if (id === adminSession.user.id) {
    return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }
}
