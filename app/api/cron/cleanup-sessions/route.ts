import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getRetentionCutoff } from '../../../../lib/session-retention';

/** 每日清理超过保留期的会话（由 Vercel Cron 调用） */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = getRetentionCutoff();
  const result = await prisma.divinationSession.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return NextResponse.json({
    ok: true,
    deleted: result.count,
    cutoff: cutoff.toISOString(),
  });
}
