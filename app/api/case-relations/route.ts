import { NextResponse } from 'next/server';
import { auth } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId');
  const caseAId = searchParams.get('caseAId');
  const caseBId = searchParams.get('caseBId');

  const where = caseAId && caseBId
    ? {
        userId: session.user.id,
        OR: [
          { caseAId, caseBId },
          { caseAId: caseBId, caseBId: caseAId },
        ],
      }
    : caseId
      ? {
          userId: session.user.id,
          OR: [{ caseAId: caseId }, { caseBId: caseId }],
        }
      : {
          userId: session.user.id,
        };

  const relations = await prisma.caseRelation.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: selectRelation,
  });

  return NextResponse.json(relations.map((relation) => ({
    id: relation.id,
    caseAId: relation.caseAId,
    caseBId: relation.caseBId,
    labelAToB: relation.labelAToB,
    labelBToA: relation.labelBToA,
    caseATitle: relation.caseA.title,
    caseBTitle: relation.caseB.title,
    createdAt: relation.createdAt.toISOString(),
    updatedAt: relation.updatedAt.toISOString(),
  })));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();
  const caseAId = typeof body.caseAId === 'string' ? body.caseAId : '';
  const caseBId = typeof body.caseBId === 'string' ? body.caseBId : '';
  const relations = Array.isArray(body.relations) ? body.relations : [];

  if (!caseAId || !caseBId || caseAId === caseBId) {
    return NextResponse.json({ error: '关系命例参数无效' }, { status: 400 });
  }

  const cases = await prisma.divinationCase.findMany({
    where: {
      userId: session.user.id,
      id: { in: [caseAId, caseBId] },
    },
    select: { id: true },
  });

  if (cases.length !== 2) {
    return NextResponse.json({ error: '命例不存在' }, { status: 404 });
  }

  await prisma.caseRelation.deleteMany({
    where: {
      userId: session.user.id,
      OR: [
        { caseAId, caseBId },
        { caseAId: caseBId, caseBId: caseAId },
      ],
    },
  });

  const prepared = relations
    .map((item) => {
      const labelAToB = typeof item?.labelAToB === 'string' ? item.labelAToB.trim() : '';
      const labelBToA = typeof item?.labelBToA === 'string' ? item.labelBToA.trim() : '';
      if (!labelAToB && !labelBToA) return null;
      return {
        userId: session.user.id,
        caseAId,
        caseBId,
        labelAToB: labelAToB || null,
        labelBToA: labelBToA || null,
      };
    })
    .filter((item): item is {
      userId: string;
      caseAId: string;
      caseBId: string;
      labelAToB: string | null;
      labelBToA: string | null;
    } => item !== null);

  if (prepared.length > 0) {
    await prisma.caseRelation.createMany({ data: prepared });
  }

  const nextRelations = await prisma.caseRelation.findMany({
    where: {
      userId: session.user.id,
      OR: [
        { caseAId, caseBId },
        { caseAId: caseBId, caseBId: caseAId },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    select: selectRelation,
  });

  return NextResponse.json(nextRelations.map((relation) => ({
    id: relation.id,
    caseAId: relation.caseAId,
    caseBId: relation.caseBId,
    labelAToB: relation.labelAToB,
    labelBToA: relation.labelBToA,
    caseATitle: relation.caseA.title,
    caseBTitle: relation.caseB.title,
    createdAt: relation.createdAt.toISOString(),
    updatedAt: relation.updatedAt.toISOString(),
  })));
}
