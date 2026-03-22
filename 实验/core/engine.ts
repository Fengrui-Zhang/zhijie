import path from 'node:path';
import type { BaziResponse } from '../../types.ts';
import type {
  ExperimentCase,
  ExperimentCaseBundle,
  ExperimentMethodId,
  ExperimentRunResult,
  RunExperimentOptions,
} from '../types.ts';
import { getCaseById, loadCases } from './cases.ts';
import { fetchBaziChart } from './chart.ts';
import {
  DEFAULT_EXPERIMENT_CONCURRENCY,
  DEFAULT_EXPERIMENT_MODEL,
  DEFAULT_FLAT_TOP_K,
  DEFAULT_HIERARCHICAL_TOP_K,
  DEFAULT_TEMPERATURE,
  EXPERIMENT_CACHE_VERSION,
  METHOD_DEFINITIONS,
} from './constants.ts';
import { loadLocalEnv } from './env.ts';
import { callDeepSeekModel } from './model.ts';
import { buildPromptBundle } from './prompts.ts';
import { buildResultCacheKey, loadCachedResult, saveCachedResult } from './resultCache.ts';
import { buildSummary, writeOutputFiles } from './report.ts';
import { retrieveFlatKnowledge, retrieveHierarchicalKnowledge, retrieveRawFlatKnowledge } from './retrieval.ts';
import { buildMetrics, judgeOutput } from './scoring.ts';

function toMessages(prompt: { system: string; user: string }) {
  return [
    { role: 'system' as const, content: prompt.system },
    { role: 'user' as const, content: prompt.user },
  ];
}

async function maybeFetchChart(useChart: boolean, params: any) {
  if (!useChart) return null;
  return fetchBaziChart(params);
}

async function retrieveKnowledgeForMethod(methodId: ExperimentMethodId, query: string) {
  if (methodId === 'D') {
    return retrieveRawFlatKnowledge(query, DEFAULT_FLAT_TOP_K);
  }
  if (methodId === 'E') {
    return retrieveHierarchicalKnowledge(query, DEFAULT_HIERARCHICAL_TOP_K);
  }
  return [];
}

async function runSingleMethod(
  caseItem: ExperimentCase,
  method: (typeof METHOD_DEFINITIONS)[number],
  judge: boolean,
  sharedChartPromise?: Promise<BaziResponse | null>
): Promise<ExperimentRunResult> {
  const hardTimeoutMs = Number(process.env.EXPERIMENT_METHOD_TIMEOUT_MS || 180000);
  const startedAt = Date.now();
  let chartData: BaziResponse | null = null;
  let knowledgeChunks: Awaited<ReturnType<typeof retrieveKnowledgeForMethod>> = [];
  let prompt = {
    system: '',
    user: '',
    retrievalMode: method.retrievalMode,
    knowledgeQuery: caseItem.question,
  };
  let contextText = '';

  const finalizeError = async (message: string) => {
    const output = `[ERROR] ${message}`;
    const latencyMs = Date.now() - startedAt;
    const metrics = buildMetrics({
      contextText,
      retrievedChunks: knowledgeChunks.length,
      latencyMs,
      output,
      reference: caseItem.reference,
    });
    const result: ExperimentRunResult = {
      caseId: caseItem.id,
      method: method.id,
      methodLabel: method.label,
      retrievalMode: method.retrievalMode,
      prompt,
      chartData,
      contextText,
      retrievedKnowledge: knowledgeChunks,
      output,
      metrics,
      judge: null,
      error: message,
    };
    const cacheKey = buildResultCacheKey({
      version: EXPERIMENT_CACHE_VERSION,
      caseId: caseItem.id,
      methodId: method.id,
      judge,
      model: DEFAULT_EXPERIMENT_MODEL,
      temperature: DEFAULT_TEMPERATURE,
      prompt,
      knowledgeChunks,
      chartBazi: chartData?.bazi_info?.bazi ?? null,
      error: message,
    });
    await saveCachedResult(caseItem.id, method.id, cacheKey, result);
    return result;
  };

  const execution = (async () => {
    chartData = method.useChart
      ? await (sharedChartPromise ?? maybeFetchChart(true, caseItem.params))
      : null;
    knowledgeChunks = await retrieveKnowledgeForMethod(method.id, caseItem.question);
    prompt = buildPromptBundle(caseItem, method, chartData as BaziResponse | null, knowledgeChunks);
    contextText = prompt.system;
    const cacheKey = buildResultCacheKey({
      version: EXPERIMENT_CACHE_VERSION,
      caseId: caseItem.id,
      methodId: method.id,
      judge,
      model: DEFAULT_EXPERIMENT_MODEL,
      temperature: DEFAULT_TEMPERATURE,
      prompt,
      knowledgeChunks,
      chartBazi: chartData?.bazi_info?.bazi ?? null,
    });
    const cached = await loadCachedResult(caseItem.id, method.id, cacheKey);
    if (cached) {
      return cached;
    }

    const output = await callDeepSeekModel(
      toMessages(prompt),
      { model: DEFAULT_EXPERIMENT_MODEL, temperature: DEFAULT_TEMPERATURE }
    );
    const latencyMs = Date.now() - startedAt;

    const metrics = buildMetrics({
      contextText,
      retrievedChunks: knowledgeChunks.length,
      latencyMs,
      output,
      reference: caseItem.reference,
    });

    let judgeResult: Awaited<ReturnType<typeof judgeOutput>> | null = null;
    if (judge) {
      try {
        judgeResult = await judgeOutput(caseItem.reference, output);
      } catch {
        judgeResult = null;
      }
    }

    const result: ExperimentRunResult = {
      caseId: caseItem.id,
      method: method.id,
      methodLabel: method.label,
      retrievalMode: method.retrievalMode,
      prompt,
      chartData,
      contextText,
      retrievedKnowledge: knowledgeChunks,
      output,
      metrics,
      judge: judgeResult?.parsed ?? null,
      rawJudgeResponse: judgeResult?.raw,
    };
    await saveCachedResult(caseItem.id, method.id, cacheKey, result);
    return result;
  })();

  try {
    return await Promise.race([
      execution,
      new Promise<ExperimentRunResult>((resolve) => {
        setTimeout(() => {
          resolve(finalizeError(`Method timed out after ${hardTimeoutMs}ms`));
        }, hardTimeoutMs);
      }),
    ]);
  } catch (error: any) {
    const message = error?.message || String(error);
    return finalizeError(message);
  }
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  const limit = Math.max(1, concurrency);
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) return;
      await worker(items[current]);
    }
  });
  await Promise.all(runners);
}

