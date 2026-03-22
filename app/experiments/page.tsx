'use client';

import React, { useEffect, useMemo, useState } from 'react';

type CaseSummary = {
  id: string;
  name: string;
  board: 'bazi';
  question: string;
  summary: string;
};

type JudgeScores = {
  专业性: number;
  判据充分性: number;
  结论一致性: number;
  结构完整性: number;
  知识匹配有效性: number;
  总分: number;
  评语: string;
};

type ResultItem = {
  method: 'A' | 'B' | 'C' | 'D' | 'E';
  methodLabel: string;
  retrievalMode: 'none' | 'flat' | 'hierarchical';
  output: string;
  contextText: string;
  metrics: {
    ctx_chars: number;
    retrieved_chunks: number;
    latency_ms: number;
    output_chars: number;
    conclusion_coverage: number;
    evidence_coverage: number;
  };
  judge: JudgeScores | null;
};

type BundleResponse = {
  bundle: {
    caseInfo: {
      id: string;
      name: string;
      question: string;
      reference: {
        summary: string;
        conclusion_points: Array<{ id: string; label: string }>;
        evidence_points: Array<{ id: string; label: string }>;
        source_notes: string[];
        raw_reference_text?: string;
      };
    };
    results: ResultItem[];
  };
  summary: {
    methods: Array<{ method: string; avg_judge_scores: JudgeScores | null }>;
  };
  runDir: string;
};

const DEFAULT_METHODS = ['A', 'B', 'C', 'D', 'E'] as const;

