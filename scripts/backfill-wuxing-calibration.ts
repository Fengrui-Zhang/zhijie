import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  attachWuxingCalibration,
  getSavedWuxingAnalysisContent,
  getStoredWuxingCalibration,
} from '../lib/bazi-wuxing-calibration';

async function loadEnvFile(filePath: string, override = false) {
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
    if (!override && process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  await loadEnvFile(path.resolve('.env'));
  await loadEnvFile(path.resolve('.env.local'));

  const apply = process.argv.includes('--apply');
  const cases = await prisma.divinationCase.findMany({
    where: { modelType: 'bazi' },
    select: { id: true, initialAnalysisData: true },
  });

  let scanned = 0;
  let missing = 0;
  let existing = 0;
  let parsed = 0;
  let updated = 0;

  for (const item of cases) {
    scanned += 1;
    if (getStoredWuxingCalibration(item.initialAnalysisData)) {
      existing += 1;
      continue;
    }
    if (!getSavedWuxingAnalysisContent(item.initialAnalysisData)) {
      missing += 1;
      continue;
    }
    const next = attachWuxingCalibration(item.initialAnalysisData);
    if (next === item.initialAnalysisData) {
      missing += 1;
      continue;
    }
    parsed += 1;
    if (apply) {
      await prisma.divinationCase.update({
        where: { id: item.id },
        data: { initialAnalysisData: next as unknown as Prisma.InputJsonValue },
      });
      updated += 1;
    }
  }

  console.log(JSON.stringify({ scanned, existing, missing, parsed, updated, dryRun: !apply }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
