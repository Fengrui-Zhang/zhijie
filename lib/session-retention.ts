import type { Prisma } from '@prisma/client';

/** 会话默认保留天数 */
export const SESSION_RETENTION_DAYS = 15;

/** 返回「保留期内」的起始时间（早于此时间的会话应被清理） */
export function getRetentionCutoff(now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - SESSION_RETENTION_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function retainedSessionsWhere(cutoff = getRetentionCutoff()): Prisma.DivinationSessionWhereInput {
  return { OR: [
    { isPermanent: true },
    { retentionResetAt: { gte: cutoff } },
    { retentionResetAt: null, createdAt: { gte: cutoff } },
  ] };
}

export function expiredSessionsWhere(cutoff = getRetentionCutoff()): Prisma.DivinationSessionWhereInput {
  return { isPermanent: false, OR: [
    { retentionResetAt: { lt: cutoff } },
    { retentionResetAt: null, createdAt: { lt: cutoff } },
  ] };
}

export async function setSessionPermanence(
  db: Pick<Prisma.TransactionClient, 'divinationSession'>,
  userId: string,
  id: string,
  isPermanent: boolean,
  now = new Date(),
) {
  return db.divinationSession.updateMany({
    where: { id, userId, isPermanent: !isPermanent },
    data: { isPermanent, ...(!isPermanent ? { retentionResetAt: now } : {}) },
  });
}