export default function ExperimentsPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BundleResponse | null>(null);
  const [activeMethods, setActiveMethods] = useState<string[]>([...DEFAULT_METHODS]);

  useEffect(() => {
    let disposed = false;
    fetch('/api/experiments/bazi')
      .then((res) => res.json())
      .then((data) => {
        if (disposed) return;
        setCases(data.cases || []);
        setSelectedCaseId((current) => current || data.cases?.[0]?.id || '');
      })
      .catch(() => {
        if (!disposed) setError('实验案例加载失败');
      });
    return () => {
      disposed = true;
    };
  }, []);

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const handleMethodToggle = (method: string) => {
    setActiveMethods((current) =>
      current.includes(method) ? current.filter((item) => item !== method) : [...current, method]
    );
  };

  const handleRun = async () => {
    if (!selectedCaseId || !activeMethods.length) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/experiments/bazi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: selectedCaseId, methods: activeMethods, judge: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '实验运行失败');
      }
      setResult(await res.json());
    } catch (err: any) {
      setError(err?.message || '实验运行失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="glass-panel rounded-[28px] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-stone-400">Experiments</div>
              <h1 className="text-3xl font-bold text-stone-800">八字消融实验 Demo</h1>
              <p className="max-w-3xl text-sm leading-7 text-stone-600">
                该页面复用“实验”目录下的共享引擎，对同一案例运行 A-E 五组方法，比较结构化提示词、普通切块检索和层次化知识增强的效果差异。
              </p>
            </div>
            <div className="text-xs text-stone-500">
              CLI 输出目录位于 <code>/实验/outputs</code>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[28px] p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-stone-700">
                选择案例
                <select
                  value={selectedCaseId}
                  onChange={(event) => setSelectedCaseId(event.target.value)}
                  className="glass-input glass-select mt-2 w-full rounded-2xl p-3 text-sm outline-none"
                >
                  {cases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.id})
                    </option>
                  ))}
                </select>
              </label>
              {selectedCase && (
                <div className="rounded-2xl border border-stone-200 bg-white/60 p-4 text-sm text-stone-600">
                  <div className="font-semibold text-stone-800">{selectedCase.name}</div>
                  <div className="mt-2 leading-7">{selectedCase.summary}</div>
                  <div className="mt-2 text-xs text-stone-500">问题：{selectedCase.question}</div>
                </div>
              )}
              <div>
                <div className="mb-2 text-sm font-semibold text-stone-700">选择方法</div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_METHODS.map((method) => {
                    const active = activeMethods.includes(method);
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => handleMethodToggle(method)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-stone-200 bg-white/70 text-stone-600'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleRun}
                disabled={loading || !selectedCaseId || !activeMethods.length}
                className="glass-cta rounded-2xl px-6 py-3 text-sm font-semibold text-amber-200 disabled:opacity-50"
              >
                {loading ? '运行中…' : '运行实验'}
              </button>
            </div>
          </div>
          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        </section>

        {result && (
          <>
            <section className="glass-panel rounded-[28px] p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-800">参考标签</h2>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    {result.bundle.caseInfo.reference.summary}
                  </p>
                </div>
                <div className="text-xs text-stone-500">
                  输出目录：<code>{result.runDir}</code>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white/60 p-4">
                  <div className="mb-2 text-sm font-semibold text-stone-800">关键结论点</div>
                  <ul className="space-y-2 text-sm text-stone-600">
                    {result.bundle.caseInfo.reference.conclusion_points.map((item) => (
                      <li key={item.id}>{item.label}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white/60 p-4">
                  <div className="mb-2 text-sm font-semibold text-stone-800">关键判据点</div>
                  <ul className="space-y-2 text-sm text-stone-600">
                    {result.bundle.caseInfo.reference.evidence_points.map((item) => (
                      <li key={item.id}>{item.label}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white/60 p-4">
                  <div className="mb-2 text-sm font-semibold text-stone-800">来源说明</div>
                  <ul className="space-y-2 text-sm text-stone-600">
                    {result.bundle.caseInfo.reference.source_notes.map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {result.bundle.results.map((item) => (
                <article key={item.method} className="glass-panel rounded-[28px] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-stone-800">{item.methodLabel}</h3>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-400">
                        retrieval: {item.retrievalMode}
                      </div>
                    </div>
                    <div className="rounded-full border border-stone-200 bg-white/60 px-3 py-1 text-xs text-stone-500">
                      Judge: {item.judge?.总分 ?? '-'}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-600">
                    <div className="rounded-xl border border-stone-200 bg-white/60 p-3">ctx_chars: {item.metrics.ctx_chars}</div>
                    <div className="rounded-xl border border-stone-200 bg-white/60 p-3">chunks: {item.metrics.retrieved_chunks}</div>
                    <div className="rounded-xl border border-stone-200 bg-white/60 p-3">latency: {item.metrics.latency_ms}ms</div>
                    <div className="rounded-xl border border-stone-200 bg-white/60 p-3">output_chars: {item.metrics.output_chars}</div>
                    <div className="rounded-xl border border-stone-200 bg-white/60 p-3">结论覆盖率: {item.metrics.conclusion_coverage}</div>
                    <div className="rounded-xl border border-stone-200 bg-white/60 p-3">判据覆盖率: {item.metrics.evidence_coverage}</div>
                  </div>

                  {item.judge && (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-stone-700">
                      <div className="font-semibold text-stone-800">Judge 评分</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>专业性：{item.judge.专业性}</div>
                        <div>判据充分性：{item.judge.判据充分性}</div>
                        <div>结论一致性：{item.judge.结论一致性}</div>
                        <div>结构完整性：{item.judge.结构完整性}</div>
                        <div>知识匹配有效性：{item.judge.知识匹配有效性}</div>
                        <div>总分：{item.judge.总分}</div>
                      </div>
                      <div className="mt-2 leading-6 text-stone-600">{item.judge.评语}</div>
                    </div>
                  )}

                  <details className="mt-4 rounded-2xl border border-stone-200 bg-white/60 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-stone-700">查看上下文</summary>
                    <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-stone-600">
                      {item.contextText}
                    </pre>
                  </details>

                  <div className="mt-4 rounded-2xl border border-stone-200 bg-white/60 p-4">
                    <div className="mb-2 text-sm font-semibold text-stone-800">模型输出</div>
                    <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-stone-700">
                      {item.output}
                    </pre>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

