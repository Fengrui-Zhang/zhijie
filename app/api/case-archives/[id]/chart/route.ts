import { NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth';
import { isCaseModelType } from '../../../../../lib/divination-cases';
import { ArchiveError, resolveArchiveChart } from '../../../../../lib/case-archive-store';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const { id } = await params;
  const { modelType } = await request.json();
  if (!isCaseModelType(modelType)) return NextResponse.json({ error: '无效的排盘类型' }, { status: 400 });
  try {
    return NextResponse.json(await resolveArchiveChart(session.user.id, id, modelType));
  } catch (error) {
    if (error instanceof ArchiveError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error && /这份档案/.test(error.message) ? error.message : '切换排盘失败，请稍后重试' }, { status: 400 });
  }
}
