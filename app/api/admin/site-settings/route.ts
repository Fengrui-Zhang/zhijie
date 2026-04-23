import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPublicSiteSettings, updateSiteSettings } from '@/lib/site-settings';
import { normalizePublicSiteSettings } from '@/lib/site-settings-defaults';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'admin') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const settings = await getPublicSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to load admin site settings:', error);
    return NextResponse.json({ error: '加载站点配置失败' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const settings = normalizePublicSiteSettings(body);
    const saved = await updateSiteSettings(settings);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('Failed to save admin site settings:', error);
    return NextResponse.json({ error: '保存站点配置失败' }, { status: 500 });
  }
}
