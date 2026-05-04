import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublicSiteSettings } from '@/lib/site-settings';
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
    const siteSettings = await getPublicSiteSettings();
    if (!siteSettings.registrationEnabled) {
      return NextResponse.json(
        { error: `注册通道已关闭，若有需要请联系${siteSettings.registrationClosedContact}` },
        { status: 403 }
      );
    }

    const { email } = await request.json();
    const normalizedEmail = normalizeEmail(String(email || ''));

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: '请输入正确的邮箱地址' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
    }

    await assertCanSendVerificationCode(normalizedEmail);

    const code = createVerificationCode();
    const savedCode = await saveVerificationCode(normalizedEmail, code);
    try {
      await sendVerificationEmail(normalizedEmail, code);
    } catch (error) {
      await prisma.emailVerificationCode.update({
        where: { id: savedCode.id },
        data: { consumedAt: new Date() },
      });
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Send verification code error:', error);
    return NextResponse.json(
      { error: error?.message || '验证码发送失败，请稍后重试' },
      { status: 500 }
    );
  }
}
