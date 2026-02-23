import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (user?.role !== 'admin') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      quota: true,
      createdAt: true,
      _count: { select: { sessions: true } },
    },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';

  if (!name || !email || !password) {
    return NextResponse.json({ error: '请填写昵称、邮箱和密码' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: '密码至少需要6位' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, role: 'user', quota: 30 },
    select: { id: true, email: true, name: true, role: true, quota: true, createdAt: true },
  });

  return NextResponse.json({ ...user, plainPassword: password }, { status: 201 });
}
