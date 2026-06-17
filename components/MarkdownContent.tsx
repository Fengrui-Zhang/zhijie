'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type UnknownRecord = Record<string, unknown>;

type ChartPayload = {
  chartType: string;
  title?: string;
  subtitle?: string;
  data: UnknownRecord;
};

type ScoreEntry = {
  key: string;
  label: string;
  score: number;
};

type FallbackScoreLabel = {
  key: string;
  label: string;
};

const chartLanguages = new Set([
  'chart',
  'chart-json',
  'visualization',
  'fortune',
  'json',
]);

const supportedChartTypes = new Set([
  'fortune_radar',
  'fortune_calendar',
  'fortune_trend',
  'life_fortune_trend',
  'wuxing_energy',
  'life_timeline',
  'personality_petal',
  'divination_verdict',
]);

const toRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as UnknownRecord;
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toText = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

const clampScore = (value: unknown) => Math.max(0, Math.min(100, toNumber(value, 0)));

const FORTUNE_SCORE_LABELS: FallbackScoreLabel[] = [
  { key: 'career', label: '事业/学业' },
  { key: 'wealth', label: '财富' },
  { key: 'love', label: '感情/婚姻' },
  { key: 'health', label: '健康' },
  { key: 'family', label: '家庭/长辈' },
  { key: 'social', label: '人际/贵人' },
  { key: 'windfall', label: '偏财/投资' },
  { key: 'travel', label: '出行/迁移' },
  { key: 'creativity', label: '创意/灵感' },
  { key: 'children', label: '子女' },
  { key: 'legal', label: '官非/法律' },
  { key: 'spiritual', label: '精神/心灵' },
];

const PERSONALITY_SCORE_LABELS: FallbackScoreLabel[] = [
  { key: 'expression', label: '外向表达' },
  { key: 'intuition', label: '直觉洞察' },
  { key: 'logic', label: '理性决策' },
  { key: 'structure', label: '结构规划' },
  { key: 'stability', label: '情绪稳定' },
  { key: 'action', label: '行动力' },
  { key: 'empathy', label: '共情力' },
  { key: 'adaptability', label: '适应力' },
];

const isGenericScoreLabel = (value: string) => /^(项目|维度|指标)\s*\d+$/u.test(value.trim());

const getFallbackScoreLabel = (fallbackLabels: FallbackScoreLabel[] | undefined, index: number) => (
  fallbackLabels?.[index] || { key: `item-${index}`, label: `项目 ${index + 1}` }
);

const parseChartPayload = (raw: string, language?: string): ChartPayload | null => {
  const normalizedLanguage = (language || '').toLowerCase();
  if (normalizedLanguage && !chartLanguages.has(normalizedLanguage)) return null;

  try {
    const parsed = JSON.parse(raw.trim());
    const record = toRecord(parsed);
    if (!record) return null;

    const chartType = toText(record.chartType || record.type || record.kind);
    if (!supportedChartTypes.has(chartType)) return null;

    const dataRecord = toRecord(record.data) || record;
    return {
      chartType,
      title: toText(record.title),
      subtitle: toText(record.subtitle),
      data: dataRecord,
    };
  } catch {
    return null;
  }
};

const scoreColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-sky-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
};

const getScoreEntries = (value: unknown, fallbackLabels?: FallbackScoreLabel[]): ScoreEntry[] => {
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        const fallback = getFallbackScoreLabel(fallbackLabels, index);
        const record = toRecord(item);
        if (!record) {
          const score = typeof item === 'number' || typeof item === 'string' ? clampScore(item) : null;
          return score == null || !fallbackLabels ? null : { key: fallback.key, label: fallback.label, score };
        }
        const rawLabel = toText(record.label || record.name || record.key);
        return {
          key: toText(record.key || record.name || record.label, fallback.key),
          label: rawLabel && !isGenericScoreLabel(rawLabel) ? rawLabel : fallback.label,
          score: clampScore(record.score || record.value),
        };
      })
      .filter((item): item is ScoreEntry => Boolean(item));
  }

  const record = toRecord(value);
  if (!record) return [];

  return Object.entries(record).map(([key, raw], index) => {
    const fallback = getFallbackScoreLabel(fallbackLabels, index);
    const item = toRecord(raw);
    const rawLabel = item ? toText(item.label || item.name || key, key) : key;
    const normalizedLabel = rawLabel && !isGenericScoreLabel(rawLabel) ? rawLabel : fallback.label;
    return {
      key: key && !isGenericScoreLabel(key) ? key : fallback.key,
      label: normalizedLabel,
      score: item ? clampScore(item.score || item.value) : clampScore(raw),
    };
  });
};

