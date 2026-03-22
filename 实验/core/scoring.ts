import type { CaseReference, ExperimentMetrics, JudgeScores } from '../types.ts';
import { callDeepSeekModel } from './model.ts';

function normalizeText(text: string) {
  return text.replace(/\s+/g, '').toLowerCase();
}

function pointCoverage(text: string, points: Array<{ keywords: string[] }>) {
  const normalized = normalizeText(text);
  if (!points.length) return 1;
  const hits = points.filter((point) => point.keywords.some((keyword) => normalized.includes(normalizeText(keyword))));
  return Number((hits.length / points.length).toFixed(4));
}

export function buildMetrics(input: {
  contextText: string;
  retrievedChunks: number;
  latencyMs: number;
  output: string;
  reference: CaseReference;
}): ExperimentMetrics {
  return {
    ctx_chars: input.contextText.length,
    retrieved_chunks: input.retrievedChunks,
    latency_ms: input.latencyMs,
    output_chars: input.output.length,
    conclusion_coverage: pointCoverage(input.output, input.reference.conclusion_points),
    evidence_coverage: pointCoverage(input.output, input.reference.evidence_points),
  };
}

function buildJudgePrompt(reference: CaseReference, output: string) {
  const schema = {
    专业性: 1,
    判据充分性: 1,
    结论一致性: 1,
    结构完整性: 1,
    知识匹配有效性: 1,
    总分: 1,
    评语: '简要评价',
  };

  return [
    '你是命理文本评测助手。请根据参考标签对候选输出进行评分。',
    '评分标准：每项 1-5 分，总分取五项平均后保留两位小数。',
    '只输出严格 JSON，不要附加解释。',
    '',
    '【参考摘要】',
    reference.summary,
    '',
    '【关键结论点】',
    ...reference.conclusion_points.map((item) => `- ${item.label}`),
    '',
    '【关键判据点】',
    ...reference.evidence_points.map((item) => `- ${item.label}`),
    '',
    '【候选输出】',
    output,
    '',
    '【输出 JSON Schema】',
    JSON.stringify(schema),
  ].join('\n');
}

function parseJudgeResponse(raw: string): JudgeScores {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  const jsonText = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  const parsed = JSON.parse(jsonText) as JudgeScores;
  return {
    专业性: Number(parsed.专业性) || 0,
    判据充分性: Number(parsed.判据充分性) || 0,
    结论一致性: Number(parsed.结论一致性) || 0,
    结构完整性: Number(parsed.结构完整性) || 0,
    知识匹配有效性: Number(parsed.知识匹配有效性) || 0,
    总分: Number(parsed.总分) || 0,
    评语: parsed.评语 || '',
  };
}

export async function judgeOutput(reference: CaseReference, output: string) {
  const judgePrompt = buildJudgePrompt(reference, output);
  const raw = await callDeepSeekModel(
    [
      {
        role: 'system',
        content: '你是严格的命理输出评分器，只能输出 JSON。',
      },
      {
        role: 'user',
        content: judgePrompt,
      },
    ],
    { model: 'deepseek-chat', temperature: 0.1 }
  );
  return {
    raw,
    parsed: parseJudgeResponse(raw),
  };
}
