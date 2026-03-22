import fs from 'node:fs/promises';
import path from 'node:path';
import type { ExperimentCaseBundle, ExperimentSummary, ExperimentRunResult, JudgeScores } from '../types.ts';

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

function averageJudgeScores(scores: JudgeScores[]) {
  if (!scores.length) return null;
  return {
    专业性: average(scores.map((item) => item.专业性)),
    判据充分性: average(scores.map((item) => item.判据充分性)),
    结论一致性: average(scores.map((item) => item.结论一致性)),
    结构完整性: average(scores.map((item) => item.结构完整性)),
    知识匹配有效性: average(scores.map((item) => item.知识匹配有效性)),
    总分: average(scores.map((item) => item.总分)),
    评语: '平均分汇总',
  };
}

export function buildSummary(bundles: ExperimentCaseBundle[]): ExperimentSummary {
  const allResults = bundles.flatMap((bundle) => bundle.results);
  const methodGroups = new Map<string, ExperimentRunResult[]>();

  allResults.forEach((result) => {
    const list = methodGroups.get(result.method) || [];
    list.push(result);
    methodGroups.set(result.method, list);
  });

  const methods = Array.from(methodGroups.entries()).map(([method, results]) => ({
    method: results[0].method,
    methodLabel: results[0].methodLabel,
    avg_ctx_chars: average(results.map((item) => item.metrics.ctx_chars)),
    avg_retrieved_chunks: average(results.map((item) => item.metrics.retrieved_chunks)),
    avg_latency_ms: average(results.map((item) => item.metrics.latency_ms)),
    avg_output_chars: average(results.map((item) => item.metrics.output_chars)),
    avg_conclusion_coverage: average(results.map((item) => item.metrics.conclusion_coverage)),
    avg_evidence_coverage: average(results.map((item) => item.metrics.evidence_coverage)),
    avg_judge_scores: averageJudgeScores(results.map((item) => item.judge).filter(Boolean) as JudgeScores[]),
  }));

  const d = methods.find((item) => item.method === 'D');
  const e = methods.find((item) => item.method === 'E');

  return {
    generatedAt: new Date().toISOString(),
    caseCount: bundles.length,
    methods,
    cases: bundles.map((bundle) => ({
      caseId: bundle.caseInfo.id,
      methodResults: bundle.results.map((result) => ({
        method: result.method,
        metrics: result.metrics,
        judge: result.judge,
      })),
    })),
    dVsE: d && e
      ? {
          avgCtxCharsDelta: Number((d.avg_ctx_chars - e.avg_ctx_chars).toFixed(4)),
          avgRetrievedChunksDelta: Number((d.avg_retrieved_chunks - e.avg_retrieved_chunks).toFixed(4)),
          avgKnowledgeMatchDelta: Number((((e.avg_judge_scores?.知识匹配有效性 || 0) - (d.avg_judge_scores?.知识匹配有效性 || 0))).toFixed(4)),
        }
      : null,
  };
}

export function buildMarkdownReport(bundles: ExperimentCaseBundle[], summary: ExperimentSummary) {
  const lines: string[] = [];
  lines.push('# 八字消融实验报告');
  lines.push('');
  lines.push(`生成时间：${summary.generatedAt}`);
  lines.push(`案例数量：${summary.caseCount}`);
  lines.push('');
  lines.push('## 方法平均指标');
  lines.push('');
  lines.push('| 方法 | ctx_chars | chunks | latency_ms | output_chars | conclusion_cov | evidence_cov | judge_total |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  summary.methods.forEach((item) => {
    lines.push(`| ${item.methodLabel} | ${item.avg_ctx_chars} | ${item.avg_retrieved_chunks} | ${item.avg_latency_ms} | ${item.avg_output_chars} | ${item.avg_conclusion_coverage} | ${item.avg_evidence_coverage} | ${item.avg_judge_scores?.总分 ?? '-'} |`);
  });
  lines.push('');

  bundles.forEach((bundle) => {
    lines.push(`## 案例：${bundle.caseInfo.name} (${bundle.caseInfo.id})`);
    lines.push('');
    lines.push(`问题：${bundle.caseInfo.question}`);
    lines.push('');
    lines.push(`参考摘要：${bundle.caseInfo.reference.summary}`);
    lines.push('');
    bundle.results.forEach((result) => {
      lines.push(`### ${result.methodLabel}`);
      lines.push('');
      lines.push(`- 检索模式：${result.retrievalMode}`);
      lines.push(`- 上下文长度：${result.metrics.ctx_chars}`);
      lines.push(`- 命中块数：${result.metrics.retrieved_chunks}`);
      lines.push(`- 耗时(ms)：${result.metrics.latency_ms}`);
      lines.push(`- 结论覆盖率：${result.metrics.conclusion_coverage}`);
      lines.push(`- 判据覆盖率：${result.metrics.evidence_coverage}`);
      if (result.judge) {
        lines.push(`- Judge 总分：${result.judge.总分}`);
        lines.push(`- Judge 评语：${result.judge.评语}`);
      }
      lines.push('');
      lines.push('```text');
      lines.push(result.output);
      lines.push('```');
      lines.push('');
    });
  });

  return lines.join('\n');
}

export function buildReviewCsv(bundles: ExperimentCaseBundle[]) {
  const header = ['caseId', 'caseName', 'method', '专业性', '判据充分性', '结论一致性', '结构完整性', '知识匹配有效性', '总分', '评语'];
  const rows = [header.join(',')];
  bundles.forEach((bundle) => {
    bundle.results.forEach((result) => {
      rows.push([
        bundle.caseInfo.id,
        bundle.caseInfo.name,
        result.method,
        result.judge?.专业性 ?? '',
        result.judge?.判据充分性 ?? '',
        result.judge?.结论一致性 ?? '',
        result.judge?.结构完整性 ?? '',
        result.judge?.知识匹配有效性 ?? '',
        result.judge?.总分 ?? '',
        JSON.stringify(result.judge?.评语 ?? ''),
      ].join(','));
    });
  });
  return rows.join('\n');
}

export async function writeOutputFiles(outputDir: string, bundles: ExperimentCaseBundle[], summary: ExperimentSummary, markdown: boolean) {
  await fs.mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(outputDir, timestamp);
  await fs.mkdir(runDir, { recursive: true });

  await fs.writeFile(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  await fs.writeFile(path.join(runDir, 'results.json'), JSON.stringify(bundles, null, 2), 'utf8');
  await fs.writeFile(path.join(runDir, 'review.csv'), buildReviewCsv(bundles), 'utf8');
  if (markdown) {
    await fs.writeFile(path.join(runDir, 'report.md'), buildMarkdownReport(bundles, summary), 'utf8');
  }

  return runDir;
}
