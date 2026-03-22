import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const cacheRoot = path.join(root, '实验', 'cache', 'method-results');
const outputsRoot = path.join(root, '实验', 'outputs');
const sourceFile = path.join(root, '实验案例', '八字案例.txt');

const methodOrder = ['A', 'B', 'C', 'D', 'E'];
const methodLabels = {
  A: 'Baseline A：通用大模型直接问',
  B: 'Baseline B：专业排盘 + 通用提问',
  C: 'Method C：专业排盘 + 结构化提示词',
  D: 'Method D：专业排盘 + 结构化提示词 + 原始古籍切块检索',
  E: 'Method E：专业排盘 + 结构化提示词 + 层次化知识增强',
};

function average(values) {
  if (!values.length) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Number((sum / values.length).toFixed(4));
}

function buildSummary(bundles) {
  const results = bundles.flatMap((bundle) => bundle.results);
  const methods = methodOrder
    .map((method) => {
      const items = results.filter((result) => result.method === method);
      if (!items.length) return null;
      return {
        method,
        methodLabel: methodLabels[method],
        avg_ctx_chars: average(items.map((item) => item.metrics.ctx_chars)),
        avg_retrieved_chunks: average(items.map((item) => item.metrics.retrieved_chunks)),
        avg_latency_ms: average(items.map((item) => item.metrics.latency_ms)),
        avg_output_chars: average(items.map((item) => item.metrics.output_chars)),
        avg_conclusion_coverage: average(items.map((item) => item.metrics.conclusion_coverage)),
        avg_evidence_coverage: average(items.map((item) => item.metrics.evidence_coverage)),
      };
    })
    .filter(Boolean);

  return { caseCount: bundles.length, methods };
}

function parseSourceCases(text) {
  const regex = /(?:^|\n)(\d+)\.\s*\n时间：([^\n]+)\n八字：\n([乾坤]：[^\n]+)\n分析：([\s\S]*?)(?=\n\d+\.\s*\n|\s*$)/g;
  const result = new Map();
  for (const match of text.matchAll(regex)) {
    result.set(`casebook-${String(Number(match[1])).padStart(3, '0')}`, {
      caseId: `casebook-${String(Number(match[1])).padStart(3, '0')}`,
      caseNumber: Number(match[1]),
      originalTimeText: match[2].trim(),
      baziText: match[3].trim(),
      analysis: match[4].replace(/\s+/g, ' ').trim(),
    });
  }
  return result;
}

function extractQuestion(promptUser) {
  return promptUser.match(/问题：([^\n]+)/)?.[1]?.trim() || '';
}

async function loadCaseBundle(caseId, sourceMap) {
  const dir = path.join(cacheRoot, caseId);
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  const results = [];
  for (const method of methodOrder) {
    const file = files.find((name) => name.startsWith(`${method}-`));
    if (!file) continue;
    const parsed = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
    results.push(parsed);
  }
  if (!results.length) {
    throw new Error(`No cached results found for ${caseId}`);
  }
  const source = sourceMap.get(caseId);
  if (!source) {
    throw new Error(`Missing source metadata for ${caseId}`);
  }
  return {
    caseInfo: {
      id: caseId,
      name: `案例 ${source.caseNumber}`,
      question: extractQuestion(results[0].prompt?.user || ''),
      originalTimeText: source.originalTimeText,
      baziText: source.baziText,
      analysis: source.analysis,
    },
    results,
  };
}