export async function runExperiments(options: RunExperimentOptions = {}) {
  await loadLocalEnv();
  const cases = options.caseId ? [await getCaseById(options.caseId)] : await loadCases();
  return runExperimentsForCases(cases, {
    methods: options.methods,
    judge: options.judge,
    markdown: options.markdown,
    outputDir: options.outputDir,
  });
}

export async function runExperimentsForCases(cases: ExperimentCase[], options: Omit<RunExperimentOptions, 'caseId'> = {}) {
  await loadLocalEnv();
  const methods = METHOD_DEFINITIONS.filter((item) => !options.methods?.length || options.methods.includes(item.id));
  const bundles = new Map<string, ExperimentCaseBundle>();
  const chartPromises = new Map<string, Promise<BaziResponse | null>>();
  const tasks: Array<{ caseItem: ExperimentCase; method: (typeof METHOD_DEFINITIONS)[number] }> = [];

  for (const caseItem of cases) {
    bundles.set(caseItem.id, { caseInfo: caseItem, results: [] });
    if (methods.some((method) => method.useChart)) {
      chartPromises.set(caseItem.id, maybeFetchChart(true, caseItem.params));
    }
    for (const method of methods) {
      tasks.push({ caseItem, method });
    }
  }

  await runWithConcurrency(tasks, options.concurrency ?? DEFAULT_EXPERIMENT_CONCURRENCY, async ({ caseItem, method }) => {
    const result = await runSingleMethod(
      caseItem,
      method,
      options.judge !== false,
      chartPromises.get(caseItem.id)
    );
    const bundle = bundles.get(caseItem.id);
    if (!bundle) return;
    bundle.results.push(result);
  });

  const orderedBundles: ExperimentCaseBundle[] = cases.map((caseItem) => {
    const bundle = bundles.get(caseItem.id)!;
    bundle.results.sort(
      (a, b) =>
        methods.findIndex((item) => item.id === a.method) -
        methods.findIndex((item) => item.id === b.method)
    );
    return bundle;
  });

  const summary = buildSummary(orderedBundles);
  const outputDir = options.outputDir || path.join(process.cwd(), '实验', 'outputs');
  const runDir = await writeOutputFiles(outputDir, orderedBundles, summary, options.markdown !== false);
  return { bundles: orderedBundles, summary, runDir };
}
