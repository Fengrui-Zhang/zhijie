import { mkdir, open, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { calculateTaibuChart } from '../lib/taibu-chart';
import { normalizeCaseChartParams } from '../lib/divination-cases';
import { ModelType, type BaseParams } from '../types';

type CaseModelType = ModelType.BAZI | ModelType.ZIWEI;

type Args = {
  apply: boolean;
  force: boolean;
  includeSessions: boolean;
  model: 'all' | CaseModelType;
  userId?: string;
  caseId?: string;
  limit?: number;
  backup?: string;
  envFile?: string;
};

type ScanStats = {
  scanned: number;
  alreadyNew: number;
  missingParams: number;
  unsupported: number;
  recalculated: number;
  updated: number;
  failed: number;
};

const CASE_MODELS = [ModelType.BAZI, ModelType.ZIWEI] as const;
const DEFAULT_BACKUP_DIR = 'backups';
const RECHART_VERSION = 1;

async function loadEnvFile(filePath: string, originalEnv: Set<string>, override = false) {
  let content = '';
  try {
    content = await readFile(filePath, 'utf8');
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!override && originalEnv.has(key)) continue;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  }
}

async function loadEnv(envFile?: string) {
  const originalEnv = new Set(Object.keys(process.env));
  await loadEnvFile(path.resolve('.env'), originalEnv);
  await loadEnvFile(path.resolve('.env.local'), originalEnv);
  if (envFile) {
    await loadEnvFile(path.resolve(envFile), new Set(), true);
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    apply: false,
    force: false,
    includeSessions: true,
    model: 'all',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    const readValue = () => {
      if (!next || next.startsWith('--')) {
        throw new Error(`${current} 需要一个参数`);
      }
      index += 1;
      return next;
    };

    if (current === '--apply') args.apply = true;
    else if (current === '--dry-run') args.apply = false;
    else if (current === '--force') args.force = true;
    else if (current === '--no-sessions') args.includeSessions = false;
    else if (current === '--model') {
      const value = readValue();
      if (value !== 'all' && value !== ModelType.BAZI && value !== ModelType.ZIWEI) {
        throw new Error('--model 只支持 all、bazi、ziwei');
      }
      args.model = value;
    } else if (current === '--user') args.userId = readValue();
    else if (current === '--case') args.caseId = readValue();
    else if (current === '--limit') {
      const value = Number.parseInt(readValue(), 10);
      if (!Number.isFinite(value) || value <= 0) throw new Error('--limit 必须是正整数');
      args.limit = value;
    } else if (current === '--backup') args.backup = readValue();
    else if (current === '--env-file') args.envFile = readValue();
    else if (current === '--help' || current === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`未知参数：${current}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`用法：
  npm run rechart:cases -- --dry-run
  npm run rechart:cases -- --apply

参数：
  --dry-run            只扫描和试算，不写数据库（默认）
  --apply              写入数据库，写入前会备份旧数据
  --force              已经是新格式的命例也重新排
  --model bazi|ziwei   只处理某一类命例
  --user <userId>      只处理某个用户
  --case <caseId>      只处理某个命例
  --limit <n>          限制处理数量
  --no-sessions        不同步更新关联会话 chartData
  --backup <path>      指定备份 JSONL 路径
  --env-file <path>    显式加载环境变量文件，例如 .env.vercel`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNewChartData(modelType: string, value: unknown) {
  if (!isObject(value)) return false;
  if (modelType === ModelType.BAZI) {
    return (
      isObject(value.base_info) &&
      isObject(value.bazi_info) &&
      isObject(value.dayun_info) &&
      isObject(value.detail_info) &&
      typeof value.taibuText === 'string'
    );
  }
  if (modelType === ModelType.ZIWEI) {
    return (
      isObject(value.base_info) &&
      isObject(value.taibuJson) &&
      isObject(value.detail_info) &&
      typeof value.taibuText === 'string'
    );
  }
  return false;
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function cleanObject<T extends Record<string, unknown>>(value: T) {
  const result = { ...value };
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) delete result[key];
  }
  return result;
}

function buildChartParams(raw: unknown): BaseParams | null {
  if (!isObject(raw)) return null;
  const normalized = normalizeCaseChartParams(raw);
  const year = asNumber(raw.year ?? normalized.year);
  const month = asNumber(raw.month ?? normalized.month);
  const day = asNumber(raw.day ?? normalized.day);
  const hours = asNumber(raw.hours ?? normalized.hours);
  const minute = asNumber(raw.minute ?? normalized.minute ?? 0);
  const sex = asNumber(raw.sex ?? normalized.sex);

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hours === undefined ||
    minute === undefined ||
    sex === undefined
  ) {
    return null;
  }

  return cleanObject({
    ...raw,
    ...normalized,
    year,
    month,
    day,
    hours,
    minute,
    sex,
    name: normalized.name || (typeof raw.name === 'string' ? raw.name : undefined) || '匿名',
    calendarType: normalized.calendarType || (raw.calendarType as BaseParams['calendarType']) || 'solar',
    timeInputMode: normalized.timeInputMode || (raw.timeInputMode as BaseParams['timeInputMode']) || 'exact',
    useTrueSolar: normalized.useTrueSolar ?? Boolean(raw.useTrueSolar),
  }) as BaseParams;
}

function validateChart(modelType: CaseModelType, chartData: unknown) {
  if (!isNewChartData(modelType, chartData)) {
    throw new Error('本地排盘结果缺少当前 UI 所需字段');
  }
}

function defaultBackupPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(DEFAULT_BACKUP_DIR, `rechart-cases-${stamp}.jsonl`);
}

async function createBackupWriter(args: Args) {
  if (!args.apply) return null;
  const backupPath = args.backup || defaultBackupPath();
  await mkdir(path.dirname(backupPath), { recursive: true });
  const file = await open(backupPath, 'a');
  console.log(`备份文件：${backupPath}`);
  return {
    path: backupPath,
    async write(entry: unknown) {
      await file.appendFile(`${JSON.stringify(entry)}\n`);
    },
    async close() {
      await file.close();
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadEnv(args.envFile);
  const { prisma } = await import('../lib/prisma');
  const stats: ScanStats = {
    scanned: 0,
    alreadyNew: 0,
    missingParams: 0,
    unsupported: 0,
    recalculated: 0,
    updated: 0,
    failed: 0,
  };

  const modelTypes = args.model === 'all' ? [...CASE_MODELS] : [args.model];
  const cases = await prisma.divinationCase.findMany({
    where: {
      ...(args.caseId ? { id: args.caseId } : {}),
      ...(args.userId ? { userId: args.userId } : {}),
      modelType: { in: modelTypes },
    },
    orderBy: { updatedAt: 'asc' },
    take: args.limit,
    select: {
      id: true,
      userId: true,
      modelType: true,
      title: true,
      chartParams: true,
      chartData: true,
      initialAnalysisData: true,
      klineData: true,
      createdAt: true,
      updatedAt: true,
      sessions: {
        select: {
          id: true,
          title: true,
          modelType: true,
          chartParams: true,
          chartData: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  console.log(`${args.apply ? 'APPLY' : 'DRY-RUN'}：扫描 ${cases.length} 条命例`);
  const backup = await createBackupWriter(args);

  try {
    for (const item of cases) {
      stats.scanned += 1;
      if (item.modelType !== ModelType.BAZI && item.modelType !== ModelType.ZIWEI) {
        stats.unsupported += 1;
        continue;
      }

      if (!args.force && isNewChartData(item.modelType, item.chartData)) {
        stats.alreadyNew += 1;
        continue;
      }

      const chartParams = buildChartParams(item.chartParams);
      if (!chartParams) {
        stats.missingParams += 1;
        console.log(`跳过 ${item.id}「${item.title}」：缺少完整出生参数`);
        continue;
      }

      try {
        const nextChartData = await calculateTaibuChart({
          modelType: item.modelType,
          params: chartParams,
        });
        validateChart(item.modelType, nextChartData);
        stats.recalculated += 1;

        const nextChartParams = cleanObject({
          ...chartParams,
          rechartSource: 'taibu-local',
          rechartAt: new Date().toISOString(),
          rechartVersion: RECHART_VERSION,
        });

        if (!args.apply) {
          console.log(`可更新 ${item.id}「${item.title}」`);
          continue;
        }

        await backup?.write({
          type: 'case-rechart-backup',
          backedUpAt: new Date().toISOString(),
          case: item,
        });

        const sessionUpdates = args.includeSessions
          ? item.sessions
            .filter((session) => session.modelType === item.modelType)
            .map((session) =>
              prisma.divinationSession.update({
                where: { id: session.id },
                data: {
                  chartParams: nextChartParams as Prisma.InputJsonValue,
                  chartData: nextChartData as unknown as Prisma.InputJsonValue,
                },
              })
            )
          : [];

        await prisma.$transaction([
          prisma.divinationCase.update({
            where: { id: item.id },
            data: {
              chartParams: nextChartParams as Prisma.InputJsonValue,
              chartData: nextChartData as unknown as Prisma.InputJsonValue,
            },
          }),
          ...sessionUpdates,
        ]);
        stats.updated += 1;
        console.log(`已更新 ${item.id}「${item.title}」`);
      } catch (error) {
        stats.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`失败 ${item.id}「${item.title}」：${message}`);
      }
    }
  } finally {
    await backup?.close();
    await prisma.$disconnect();
  }

  console.log('\n汇总：');
  console.table(stats);
  if (!args.apply) {
    console.log('当前为 dry-run，未写入数据库。确认结果后使用 --apply 执行迁移。');
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
