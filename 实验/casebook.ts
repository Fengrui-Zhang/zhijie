import fs from 'node:fs/promises';
import path from 'node:path';
import type { CaseReference, ExperimentCase, ExperimentCaseBundle, ExperimentMethodId, ExperimentSummary, ReferencePoint } from './types.ts';
import { runExperimentsForCases } from './core/engine.ts';
import { loadLocalEnv } from './core/env.ts';
import { fetchBaziChart } from './core/chart.ts';

type RawCaseEntry = {
  index: number;
  originalTimeText: string;
  pillarLabel: string;
  expectedBazi: string;
  analysis: string;
};

type SelectedCase = {
  index: number;
  originalTimeText: string;
  adjustedTimeText: string;
  expectedBazi: string;
  actualBazi: string;
  theme: string;
  question: string;
  analysis: string;
  experimentCase: ExperimentCase;
};

type RejectedCase = {
  index: number;
  reason: string;
  originalTimeText: string;
  adjustedTimeText?: string;
  expectedBazi: string;
  actualBazi?: string;
};

const SOURCE_FILE = path.join(process.cwd(), '实验案例', '八字案例.txt');
const OUTPUT_ROOT = path.join(process.cwd(), '实验', 'outputs', 'casebook');
const TARGET_COUNT = 10;
const DEFAULT_SEED = 20260317;
const METHOD_IDS: ExperimentMethodId[] = ['A', 'B', 'C', 'D', 'E'];

const THEME_RULES = [
  {
    key: '财运',
    keywords: ['发财', '发大财', '巨富', '富命', '数十亿', '资产', '股票', '庄家', '有钱', '没钱', '财运', '财星', '求财'],
    template: '请结合此人的八字，重点分析其财运层次、求财方式以及人生中的主要财富起伏。',
  },
  {
    key: '官运事业',
    keywords: ['当官', '官帽', '副书记', '厅长', '校长', '管理', '大官', '升', '仕途', '权力', '官运', '处级干部'],
    template: '请结合此人的八字，重点分析其事业发展、是否有官运或管理职位，以及关键阶段的起伏变化。',
  },
  {
    key: '学历学业',
    keywords: ['文凭', '高考', '第一名', '博士后', '留学', '理科', '学历', '学业', '讲师', '学校'],
    template: '请结合此人的八字，重点分析其学历学业、学习能力与未来职业发展的方向。',
  },
  {
    key: '才华表达',
    keywords: ['口才', '讲演', '表达', '能说会道', '记忆力', '反应很快', '才华', '文化行业'],
    template: '请结合此人的八字，重点分析其才华表达能力、事业适配方向，以及这类能力能否转化为现实成就。',
  },
  {
    key: '风险起伏',
    keywords: ['坐牢', '车祸', '强毙', '强奸', '不吉', '倒', '风险', '官非'],
    template: '请结合此人的八字，重点分析其人生中的主要风险点、财务或官非隐患，以及关键运程变化。',
  },
];

const KEYWORD_TERMS = [
  '寅午戌', '卯酉冲', '巳申合', '寅申冲', '辰戌冲', '丑未冲', '子午冲', '卯辰穿', '子未穿', '酉戌穿',
  '木火成势', '金水成势', '火与燥土成势', '火与燥土结党', '金水成党', '水木成势', '湿土与金水结党',
  '做功', '成势', '结党', '合局', '入墓', '墓库', '虚透', '坐禄', '印', '官', '杀', '财', '伤官', '食神',
  '比劫', '羊刃', '财库', '印库', '官杀库', '制财', '制官', '制印', '伤官生财', '食伤制印', '官制伤官',
  '比劫制杀', '禄冲七杀', '反向做功', '主位', '宾位', '体', '用', '戊癸合', '甲己合', '丁壬合', '丙辛合',
  '巳酉合', '丁亥合', '午亥合', '丁火被制', '酉金为财', '财统官',
];

