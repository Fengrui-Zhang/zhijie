import { prisma } from './prisma';
import {
  CASE_MODEL_TYPES,
  buildCaseIdentityKey,
  buildCaseTitle,
  isCaseModelType,
} from './divination-cases';

export async function backfillDivinationCases(userId: string) {
  const existingCases = await prisma.divinationCase.findMany({
    where: {
      userId,
      modelType: { in: [...CASE_MODEL_TYPES] },
    },
    select: {
      id: true,
      modelType: true,
      chartParams: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const keyToCaseId = new Map<string, string>();
  for (const item of existingCases) {
    if (!isCaseModelType(item.modelType)) continue;
    const key = buildCaseIdentityKey(item.modelType, item.chartParams);
    if (!keyToCaseId.has(key)) {
      keyToCaseId.set(key, item.id);
    }
  }

  const sessions = await prisma.divinationSession.findMany({
    where: {
      userId,
      caseId: null,
      modelType: { in: [...CASE_MODEL_TYPES] },
    },
    select: {
      id: true,
      modelType: true,
      title: true,
      chartParams: true,
      chartData: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const sessionIdsByCaseId = new Map<string, string[]>();

  for (const session of sessions) {
    if (!session.chartData || !isCaseModelType(session.modelType)) continue;

    const identityKey = buildCaseIdentityKey(session.modelType, session.chartParams);
    let caseId = keyToCaseId.get(identityKey);

    if (!caseId) {
      const createdCase = await prisma.divinationCase.create({
        data: {
          userId,
          modelType: session.modelType,
          title: buildCaseTitle(session.modelType, session.chartParams, session.title),
          chartParams: session.chartParams ?? {},
          chartData: session.chartData,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        select: { id: true },
      });
      caseId = createdCase.id;
      keyToCaseId.set(identityKey, caseId);
    }

    const ids = sessionIdsByCaseId.get(caseId) ?? [];
    ids.push(session.id);
    sessionIdsByCaseId.set(caseId, ids);
  }

  if (sessionIdsByCaseId.size === 0) return;

  await prisma.$transaction(
    Array.from(sessionIdsByCaseId.entries()).map(([caseId, sessionIds]) =>
      prisma.divinationSession.updateMany({
        where: { id: { in: sessionIds } },
        data: { caseId },
      })
    )
  );
}
