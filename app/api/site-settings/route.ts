import { NextResponse } from 'next/server';
import { getPublicSiteSettings } from '@/lib/site-settings';

export async function GET() {
  try {
    const settings = await getPublicSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to load public site settings:', error);
    return NextResponse.json({ error: '加载站点配置失败' }, { status: 500 });
  }
}