const OUTCOME_HINTS = ['发财', '发大财', '巨富', '有钱', '没钱', '当官', '校长', '副书记', '厅长', '讲师', '博士后', '高考第一名', '口才', '能说会道', '坐牢', '车祸', '强毙', '不当官了', '升'];
const EVIDENCE_HINTS = ['冲', '合', '制', '做功', '成势', '结党', '入墓', '虚透', '坐禄', '印', '官', '杀', '财', '伤官', '食神', '比劫', '墓库', '功神'];

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const random = mulberry32(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeBazi(text: string) {
  return text.replace(/^[乾坤]\s*[:：]\s*/, '').replace(/\s+/g, ' ').trim();
}

function formatDateParts(parts: { year: number; month: number; day: number; hours: number; minute: number }) {
  const minute = String(parts.minute).padStart(2, '0');
  const hour = String(parts.hours).padStart(2, '0');
  return `${parts.year}年${parts.month}月${parts.day}日 ${hour}:${minute}`;
}

function parseTimeText(input: string) {
  const match = input.match(/(\d{3,4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})/);
  if (!match) {
    throw new Error(`无法解析时间: ${input}`);
  }
  const [, year, month, day, hours, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hours: Number(hours),
    minute: Number(minute),
  };
}

function tryFormatAdjustedTime(input: string) {
  try {
    return formatDateParts(addOneHour(parseTimeText(input)));
  } catch {
    return '—';
  }
}

function addOneHour(parts: { year: number; month: number; day: number; hours: number; minute: number }) {
  const dt = new Date(parts.year, parts.month - 1, parts.day, parts.hours, parts.minute, 0, 0);
  dt.setHours(dt.getHours() + 1);
  return {
    year: dt.getFullYear(),
    month: dt.getMonth() + 1,
    day: dt.getDate(),
    hours: dt.getHours(),
    minute: dt.getMinutes(),
  };
}

function splitAnalysisFragments(text: string) {
  return text
    .split(/[。；]/)
    .flatMap((item) => item.split(/，/))
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 4);
}

