import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ExperimentRunResult } from '../types.ts';

const CACHE_ROOT = path.join(process.cwd(), '实验', 'cache', 'method-results');

function toSafeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function buildResultCacheKey(payload: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildCachePath(caseId: string, methodId: string, key: string) {
  return path.join(CACHE_ROOT, toSafeSegment(caseId), `${methodId}-${key}.json`);
}

export async function loadCachedResult(caseId: string, methodId: string, key: string) {
  const target = buildCachePath(caseId, methodId, key);
  try {
    const raw = await fs.readFile(target, 'utf8');
    return JSON.parse(raw) as ExperimentRunResult;
  } catch {
    return null;
  }
}

export async function saveCachedResult(caseId: string, methodId: string, key: string, result: ExperimentRunResult) {
  const target = buildCachePath(caseId, methodId, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(result, null, 2), 'utf8');
}
