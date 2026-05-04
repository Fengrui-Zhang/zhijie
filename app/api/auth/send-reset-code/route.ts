import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  assertCanSendVerificationCode,
  createVerificationCode,
  isValidEmail,
  normalizeEmail,
  saveVerificationCode,
  sendVerificationEmail,
} from '@/lib/email-verification';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = normalizeEmail(String(email || ''));

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: '请输入正确的邮箱地址' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: '该邮箱账号不存在' }, { status: 404 });
    }

    await assertCanSendVerificationCode(normalizedEmail, 'password_reset');

    const code = createVerificationCode();
    const savedCode = await saveVerificationCode(normalizedEmail, code, 'password_reset');
    try {
      await sendVerificationEmail(normalizedEmail, code, 'password_reset');
    } catch (error) {
      await prisma.emailVerificationCode.update({
        where: { id: savedCode.id },
        data: { consumedAt: new Date() },
      });
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Send password reset code error:', error);
    return NextResponse.json(
      { error: error?.message || '验证码发送失败，请稍后重试' },
      { status: 500 }
    );
  }
}
