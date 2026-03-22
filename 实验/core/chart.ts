import fs from 'node:fs/promises';
import path from 'node:path';
import type { BaziResponse } from '../../types.ts';
import type { BaziCaseParams } from '../types.ts';
import { requireEnv } from './env.ts';

const BASE_API = 'https://api.yuanfenju.com/index.php/v1';
const CACHE_DIR = path.join(process.cwd(), '实验', 'cache');
const CACHE_PATH = path.join(CACHE_DIR, 'bazi-chart-cache.json');

let cacheLoaded = false;
let cacheStore: Record<string, BaziResponse> = {};

function buildCacheKey(params: BaziCaseParams) {
  return JSON.stringify({
    year: params.year,
    month: params.month,
    day: params.day,
    hours: params.hours,
    minute: params.minute,
    sex: params.sex,
    name: params.name || '匿名',
    province: params.province || '',
    city: params.city || '',
  });
}

async function loadCache() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf8');
    cacheStore = JSON.parse(raw) as Record<string, BaziResponse>;
  } catch {
    cacheStore = {};
  }
}

async function saveCache() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(cacheStore, null, 2), 'utf8');
}

export async function fetchBaziChart(params: BaziCaseParams): Promise<BaziResponse> {
  await loadCache();
  const cacheKey = buildCacheKey(params);
  const cached = cacheStore[cacheKey];
  if (cached) {
    return cached;
  }

  const apiKey = requireEnv('YUANFENJU_API_KEY');
  const timeoutMs = Number(process.env.EXPERIMENT_YUANFENJU_TIMEOUT_MS || 20000);
  const urlParams = new URLSearchParams();
  urlParams.append('api_key', apiKey);
  urlParams.append('type', '1');
  urlParams.append('name', params.name || '匿名');
  urlParams.append('sex', String(params.sex));
  urlParams.append('year', String(params.year));
  urlParams.append('month', String(params.month));
  urlParams.append('day', String(params.day));
  urlParams.append('hours', String(params.hours));
  urlParams.append('minute', String(params.minute));
  const isZhen = params.province && params.city ? '1' : '0';
  urlParams.append('zhen', isZhen);
  if (params.province) urlParams.append('province', params.province);
  if (params.city) urlParams.append('city', params.city);

  const targetUrl = `${BASE_API}/Bazi/paipan?${urlParams.toString()}`;
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error: any) {
    if (error?.name === 'TimeoutError') {
      throw new Error(`Yuanfenju API timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Yuanfenju API request failed: ${error?.message || error}`);
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Yuanfenju API request failed: ${response.status} ${errorText}`);
  }
  const json = await response.json();
  if (json.errcode !== 0 || !json.data) {
    throw new Error(`Yuanfenju API Error (${json.errcode}): ${json.errmsg || 'Unknown error'}`);
  }
  const result = json.data as BaziResponse;
  cacheStore[cacheKey] = result;
  await saveCache();
  return result;
}
