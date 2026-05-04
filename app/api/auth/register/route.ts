import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../lib/prisma';
import { getPublicSiteSettings } from '../../../../lib/site-settings';
import { isValidEmail, normalizeEmail, verifyEmailCode } from '../../../../lib/email-verification';

export async function POST(request: Request) {
  try {
    const siteSettings = await getPublicSiteSettings();
    if (!siteSettings.registrationEnabled) {
      return NextResponse.json(
        { error: `注册通道已关闭，若有需要请联系${siteSettings.registrationClosedContact}` },
        { status: 403 }
      );
    }

    const { email, password, name, code } = await request.json();
    const normalizedEmail = normalizeEmail(String(email || ''));

    if (!normalizedEmail || !password || !name || !code) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: '请输入正确的邮箱地址' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少需要6位' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      );
    }

    await verifyEmailCode(normalizedEmail, String(code));

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, password: hashed, name },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