function extractTerms(text: string) {
  const terms = KEYWORD_TERMS.filter((term) => text.includes(term));
  const compact = text.replace(/[()（）"“”]/g, '').trim();
  if (compact && compact.length <= 24) terms.push(compact);
  return Array.from(new Set(terms)).slice(0, 6);
}

function buildPoints(fragments: string[], prefix: string, limit: number): ReferencePoint[] {
  return fragments.slice(0, limit).map((fragment, index) => ({
    id: `${prefix}-${index + 1}`,
    label: fragment,
    keywords: extractTerms(fragment).length ? extractTerms(fragment) : [fragment],
  }));
}

function inferTheme(analysis: string) {
  let best = THEME_RULES[0];
  let bestScore = -1;
  for (const rule of THEME_RULES) {
    const score = rule.keywords.reduce((sum, keyword) => sum + (analysis.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }
  return best;
}

function buildReference(analysis: string, theme: string): CaseReference {
  const fragments = splitAnalysisFragments(analysis);
  const conclusionFragments = fragments.filter((item) => OUTCOME_HINTS.some((hint) => item.includes(hint)));
  const evidenceFragments = fragments.filter((item) => EVIDENCE_HINTS.some((hint) => item.includes(hint)));
  const finalConclusions = conclusionFragments.length ? conclusionFragments : fragments.slice(-3);
  const finalEvidence = evidenceFragments.length ? evidenceFragments : fragments.slice(0, 4);
  return {
    summary: `该案例以${theme}为主要关注点，原始解析强调：${finalConclusions.slice(0, 2).join('；') || analysis.slice(0, 50)}`,
    conclusion_points: buildPoints(finalConclusions, 'conclusion', 4),
    evidence_points: buildPoints(finalEvidence, 'evidence', 4),
    source_notes: ['来源：实验案例/八字案例.txt 原始人工整理案例。'],
    raw_reference_text: analysis,
  };
}

function buildQuestion(analysis: string) {
  const theme = inferTheme(analysis);
  return {
    theme: theme.key,
    question: theme.template,
  };
}

function parseCasebook(text: string): RawCaseEntry[] {
  const entries: RawCaseEntry[] = [];
  const regex = /(?:^|\n)(\d+)\.\s*\n时间：([^\n]+)\n八字：\n([乾坤]：[^\n]+)\n分析：([\s\S]*?)(?=\n\d+\.\s*\n|\s*$)/g;
  for (const match of text.matchAll(regex)) {
    entries.push({
      index: Number(match[1]),
      originalTimeText: match[2].trim(),
      pillarLabel: match[3].trim(),
      expectedBazi: normalizeBazi(match[3]),
      analysis: match[4].replace(/\s+/g, ' ').trim(),
    });
  }
  return entries;
}

async function validateAndBuildCase(entry: RawCaseEntry): Promise<SelectedCase> {
  const original = parseTimeText(entry.originalTimeText);
  const adjusted = addOneHour(original);
  const sex = entry.pillarLabel.startsWith('乾') ? 0 : 1;
  const { theme, question } = buildQuestion(entry.analysis);
  const experimentCase: ExperimentCase = {
    id: `casebook-${String(entry.index).padStart(3, '0')}`,
    name: `案例${entry.index}`,
    board: 'bazi',
    params: {
      year: adjusted.year,
      month: adjusted.month,
      day: adjusted.day,
      hours: adjusted.hours,
      minute: adjusted.minute,
      sex,
      name: `案例${entry.index}`,
    },
    question,
    reference: buildReference(entry.analysis, theme),
  };

  const chart = await fetchBaziChart(experimentCase.params);
  const actualBazi = normalizeBazi(chart.bazi_info.bazi.join(' '));
  if (actualBazi !== entry.expectedBazi) {
    throw new Error(`排盘不一致，期望=${entry.expectedBazi}，实际=${actualBazi}`);
  }

  return {
    index: entry.index,
    originalTimeText: entry.originalTimeText,
    adjustedTimeText: formatDateParts(adjusted),
    expectedBazi: entry.expectedBazi,
    actualBazi,
    theme,
    question,
    analysis: entry.analysis,
    experimentCase,
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  let count = TARGET_COUNT;
  let seed = DEFAULT_SEED;
  let judge = true;
  let concurrency: number | undefined;
  let methods: ExperimentMethodId[] | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--count' && args[i + 1]) {
      count = Number(args[i + 1]);
      i += 1;
    } else if (arg === '--seed' && args[i + 1]) {
      seed = Number(args[i + 1]);
      i += 1;
    } else if (arg === '--no-judge') {
      judge = false;
    } else if (arg === '--concurrency' && args[i + 1]) {
      concurrency = Number(args[i + 1]);
      i += 1;
    } else if (arg === '--methods' && args[i + 1]) {
      methods = args[i + 1].split(',').map((item) => item.trim()).filter(Boolean) as ExperimentMethodId[];
      i += 1;
    }
  }
  return { count, seed, judge, concurrency, methods };
}

function buildTextRecord(input: {
  selected: SelectedCase[];
  rejected: RejectedCase[];
  bundles: ExperimentCaseBundle[];
  summary: ExperimentSummary;
  runDir: string;
  seed: number;
}) {
  const lines: string[] = [];
  lines.push('八字案例消融实验记录');
  lines.push(`生成时间：${new Date().toISOString()}`);
  lines.push(`随机种子：${input.seed}`);
  lines.push(`实验目录：${input.runDir}`);
  lines.push('实验前提：结构化提示词已与 App.tsx 中八字主提示词对齐；层次化检索沿用 data/index/bazi.json 与 utils/knowledge.ts。');
  lines.push('');
  lines.push(`成功入选案例数：${input.selected.length}`);
  lines.push(`排盘不一致/跳过案例数：${input.rejected.length}`);
  if (input.rejected.length) {
    lines.push('');
    lines.push('跳过案例：');
    for (const rejected of input.rejected) {
      lines.push(`- 案例${rejected.index} | 原时间：${rejected.originalTimeText} | 调整后：${rejected.adjustedTimeText || '—'} | 原因：${rejected.reason}`);
      if (rejected.actualBazi) {
        lines.push(`  期望八字：${rejected.expectedBazi}`);
        lines.push(`  实际八字：${rejected.actualBazi}`);
      }
    }
  }

  lines.push('');
  lines.push('方法平均指标：');
  for (const method of input.summary.methods) {
    lines.push(`${method.methodLabel}`);
    lines.push(`  平均上下文长度: ${method.avg_ctx_chars}`);
    lines.push(`  平均命中块数: ${method.avg_retrieved_chunks}`);
    lines.push(`  平均耗时(ms): ${method.avg_latency_ms}`);
    lines.push(`  平均结论覆盖率: ${method.avg_conclusion_coverage}`);
    lines.push(`  平均判据覆盖率: ${method.avg_evidence_coverage}`);
    lines.push(`  Judge总分: ${method.avg_judge_scores?.总分 ?? '—'}`);
  }
  if (input.summary.dVsE) {
    lines.push('');
    lines.push('D 与 E 对比：');
    lines.push(`  平均上下文长度差值(D-E): ${input.summary.dVsE.avgCtxCharsDelta}`);
    lines.push(`  平均命中块数差值(D-E): ${input.summary.dVsE.avgRetrievedChunksDelta}`);
    lines.push(`  平均知识匹配有效性提升(E-D): ${input.summary.dVsE.avgKnowledgeMatchDelta}`);
  }

  for (const selected of input.selected) {
    const bundle = input.bundles.find((item) => item.caseInfo.id === selected.experimentCase.id);
    if (!bundle) continue;
    lines.push('');
    lines.push('='.repeat(80));
    lines.push(`案例${selected.index}`);
    lines.push(`原时间：${selected.originalTimeText}`);
    lines.push(`实验排盘时间：${selected.adjustedTimeText}`);
    lines.push(`案例八字：${selected.expectedBazi}`);
    lines.push(`实际排盘：${selected.actualBazi}`);
    lines.push(`主题判断：${selected.theme}`);
    lines.push(`自动生成问题：${selected.question}`);
    lines.push(`原始解析：${selected.analysis}`);
    lines.push('');
    for (const result of bundle.results) {
      lines.push('-'.repeat(60));
      lines.push(result.methodLabel);
      lines.push(`检索模式：${result.retrievalMode}`);
      lines.push(`上下文长度：${result.metrics.ctx_chars}`);
      lines.push(`命中块数：${result.metrics.retrieved_chunks}`);
      lines.push(`耗时(ms)：${result.metrics.latency_ms}`);
      lines.push(`结论覆盖率：${result.metrics.conclusion_coverage}`);
      lines.push(`判据覆盖率：${result.metrics.evidence_coverage}`);
      if (result.judge) {
        lines.push(`Judge评分：专业性=${result.judge.专业性}，判据充分性=${result.judge.判据充分性}，结论一致性=${result.judge.结论一致性}，结构完整性=${result.judge.结构完整性}，知识匹配有效性=${result.judge.知识匹配有效性}，总分=${result.judge.总分}`);
        lines.push(`Judge评语：${result.judge.评语}`);
      }
      if (result.error) {
        lines.push(`方法错误：${result.error}`);
      }
      lines.push('模型输出：');
      lines.push(result.output);
      lines.push('');
    }
  }

  return lines.join('\n');
}

async function main() {
  const { count, seed, judge, concurrency, methods } = parseArgs();
  await loadLocalEnv();

  const rawText = await fs.readFile(SOURCE_FILE, 'utf8');
  const parsedEntries = parseCasebook(rawText);
  if (!parsedEntries.length) {
    throw new Error('未能从案例文本中解析出任何案例。');
  }

  const shuffledEntries = shuffleWithSeed(parsedEntries, seed);
  const selected: SelectedCase[] = [];
  const rejected: RejectedCase[] = [];

  for (const entry of shuffledEntries) {
    if (selected.length >= count) break;
    try {
      const result = await validateAndBuildCase(entry);
      selected.push(result);
      console.log(`已选案例${entry.index}: ${result.expectedBazi}`);
    } catch (error: any) {
      const message = error?.message || String(error);
      const actualMatch = message.match(/实际=([^]+)$/);
      rejected.push({
        index: entry.index,
        reason: message,
        originalTimeText: entry.originalTimeText,
        adjustedTimeText: tryFormatAdjustedTime(entry.originalTimeText),
        expectedBazi: entry.expectedBazi,
        actualBazi: actualMatch?.[1],
      });
      console.log(`跳过案例${entry.index}: ${message}`);
    }
  }

  if (selected.length < count) {
    throw new Error(`仅找到 ${selected.length} 个排盘一致案例，少于目标数量 ${count}。`);
  }

  const runResult = await runExperimentsForCases(
    selected.map((item) => item.experimentCase),
    {
      methods: methods?.length ? methods : METHOD_IDS,
      judge,
      markdown: true,
      outputDir: OUTPUT_ROOT,
      concurrency,
    }
  );

  await fs.writeFile(path.join(runResult.runDir, 'selected_cases.json'), JSON.stringify(selected, null, 2), 'utf8');
  await fs.writeFile(path.join(runResult.runDir, 'rejected_cases.json'), JSON.stringify(rejected, null, 2), 'utf8');
  await fs.writeFile(
    path.join(runResult.runDir, '案例实验记录.txt'),
    buildTextRecord({
      selected,
      rejected,
      bundles: runResult.bundles,
      summary: runResult.summary,
      runDir: runResult.runDir,
      seed,
    }),
    'utf8'
  );

  console.log(`案例实验完成，输出目录: ${runResult.runDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
