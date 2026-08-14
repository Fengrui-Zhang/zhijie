import { prisma } from '../prisma';
import { AgentQuotaError } from './types';

export async function reserveAgentPoint(userId: string) {
  const updated = await prisma.user.updateMany({
    where: { id: userId, quota: { gte: 1 } },
    data: { quota: { decrement: 1 } },
  });
  if (updated.count !== 1) throw new AgentQuotaError();
}

export async function refundAgentPoint(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { quota: { increment: 1 } } });
}

export async function getAgentQuota(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { quota: true } });
  return user?.quota ?? 0;
}

export async function acquireAgentLock(userId: string, turnId: string, ttlMs = 300_000) {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);
  const updated = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { agentLockUntil: null },
        { agentLockUntil: { lt: now } },
        { agentLockTurnId: turnId },
      ],
    },
    data: { agentLockUntil: lockedUntil, agentLockTurnId: turnId },
  });
  return updated.count === 1;
}

export async function refreshAgentLock(userId: string, turnId: string, ttlMs = 300_000) {
  await prisma.user.updateMany({
    where: { id: userId, agentLockTurnId: turnId },
    data: { agentLockUntil: new Date(Date.now() + ttlMs) },
  });
}

export async function releaseAgentLock(userId: string, turnId: string) {
  await prisma.user.updateMany({
    where: { id: userId, agentLockTurnId: turnId },
    data: { agentLockUntil: null, agentLockTurnId: null },
  });
}
