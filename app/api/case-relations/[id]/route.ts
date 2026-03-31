import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

const selectRelation = {
  id: true,
  caseAId: true,
  caseBId: true,
  labelAToB: true,
  labelBToA: true,
  createdAt: true,
  updatedAt: true,
  caseA: { select: { title: true } },
  caseB: { select: { title: true } },
} as const;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.caseRelation.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: '关系标签不存在' }, { status: 404 });
  }

  await prisma.caseRelation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const labelAToB = typeof body.labelAToB === 'string' ? body.labelAToB.trim() : '';
  const labelBToA = typeof body.labelBToA === 'string' ? body.labelBToA.trim() : '';

  const existing = await prisma.caseRelation.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: '关系标签不存在' }, { status: 404 });
  }

  const updated = await prisma.caseRelation.update({
    where: { id },
    data: {
      labelAToB: labelAToB || null,
      labelBToA: labelBToA || null,
      updatedAt: new Date(),
    },
    select: selectRelation,
  });

  return NextResponse.json({
    id: updated.id,
    caseAId: updated.caseAId,
    caseBId: updated.caseBId,
    labelAToB: updated.labelAToB,
    labelBToA: updated.labelBToA,
    caseATitle: updated.caseA.title,
    caseBTitle: updated.caseB.title,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