const ChartShell = ({
  chart,
  children,
}: {
  chart: ChartPayload;
  children: React.ReactNode;
}) => (
  <div className="my-4 rounded-[22px] border border-white/70 bg-white/78 p-4 shadow-sm shadow-stone-200/50">
    {(chart.title || chart.subtitle) && (
      <div className="mb-4">
        {chart.title && <div className="text-sm font-bold text-stone-800">{chart.title}</div>}
        {chart.subtitle && <div className="mt-1 text-xs leading-5 text-stone-500">{chart.subtitle}</div>}
      </div>
    )}
    {children}
  </div>
);

const ScoreBars = ({ entries }: { entries: ScoreEntry[] }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {entries.map((entry) => (
      <div key={entry.key} className="rounded-2xl border border-stone-100 bg-stone-50/70 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-stone-700">{entry.label}</span>
          <span className="font-bold text-stone-500">{entry.score}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200/80">
          <div className={`h-full rounded-full ${scoreColor(entry.score)}`} style={{ width: `${entry.score}%` }} />
        </div>
      </div>
    ))}
  </div>
);

const FortuneRadarBlock = ({ chart }: { chart: ChartPayload }) => {
  const scores = getScoreEntries(chart.data.scores || chart.data.dimensions || chart.data.items, FORTUNE_SCORE_LABELS);
  const overallScore = clampScore(chart.data.overallScore || chart.data.score);

  if (!scores.length && !overallScore) return null;

  return (
    <ChartShell chart={chart}>
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <div className="flex items-center justify-center rounded-[22px] border border-stone-100 bg-stone-50/70 p-4">
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-[10px] border-amber-100 bg-white">
            <div
              className="absolute inset-[-10px] rounded-full border-[10px] border-amber-500"
              style={{ clipPath: `inset(${Math.max(0, 100 - overallScore)}% 0 0 0)` }}
            />
            <div className="relative text-center">
              <div className="text-3xl font-bold text-stone-800">{overallScore || Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length)}</div>
              <div className="mt-1 text-xs text-stone-500">{toText(chart.data.overallLabel, '综合')}</div>
            </div>
          </div>
        </div>
        <ScoreBars entries={scores} />
      </div>
      {toText(chart.data.topAdvice || chart.data.advice) && (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-sm leading-6 text-stone-700">
          {toText(chart.data.topAdvice || chart.data.advice)}
        </div>
      )}
    </ChartShell>
  );
};

