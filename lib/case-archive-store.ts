import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { findCaseArchive, assertArchiveCanSwitch, caseBirthKey, sharedArchiveParams, chartWithArchiveName } from './case-archives';
import { buildCaseTitle, normalizeCaseChartParams, isCaseModelType, type CaseModelType } from './divination-cases';
import { calculateTaibuChart } from './taibu-chart';
import type { BaseParams } from '../types';

export class ArchiveError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

async function archiveTransaction<T>(userId: string, id: string, work: (tx: Prisma.TransactionClient, members: Awaited<ReturnType<typeof prisma.divinationCase.findMany>>) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const records = await tx.divinationCase.findMany({ where: { userId, modelType: { in: ['bazi', 'ziwei'] } } });
        const members = findCaseArchive(records, id);
        if (!members.length) throw new ArchiveError('命例档案不存在', 404);
        return work(tx, members);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
}

export async function resolveArchiveChart(userId: string, id: string, modelType: CaseModelType) {
  return archiveTransaction(userId, id, async (tx, members) => {
    const source = members.find(item => item.id === id)!;
    const params = normalizeCaseChartParams(source.chartParams);
    const archiveId = params.archiveId || source.id;
    for (const member of members) {
      await tx.divinationCase.update({ where: { id: member.id }, data: {
        chartParams: { ...normalizeCaseChartParams(member.chartParams), archiveId } as Prisma.InputJsonValue,
        updatedAt: member.updatedAt,
      } });
    }
    const existing = members.find(item => item.modelType === modelType);
    if (existing) return { id: existing.id, modelType };
    assertArchiveCanSwitch(params);
    const chartData = await calculateTaibuChart({ modelType, params: params as BaseParams });
    const created = await tx.divinationCase.create({ data: {
      userId, modelType, title: buildCaseTitle(modelType, params),
      chartParams: { ...params, archiveId, rechartAt: new Date().toISOString() } as Prisma.InputJsonValue,
      chartData: chartData as unknown as Prisma.InputJsonValue,
    } });
    return { id: created.id, modelType };
  });
}

export async function updateCaseArchive(userId: string, id: string, body: Record<string, any>) {
  return archiveTransaction(userId, id, async (tx, members) => {
    const source = members.find(item => item.id === id)!;
    const sourceParams = normalizeCaseChartParams(source.chartParams);
    const params = normalizeCaseChartParams(body.chartParams);
    const archiveId = sourceParams.archiveId || source.id;
    const birthChanged = caseBirthKey(sourceParams) !== caseBirthKey(params);
    if (members.length > 1 && birthChanged) assertArchiveCanSwitch(params);
    let result = source;
    for (const member of members) {
      if (!isCaseModelType(member.modelType)) continue;
      const memberParams = sharedArchiveParams(member.chartParams, params, archiveId);
      const chartData = member.id === id ? body.chartData : birthChanged
        ? await calculateTaibuChart({ modelType: member.modelType, params: memberParams as BaseParams })
        : member.chartData;
      if (!chartData) throw new ArchiveError('缺少排盘数据');
      const updated = await tx.divinationCase.update({ where: { id: member.id }, data: {
        title: buildCaseTitle(member.modelType, params),
        chartParams: memberParams as Prisma.InputJsonValue,
        chartData: chartWithArchiveName(chartData, params.name) as Prisma.InputJsonValue,
        ...(birthChanged ? { klineData: Prisma.DbNull, initialAnalysisData: Prisma.DbNull } : {}),
        ...(member.id === id && !birthChanged ? {
          ...(body.klineData !== undefined ? { klineData: body.klineData ?? Prisma.DbNull } : {}),
          ...(body.initialAnalysisData !== undefined ? { initialAnalysisData: body.initialAnalysisData ?? Prisma.DbNull } : {}),
        } : {}),
      } });
      if (member.id === id) result = updated;
    }
    return result;
  });
}

export async function deleteCaseArchive(userId: string, id: string) {
  return archiveTransaction(userId, id, async (tx, members) => {
    await tx.divinationCase.deleteMany({ where: { userId, id: { in: members.map(item => item.id) } } });
    return { ok: true };
  });
}