function buildStageReport(bundles) {
  const summary = buildSummary(bundles);
  const methodMap = new Map(summary.methods.map((item) => [item.method, item]));
  const lines = [];
  lines.push('八字消融实验阶段性记录（案例 116、7、112）');
  lines.push('');
  lines.push('说明：');
  lines.push('1. 本记录包含三个案例。');
  lines.push('2. 缓存已按“每个案例每个方法只保留最新可用结果”的规则收敛。');
  lines.push('3. D 使用《盲派基础第一册》原始 PDF 提取文本的原文切块检索基线。');
  lines.push('4. E 使用结构化知识库的层次化检索。');
  lines.push('5. 本阶段未执行 judge 评分，保留工程指标、覆盖率与完整模型输出。');
  lines.push('');
  lines.push('方法平均指标：');

  for (const method of methodOrder) {
    const item = methodMap.get(method);
    if (!item) continue;
    lines.push(`${item.methodLabel}`);
    lines.push(`  平均上下文长度: ${item.avg_ctx_chars}`);
    lines.push(`  平均命中块数: ${item.avg_retrieved_chunks}`);
    lines.push(`  平均耗时(ms): ${item.avg_latency_ms}`);
    lines.push(`  平均输出长度: ${item.avg_output_chars}`);
    lines.push(`  平均结论覆盖率: ${item.avg_conclusion_coverage}`);
    lines.push(`  平均判据覆盖率: ${item.avg_evidence_coverage}`);
  }

  const d = methodMap.get('D');
  const e = methodMap.get('E');
  if (d && e) {
    lines.push('');
    lines.push('D/E 对比观察：');
    lines.push(`  D 平均上下文长度: ${d.avg_ctx_chars}`);
    lines.push(`  E 平均上下文长度: ${e.avg_ctx_chars}`);
    lines.push(`  D 平均结论覆盖率: ${d.avg_conclusion_coverage}`);
    lines.push(`  E 平均结论覆盖率: ${e.avg_conclusion_coverage}`);
    lines.push(`  D 平均判据覆盖率: ${d.avg_evidence_coverage}`);
    lines.push(`  E 平均判据覆盖率: ${e.avg_evidence_coverage}`);
  }

  for (const bundle of bundles) {
    lines.push('');
    lines.push('==========================================================================================');
    lines.push(`案例 ${bundle.caseInfo.id.replace('casebook-', '').replace(/^0+/, '')}`);
    lines.push(`时间：${bundle.caseInfo.originalTimeText}`);
    lines.push(`八字：${bundle.caseInfo.baziText}`);
    lines.push(`原始解析：${bundle.caseInfo.analysis}`);
    lines.push(`实验问题：${bundle.caseInfo.question}`);

    for (const result of bundle.results) {
      lines.push('');
      lines.push('----------------------------------------------------------------------');
      lines.push(result.methodLabel);
      lines.push(`检索模式：${result.retrievalMode}`);
      lines.push(`上下文长度：${result.metrics.ctx_chars}`);
      lines.push(`命中块数：${result.metrics.retrieved_chunks}`);
      lines.push(`耗时(ms)：${result.metrics.latency_ms}`);
      lines.push(`输出长度：${result.metrics.output_chars}`);
      lines.push(`结论覆盖率：${result.metrics.conclusion_coverage}`);
      lines.push(`判据覆盖率：${result.metrics.evidence_coverage}`);
      lines.push('模型输出：');
      lines.push(result.output);
    }
  }

  return lines.join('\n');
}

async function main() {
  const caseIds = process.argv.slice(2);
  if (!caseIds.length) {
    throw new Error('Usage: node 实验/rebuild_subset_reports.mjs casebook-116 casebook-007 casebook-112');
  }

  await fs.mkdir(outputsRoot, { recursive: true });
  const sourceText = await fs.readFile(sourceFile, 'utf8');
  const sourceMap = parseSourceCases(sourceText);
  const bundles = [];
  const manifest = [];

  for (const caseId of caseIds) {
    const bundle = await loadCaseBundle(caseId, sourceMap);
    bundles.push(bundle);
    for (const result of bundle.results) {
      const dir = path.join(cacheRoot, caseId);
      const files = (await fs.readdir(dir)).filter((name) => name.startsWith(`${result.method}-`) && name.endsWith('.json')).sort();
      manifest.push({
        case: caseId,
        method: result.method,
        kept: files[0] || null,
        rule: result.error ? 'latest_error' : 'latest_success',
        error: Boolean(result.error),
      });
    }
  }

  const stageText = buildStageReport(bundles);
  await fs.writeFile(path.join(outputsRoot, '阶段性实验记录_116_7_112.txt'), stageText, 'utf8');
  await fs.writeFile(path.join(root, '实验', 'cache', 'latest-selected-manifest-3cases.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