const FortuneTrendBlock = ({ chart }: { chart: ChartPayload }) => {
  const entries = getScoreEntries(chart.data.points || chart.data.days || chart.data.trend || chart.data.scores);
  if (!entries.length) return null;

  const width = 420;
  const height = 160;
  const points = entries.map((entry, index) => {
    const x = entries.length === 1 ? width / 2 : (index / (entries.length - 1)) * width;
    const y = height - (entry.score / 100) * (height - 28) - 14;
    return { ...entry, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');

  return (
    <ChartShell chart={chart}>
      <div className="overflow-hidden rounded-[22px] border border-stone-100 bg-stone-50/70 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
          {[25, 50, 75].map((tick) => {
            const y = height - (tick / 100) * (height - 28) - 14;
            return <line key={tick} x1="0" x2={width} y1={y} y2={y} stroke="rgba(120,113,108,.18)" strokeDasharray="4 6" />;
          })}
          <path d={path} fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => (
            <g key={point.key}>
              <circle cx={point.x} cy={point.y} r="6" fill="#f59e0b" stroke="white" strokeWidth="3" />
              <text x={point.x} y={height - 2} textAnchor="middle" className="fill-stone-500 text-[11px]">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </ChartShell>
  );
};

const FortuneCalendarBlock = ({ chart }: { chart: ChartPayload }) => {
  const entries = getScoreEntries(chart.data.days || chart.data.items || chart.data.calendar);
  if (!entries.length) return null;

  return (
    <ChartShell chart={chart}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
        {entries.slice(0, 31).map((entry) => (
          <div key={entry.key} className="rounded-2xl border border-stone-100 bg-stone-50/70 px-3 py-3">
            <div className="text-xs font-semibold text-stone-500">{entry.label}</div>
            <div className="mt-2 text-2xl font-bold text-stone-800">{entry.score}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div className={`h-full ${scoreColor(entry.score)}`} style={{ width: `${entry.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </ChartShell>
  );
};

const WuxingEnergyBlock = ({ chart }: { chart: ChartPayload }) => {
  const entries = getScoreEntries(chart.data.elements || chart.data.scores || chart.data.items);
  if (!entries.length) return null;
  return (
    <ChartShell chart={chart}>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.key} className="grid grid-cols-[64px_1fr_42px] items-center gap-3 text-sm">
            <div className="font-semibold text-stone-700">{entry.label}</div>
            <div className="h-3 overflow-hidden rounded-full bg-stone-200">
              <div className={`h-full rounded-full ${scoreColor(entry.score)}`} style={{ width: `${entry.score}%` }} />
            </div>
            <div className="text-right text-xs font-bold text-stone-500">{entry.score}</div>
          </div>
        ))}
      </div>
    </ChartShell>
  );
};

const DivinationVerdictBlock = ({ chart }: { chart: ChartPayload }) => {
  const score = clampScore(chart.data.verdictScore || chart.data.score);
  const label = score >= 70 ? '吉' : score >= 40 ? '平' : '凶';
  const tone = score >= 70 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : score >= 40 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-700';
  const factors = Array.isArray(chart.data.keyFactors) ? chart.data.keyFactors : [];

  return (
    <ChartShell chart={chart}>
      <div className={`rounded-[24px] border px-5 py-5 text-center ${tone}`}>
        <div className="text-5xl font-bold">{label}</div>
        <div className="mt-2 text-sm font-semibold">判断分 {score}</div>
        {toText(chart.data.question) && <div className="mt-3 text-sm leading-6 text-stone-700">{toText(chart.data.question)}</div>}
      </div>
      {factors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {factors.slice(0, 8).map((item, index) => {
            const record = toRecord(item);
            const text = record ? toText(record.factor || record.label || record.name, `因素 ${index + 1}`) : toText(item, `因素 ${index + 1}`);
            return (
              <span key={`${text}-${index}`} className="rounded-full border border-stone-200 bg-white/70 px-2.5 py-1 text-xs text-stone-600">
                {text}
              </span>
            );
          })}
        </div>
      )}
    </ChartShell>
  );
};

const LifeTimelineBlock = ({ chart }: { chart: ChartPayload }) => {
  const rawItems = Array.isArray(chart.data.events) ? chart.data.events : Array.isArray(chart.data.items) ? chart.data.items : [];
  if (!rawItems.length) return null;

  return (
    <ChartShell chart={chart}>
      <div className="space-y-3">
        {rawItems.slice(0, 10).map((item, index) => {
          const record = toRecord(item) || {};
          const title = toText(record.title || record.label || record.name, `阶段 ${index + 1}`);
          const period = toText(record.period || record.time || record.year);
          const description = toText(record.description || record.summary || record.detail);
          return (
            <div key={`${title}-${index}`} className="grid grid-cols-[18px_1fr] gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-3 w-3 rounded-full bg-amber-500" />
                {index < rawItems.length - 1 && <span className="mt-1 h-full min-h-10 w-px bg-stone-200" />}
              </div>
              <div className="rounded-2xl border border-stone-100 bg-stone-50/70 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-800">{title}</span>
                  {period && <span className="text-xs text-stone-400">{period}</span>}
                </div>
                {description && <div className="mt-1 text-sm leading-6 text-stone-600">{description}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
};

const PersonalityPetalBlock = ({ chart }: { chart: ChartPayload }) => {
  const traits = getScoreEntries(chart.data.traits || chart.data.items || chart.data.dimensions, PERSONALITY_SCORE_LABELS);
  const topTraits = Array.isArray(chart.data.topTraits) ? chart.data.topTraits.map((item) => toText(item)).filter(Boolean) : [];
  const summary = toText(chart.data.summary || chart.data.description);
  if (!traits.length && !topTraits.length && !summary) return null;

  return (
    <ChartShell chart={chart}>
      {summary && <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-stone-700">{summary}</div>}
      {traits.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {traits.slice(0, 10).map((trait) => (
            <div key={trait.key} className="rounded-2xl border border-stone-100 bg-white/72 px-3 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-stone-800">{trait.label}</span>
                <span className="font-bold text-amber-700">{trait.score}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${trait.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {topTraits.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {topTraits.slice(0, 8).map((trait) => (
            <span key={trait} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {trait}
            </span>
          ))}
        </div>
      )}
    </ChartShell>
  );
};

const VisualizationBlock = ({ chart }: { chart: ChartPayload }) => {
  if (chart.chartType === 'fortune_radar') return <FortuneRadarBlock chart={chart} />;
  if (chart.chartType === 'fortune_trend' || chart.chartType === 'life_fortune_trend') return <FortuneTrendBlock chart={chart} />;
  if (chart.chartType === 'fortune_calendar') return <FortuneCalendarBlock chart={chart} />;
  if (chart.chartType === 'wuxing_energy') return <WuxingEnergyBlock chart={chart} />;
  if (chart.chartType === 'divination_verdict') return <DivinationVerdictBlock chart={chart} />;
  if (chart.chartType === 'life_timeline') return <LifeTimelineBlock chart={chart} />;
  if (chart.chartType === 'personality_petal') return <PersonalityPetalBlock chart={chart} />;
  return null;
};

export default function MarkdownContent({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className: codeClassName, children, ...props }) {
            const raw = String(children).replace(/\n$/, '');
            const language = /language-(\S+)/.exec(codeClassName || '')?.[1];
            if (!inline) {
              const chart = parseChartPayload(raw, language);
              const renderedChart = chart ? <VisualizationBlock chart={chart} /> : null;
              if (renderedChart) return renderedChart;
            }
            return (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
