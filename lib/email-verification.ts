import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

export type EmailVerificationPurpose = 'registration' | 'password_reset';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const getCodeSecret = () => {
  return process.env.EMAIL_CODE_SECRET || process.env.NEXTAUTH_SECRET || 'zhijie-email-code';
};

const hashVerificationCode = (email: string, code: string) => {
  return crypto
    .createHmac('sha256', getCodeSecret())
    .update(`${normalizeEmail(email)}:${code}`)
    .digest('hex');
};

export const createVerificationCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

export async function assertCanSendVerificationCode(
  email: string,
  purpose: EmailVerificationPurpose = 'registration'
) {
  const latest = await prisma.emailVerificationCode.findFirst({
    where: { email: normalizeEmail(email), purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (!latest) return;

  const elapsedMs = Date.now() - latest.createdAt.getTime();
  const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;
  if (elapsedMs < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
    throw new Error(`验证码发送过于频繁，请 ${waitSeconds} 秒后再试`);
  }
}

export async function saveVerificationCode(
  email: string,
  code: string,
  purpose: EmailVerificationPurpose = 'registration'
) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.emailVerificationCode.updateMany({
    where: {
      email: normalizedEmail,
      purpose,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    data: { consumedAt: now },
  });

  return prisma.emailVerificationCode.create({
    data: {
      email: normalizedEmail,
      purpose,
      codeHash: hashVerificationCode(normalizedEmail, code),
      expiresAt,
    },
  });
}

export async function verifyEmailCode(
  email: string,
  code: string,
  purpose: EmailVerificationPurpose = 'registration'
) {
  const normalizedEmail = normalizeEmail(email);
  const trimmedCode = code.trim();
  if (!/^\d{6}$/.test(trimmedCode)) {
    throw new Error('请输入6位邮箱验证码');
  }

  const record = await prisma.emailVerificationCode.findFirst({
    where: {
      email: normalizedEmail,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new Error('验证码不存在或已过期，请重新获取');
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new Error('验证码错误次数过多，请重新获取');
  }

  const matched = record.codeHash === hashVerificationCode(normalizedEmail, trimmedCode);
  if (!matched) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error('验证码错误');
  }

  await prisma.emailVerificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  purpose: EmailVerificationPurpose = 'registration'
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error('邮件服务未配置，请联系管理员');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: purpose === 'password_reset'
        ? '元分 · 智解 找回密码验证码'
        : '元分 · 智解 注册验证码',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;color:#292524;">
          <h2 style="margin:0 0 12px;">元分 · 智解</h2>
          <p>你的${purpose === 'password_reset' ? '找回密码' : '注册'}验证码是：</p>
          <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:18px 0;color:#92400e;">${code}</div>
          <p>验证码 ${CODE_TTL_MINUTES} 分钟内有效。若非本人操作，请忽略这封邮件。</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data?.message || data?.error?.message || '验证码邮件发送失败';
    throw new Error(message);
  }
}
