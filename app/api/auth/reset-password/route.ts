import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { isValidEmail, normalizeEmail, verifyEmailCode } from '@/lib/email-verification';

export async function POST(request: Request) {
  try {
    const { email, password, code } = await request.json();
    const normalizedEmail = normalizeEmail(String(email || ''));
    const nextPassword = typeof password === 'string' ? password.trim() : '';

    if (!normalizedEmail || !nextPassword || !code) {
      return NextResponse.json({ error: '请填写邮箱、新密码和验证码' }, { status: 400 });
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: '请输入正确的邮箱地址' }, { status: 400 });
    }

    if (nextPassword.length < 6) {
      return NextResponse.json({ error: '新密码至少需要6位' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: '该邮箱账号不存在' }, { status: 404 });
    }

    await verifyEmailCode(normalizedEmail, String(code), 'password_reset');

    const hashed = await bcrypt.hash(nextPassword, 12);
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: hashed },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: error?.message || '密码重置失败，请稍后重试' },
      { status: 500 }
    );
  }
}
