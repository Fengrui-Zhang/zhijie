import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** 每日 8:00 将额度不足 3 的账号补足至 3（由 Vercel Cron 调用） */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await prisma.user.updateMany({
    where: { quota: { lt: 3 } },
    data: { quota: 3 },
  });

  return NextResponse.json({
    ok: true,
    updated: result.count,
    quota: 3,
  });
}
