import { NextResponse } from 'next/server';
import { listCaseSummaries } from '@/实验/core/cases';
import { runExperiments } from '@/实验/core/engine';
import type { ExperimentMethodId } from '@/实验/types';

export async function GET() {
  const cases = await listCaseSummaries();
  return NextResponse.json({
    methods: ['A', 'B', 'C', 'D', 'E'],
    cases,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const caseId = typeof body.caseId === 'string' ? body.caseId : '';
  const methods = Array.isArray(body.methods)
    ? body.methods.filter((item: unknown): item is ExperimentMethodId => ['A', 'B', 'C', 'D', 'E'].includes(String(item))) as ExperimentMethodId[]
    : undefined;

  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
  }

  const result = await runExperiments({
    caseId,
    methods,
    judge: body.judge !== false,
    markdown: false,
  });

  return NextResponse.json({
    summary: result.summary,
    bundle: result.bundles[0],
    runDir: result.runDir,
  });
}

