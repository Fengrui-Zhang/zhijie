'use client';

import React, { useMemo, useState } from 'react';
import type { GenericTaibuResponse } from '../types';

type Props = {
  data: GenericTaibuResponse;
  onDateChange?: (date: Date) => void;
  onOpenDailyDate?: (date: Date) => void;
  onAsk?: (question: string) => void;
  isAsking?: boolean;
  caseOptions?: Array<{ id: string; title: string }>;
  selectedCaseId?: string;
  onCaseChange?: (caseId: string) => void;
};

type DimensionKey = 'overall' | 'career' | 'love' | 'wealth' | 'health' | 'social';
type InterpretationMode = 'colloquial' | 'professional' | 'technical';
type ShareMetric = { key: string; label: string; level: string; value: number; color: string };

const SCORE_ITEMS: Array<{ key: DimensionKey; label: string; icon: string; color: string }> = [
  { key: 'overall', label: '综合运势', icon: '☆', color: 'text-orange-500' },
  { key: 'career', label: '事业运', icon: '▣', color: 'text-blue-500' },
  { key: 'love', label: '感情运', icon: '♡', color: 'text-pink-500' },
  { key: 'wealth', label: '财运', icon: '▤', color: 'text-emerald-500' },
  { key: 'health', label: '健康运', icon: '⌁', color: 'text-red-500' },
  { key: 'social', label: '人际运', icon: '♙', color: 'text-purple-500' },
];

const MODE_LABELS: Record<InterpretationMode, string> = {
  colloquial: '白话',
  professional: '专业',
  technical: '术语',
};

const MODE_CONFIG: Record<InterpretationMode, { label: string; description: string; icon: string }> = {
  colloquial: {
    label: '白话模式',
    description: '简单易懂的日常语言',
    icon: '白',
  },
  professional: {
    label: '专业模式',
    description: '稍微专业但可理解',
    icon: '专',
  },
  technical: {
    label: '术语模式',
    description: '命理专业术语',
    icon: '术',
  },
};

const MODE_PREFIX: Record<InterpretationMode, string> = {
  colloquial: '',
  professional: '从日主与流运关系看，',
  technical: '以十神、五行与日课结构参断，',
};

const TEN_GOD_INTERPRETATIONS: Record<string, Record<InterpretationMode, string>> = {
  比肩: {
    colloquial: '今天适合和朋友合作，互帮互助，一起做事会更顺利。',
    professional: '比肩临日，同辈助力运旺，宜团队协作，但需注意资源分配。',
    technical: '日临比肩，主同类助身，比劫旺地宜合作共事，然比劫争财，防财务纷争。',
  },
  劫财: {
    colloquial: '今天可能会有意外花销，钱包要捂紧点，别冲动消费。',
    professional: '劫财当令，财运波动，投资需谨慎，防小人争利。',
    technical: '日逢劫财，劫财克正财，主破财之象，忌大额支出及借贷，宜守不宜攻。',
  },
  食神: {
    colloquial: '创意爆棚的一天，适合发挥才华，好点子会更多。',
    professional: '食神透出，创造力旺盛，利文艺创作，人际关系较和谐。',
    technical: '食神泄秀，主才华横溢，食伤生财，利技艺展示，身心愉悦之日。',
  },
  伤官: {
    colloquial: '思维很活跃，但说话要注意分寸，容易因为直白得罪人。',
    professional: '伤官主事，思维敏捷但锋芒过露，需谨言慎行，防口舌是非。',
    technical: '伤官临日，主聪明伶俐然傲气凌人，伤官见官祸百端，宜收敛锋芒。',
  },
  偏财: {
    colloquial: '今天机会感较强，可能有意外收获，适合关注新的赚钱机会。',
    professional: '偏财透出，偏财运旺，利投机取巧，但需控制风险。',
    technical: '偏财临日，主财缘广进，偏财为意外之财，利经商贸易，投资可期。',
  },
  正财: {
    colloquial: '努力工作会有回报，适合脚踏实地把手头事做好。',
    professional: '正财当令，正财运稳，工作有成，利薪资收入与稳定经营。',
    technical: '日临正财，主勤劳致富，正财为辛勤所得，宜踏实经营，稳扎稳打。',
  },
  七杀: {
    colloquial: '今天压力可能偏大，但挑战中也有机会，适合果断处理难题。',
    professional: '七杀透出，压力与机遇并存，利竞争突破，需果断行动。',
    technical: '七杀临日，主威严肃杀，杀为名利之神，有制则权，无制则灾，宜攻不宜守。',
  },
  正官: {
    colloquial: '今天贵人运不错，工作上可能得到认可或支持。',
    professional: '正官得位，贵人运旺，利职场晋升，宜拓展人脉。',
    technical: '正官临日，主官禄显达，官为贵人之星，宜谒贵求名，事业可期。',
  },
  偏印: {
    colloquial: '适合安静学习、看书和思考，少被琐事牵着走。',
    professional: '偏印主事，利学习研究，思维深邃，宜独处内省。',
    technical: '偏印临日，主玄学智慧，枭神夺食需防，宜学术研究，不利求财。',
  },
  正印: {
    colloquial: '学习运和长辈缘较好，适合补充知识、请教经验。',
    professional: '正印透出，学业顺遂，长辈贵人相助，身心安泰。',
    technical: '正印临日，主文昌显达，印星生身，利学业考试，有靠山庇佑。',
  },
};

const SCORE_INTERPRETATIONS: Record<'high' | 'medium' | 'low', Record<InterpretationMode, string>> = {
  high: {
    colloquial: '运势很好，可以主动推进，把握眼前机会。',
    professional: '运势处于高位，利积极进取，可主动出击。',
    technical: '运势高昂，阳气旺盛，宜攻不宜守，诸事可为。',
  },
  medium: {
    colloquial: '运势平稳，按部就班做事就好。',
    professional: '运势中平，宜稳健行事，不宜冒进。',
    technical: '运势中和，阴阳平衡，宜守常规，静待时机。',
  },
  low: {
    colloquial: '今天宜静不宜动，尽量别做重大决定。',
    professional: '运势低迷，宜韬光养晦，避免冲突。',
    technical: '运势不振，阴气偏盛，宜潜藏固守，避凶趋吉。',
  },
};

const DIMENSION_ADVICE: Record<Exclude<DimensionKey, 'overall'>, Record<'high' | 'medium' | 'low', Record<InterpretationMode, string>>> = {
  career: {
    high: {
      colloquial: '事业运不错，有想法可以大胆试一试。',
      professional: '事业运强劲，利职场突破，可争取晋升机会。',
      technical: '官禄临门，事业宫得力，宜进取求名，功名可期。',
    },
    medium: {
      colloquial: '工作按部就班，稳步推进就好。',
      professional: '事业运平稳，宜坚守本职，厚积薄发。',
      technical: '事业宫中和，宜守不宜攻，静待贵人提携。',
    },
    low: {
      colloquial: '职场上低调一些，少说多做，避免冲突。',
      professional: '事业运偏弱，需低调行事，防小人暗算。',
      technical: '官禄受损，事业宫不利，宜韬晦避祸，防口舌官非。',
    },
  },
  wealth: {
    high: {
      colloquial: '财运较顺，适合处理收入、合作和理财计划。',
      professional: '财运旺盛，利投资经营，可适度扩张。',
      technical: '财星高照，财库充盈，宜进财不宜守财，利商贸活动。',
    },
    medium: {
      colloquial: '财运平稳，守住已有的节奏就好。',
      professional: '财运中平，宜稳健理财，不宜投机。',
      technical: '财宫中和，财星不显，宜守财固本，静待财机。',
    },
    low: {
      colloquial: '别乱花钱，也别轻易做投资决定。',
      professional: '财运偏弱，需控制支出，防破财之象。',
      technical: '财星受克，财库空虚，忌大额支出，防劫财破财。',
    },
  },
  love: {
    high: {
      colloquial: '感情互动顺畅，适合表达心意或修复关系。',
      professional: '感情运旺，利情感交流，单身者有望遇良缘。',
      technical: '桃花临门，情感宫得力，宜婚恋交际，情缘可期。',
    },
    medium: {
      colloquial: '感情平稳，多陪伴、多沟通就好。',
      professional: '感情运平，宜维护现有关系，增进感情。',
      technical: '情感宫中和，桃花不显，宜固守情缘，静待良机。',
    },
    low: {
      colloquial: '今天少争吵，多包容对方。',
      professional: '感情运弱，需多沟通理解，防争执冲突。',
      technical: '桃花受损，情感宫不利，宜隐忍退让，防情感纷争。',
    },
  },
  health: {
    high: {
      colloquial: '精力较足，适合运动健身和整理作息。',
      professional: '健康运佳，精力旺盛，利体育锻炼。',
      technical: '身宫得力，元气充沛，宜动不宜静，利养生健体。',
    },
    medium: {
      colloquial: '身体状态正常，保持好习惯即可。',
      professional: '健康运平，需保持作息规律，注意饮食。',
      technical: '身宫中和，气血平稳，宜固本培元，调养身心。',
    },
    low: {
      colloquial: '注意休息，别太透支。',
      professional: '健康运弱，需多休息，避免过劳。',
      technical: '身宫受损，元气不足，宜静养调息，忌劳心伤神。',
    },
  },
  social: {
    high: {
      colloquial: '人际关系顺，适合见人、沟通、谈合作。',
      professional: '人际运旺，利社交拓展，贵人运佳。',
      technical: '贵人临门，人缘宫得力，宜广结善缘，贵人相助。',
    },
    medium: {
      colloquial: '人际关系正常，保持和善态度就好。',
      professional: '人际运平，宜维护现有人脉，不宜冲突。',
      technical: '人缘宫中和，宜守常规交际，静待贵人提携。',
    },
    low: {
      colloquial: '少参加无效应酬，容易遇到不顺心的人。',
      professional: '人际运弱，需避免冲突，防小人是非。',
      technical: '贵人不显，人缘宫不利，宜独处静修，避凶趋吉。',
    },
  },
};

const LEVEL_VALUE: Record<string, number> = {
  大吉: 92,
  吉: 78,
  中吉: 65,
  平: 52,
  小凶: 40,
  凶: 30,
};

const levelValue = (level: string) => LEVEL_VALUE[level] || 52;

const LEVEL_ORDER = ['凶', '小凶', '平', '中吉', '吉', '大吉'];

const compareFortuneLevels = (a?: string, b?: string) => {
  const ai = LEVEL_ORDER.indexOf(String(a || '平'));
  const bi = LEVEL_ORDER.indexOf(String(b || '平'));
  return (ai === -1 ? 2 : ai) - (bi === -1 ? 2 : bi);
};

const getScoreGrade = (level?: string): 'high' | 'medium' | 'low' => {
  if (compareFortuneLevels(level, '吉') >= 0) return 'high';
  if (compareFortuneLevels(level, '平') >= 0) return 'medium';
  return 'low';
};

const getModeAdvice = (fortune: any, mode: InterpretationMode): string[] => {
  const scores: Record<DimensionKey, string> = {
    overall: String(fortune?.overall || '平'),
    career: String(fortune?.career || '平'),
    love: String(fortune?.love || '平'),
    wealth: String(fortune?.wealth || '平'),
    health: String(fortune?.health || '平'),
    social: String(fortune?.social || '平'),
  };
  const tenGod = String(fortune?.tenGod || '');
  const lines = [
    TEN_GOD_INTERPRETATIONS[tenGod]?.[mode] || TEN_GOD_INTERPRETATIONS.比肩[mode],
    SCORE_INTERPRETATIONS[getScoreGrade(scores.overall)][mode],
  ];
  const dimensions: Array<{ key: Exclude<DimensionKey, 'overall'>; level: string }> = [
    { key: 'career', level: scores.career },
    { key: 'wealth', level: scores.wealth },
    { key: 'love', level: scores.love },
    { key: 'health', level: scores.health },
    { key: 'social', level: scores.social },
  ];
  const sorted = [...dimensions].sort((a, b) => compareFortuneLevels(b.level, a.level));
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  if (highest && compareFortuneLevels(highest.level, '吉') >= 0) {
    lines.push(DIMENSION_ADVICE[highest.key][getScoreGrade(highest.level)][mode]);
  }
  if (lowest && highest && lowest.key !== highest.key && compareFortuneLevels(lowest.level, '中吉') < 0) {
    lines.push(DIMENSION_ADVICE[lowest.key][getScoreGrade(lowest.level)][mode]);
  }
  return lines.filter(Boolean);
};

const levelTone = (level: string) => {
  if (level === '大吉' || level === '吉' || level === '中吉') return 'text-emerald-700';
  if (level === '平') return 'text-amber-700';
  return 'text-red-600';
};

const levelDot = (level: string) => {
  if (level === '大吉' || level === '吉' || level === '中吉') return 'bg-emerald-500';
  if (level === '平') return 'bg-stone-400';
  return 'bg-red-500';
};

const levelBar = (level: string) => {
  if (level === '大吉' || level === '吉' || level === '中吉') return 'bg-emerald-500';
  if (level === '平') return 'bg-amber-500';
  return 'bg-red-500';
};

const DIMENSION_COLOR: Record<DimensionKey, string> = {
  overall: '#f59e0b',
  career: '#3b82f6',
  love: '#ec4899',
  wealth: '#22c55e',
  health: '#ef4444',
  social: '#8b5cf6',
};

type TrendPoint = {
  x: number;
  y: number;
  value: number;
  label: string;
  fullDate?: string;
  dimension?: DimensionKey;
};

const chartX = (index: number, total: number) => (total <= 1 ? 50 : 8 + (index / (total - 1)) * 84);
const chartY = (value: number, min = 25, max = 100) => {
  const safe = Math.max(25, Math.min(100, Number(value) || 52));
  const low = Math.max(0, Math.min(100, min));
  const high = Math.max(low + 1, Math.min(100, max));
  return 12 + ((high - safe) / (high - low)) * 76;
};

const getAdaptiveChartRange = (values: number[]) => {
  const safeValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.max(0, Math.min(100, value)));
  if (!safeValues.length) return { min: 25, max: 100 };
  const minValue = Math.min(...safeValues);
  const maxValue = Math.max(...safeValues);
  const spread = Math.max(24, maxValue - minValue);
  const middle = (minValue + maxValue) / 2;
  const min = Math.max(0, Math.floor(middle - spread / 2 - 8));
  const max = Math.min(100, Math.ceil(middle + spread / 2 + 8));
  return max - min < 30
    ? { min: Math.max(0, min - 6), max: Math.min(100, max + 6) }
    : { min, max };
};

const chartGridValues = (range: { min: number; max: number }) => {
  const step = (range.max - range.min) / 3;
  return [range.min, range.min + step, range.min + step * 2, range.max];
};

const dimensionShortLabel = (label: string) => label.replace('运势', '').replace('运', '');

const parseDate = (value?: string) => {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};

const formatDateZh = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
};

const shiftDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const shiftMonth = (year: number, month: number, offset: number) => {
  const next = new Date(year, month - 1 + offset, 1);
  return next;
};

const smoothPath = (points: Array<{ x: number; y: number }>) => {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x},${point.y}`;
    const prev = points[index - 1];
    const midX = (prev.x + point.x) / 2;
    return `${path} C ${midX},${prev.y} ${midX},${point.y} ${point.x},${point.y}`;
  }, '');
};

const CaseSelector = ({
  caseOptions,
  selectedCaseId,
  onCaseChange,
}: Pick<Props, 'caseOptions' | 'selectedCaseId' | 'onCaseChange'>) => {
  if (!caseOptions?.length || !onCaseChange) return null;
  return (
    <select
      value={selectedCaseId || caseOptions[0]?.id || ''}
      onChange={(event) => onCaseChange(event.target.value)}
      className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-bold text-stone-700 outline-none transition hover:bg-white"
      aria-label="选择命主"
    >
      {caseOptions.map((item) => (
        <option key={item.id} value={item.id}>{item.title}</option>
      ))}
    </select>
  );
};

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const getShareMetrics = (fortune: any): ShareMetric[] =>
  SCORE_ITEMS.map((item) => {
    const level = String(fortune?.[item.key] || '平');
    return {
      key: item.key,
      label: item.label.replace('运势', '').replace('运', ''),
      level,
      value: Math.max(8, Math.min(100, Number(fortune?._chart?.[item.key]) || levelValue(level))),
      color: level === '大吉' || level === '吉' || level === '中吉'
        ? '#16a34a'
        : level === '平'
          ? '#d97706'
          : '#dc2626',
    };
  });

const buildShareSvg = ({
  title,
  subtitle,
  lines,
  metrics,
  yi,
  ji,
}: {
  title: string;
  subtitle: string;
  lines: string[];
  metrics: ShareMetric[];
  yi: string[];
  ji: string[];
}) => {
  const width = 760;
  const metricStartY = 160;
  const lineHeight = 42;
  const textStartY = metricStartY + metrics.length * lineHeight + 34;
  const yiJiStartY = textStartY + Math.min(4, lines.length) * 34 + 30;
  const height = Math.max(620, yiJiStartY + 112);

  const metricRows = metrics.map((item, index) => {
    const y = metricStartY + index * lineHeight;
    const barWidth = Math.round(410 * (item.value / 100));
    return `
      <text x="72" y="${y + 17}" fill="#57534e" font-size="22" font-weight="600">${escapeXml(item.label)}</text>
      <rect x="172" y="${y}" width="410" height="18" rx="9" fill="#f1eee9" />
      <rect x="172" y="${y}" width="${barWidth}" height="18" rx="9" fill="${item.color}" />
      <text x="614" y="${y + 17}" fill="${item.color}" font-size="22" font-weight="700" text-anchor="end">${escapeXml(item.level)}</text>
    `;
  }).join('');

  const textLines = lines.slice(0, 4).map((line, index) => `
    <text x="72" y="${textStartY + index * 34}" fill="#44403c" font-size="21">${escapeXml(line.slice(0, 34))}</text>
  `).join('');

  const yiLines = yi.slice(0, 3).map((item, index) => `
    <text x="94" y="${yiJiStartY + 38 + index * 27}" fill="#047857" font-size="19">${escapeXml(item.slice(0, 12))}</text>
  `).join('');
  const jiLines = ji.slice(0, 3).map((item, index) => `
    <text x="438" y="${yiJiStartY + 38 + index * 27}" fill="#b91c1c" font-size="19">${escapeXml(item.slice(0, 12))}</text>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff7ed" />
      <stop offset="52%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#fef3c7" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#1c1917" flood-opacity="0.14" />
    </filter>
  </defs>
  <rect width="760" height="${height}" rx="34" fill="url(#bg)" />
  <rect x="32" y="32" width="696" height="${height - 64}" rx="28" fill="#ffffff" opacity="0.72" stroke="#fde68a" filter="url(#shadow)" />
  <text x="72" y="88" fill="#1c1917" font-size="34" font-weight="800">${escapeXml(title)}</text>
  <text x="72" y="122" fill="#a16207" font-size="20" font-weight="600">${escapeXml(subtitle)}</text>
  ${metricRows}
  <line x1="72" y1="${textStartY - 24}" x2="688" y2="${textStartY - 24}" stroke="#f5e6c8" stroke-width="2" />
  ${textLines}
  <rect x="72" y="${yiJiStartY}" width="280" height="96" rx="18" fill="#ecfdf5" stroke="#bbf7d0" />
  <text x="94" y="${yiJiStartY + 25}" fill="#047857" font-size="18" font-weight="800">宜</text>
  ${yiLines}
  <rect x="416" y="${yiJiStartY}" width="280" height="96" rx="18" fill="#fff1f2" stroke="#fecdd3" />
  <text x="438" y="${yiJiStartY + 25}" fill="#b91c1c" font-size="18" font-weight="800">忌</text>
  ${jiLines}
  <line x1="72" y1="${height - 78}" x2="688" y2="${height - 78}" stroke="#f5e6c8" stroke-width="2" />
  <text x="72" y="${height - 42}" fill="#a16207" font-size="18" font-weight="800">元分 · 智解</text>
  <text x="688" y="${height - 42}" fill="#a8a29e" font-size="17" text-anchor="end">运势参考卡片</text>
</svg>`;
};

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const downloadShareImage = async (baseFilename: string, svg: string) => {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
    });
    image.src = svgUrl;
    await loaded;

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || 760;
    canvas.height = image.naturalHeight || 760;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unsupported');
    context.drawImage(image, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Image export failed'));
      }, 'image/png', 0.95);
    });
    downloadBlob(`${baseFilename}.png`, pngBlob);
  } catch {
    downloadBlob(`${baseFilename}.svg`, svgBlob);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
};

const ChipList = ({
  items,
  tone = 'neutral',
  limit,
  collapsible = false,
}: {
  items: string[];
  tone?: 'good' | 'bad' | 'neutral';
  limit?: number;
  collapsible?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const effectiveLimit = collapsible ? (limit ?? 6) : limit;
  const shown = typeof effectiveLimit === 'number' && !expanded ? items.slice(0, effectiveLimit) : items;
  if (!shown.length) return <span className="text-sm text-stone-400">暂无</span>;
  const cls = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : tone === 'bad'
      ? 'border-red-200 bg-red-50 text-red-600'
      : 'border-stone-200 bg-white/65 text-stone-600';
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((item) => (
        <span key={item} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${cls}`}>{item}</span>
      ))}
      {typeof effectiveLimit === 'number' && items.length > effectiveLimit && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="rounded-lg border border-stone-200 bg-white/70 px-2.5 py-1 text-xs font-semibold text-stone-500 transition hover:bg-white hover:text-stone-700"
        >
          {expanded ? '收起' : `展开 ${items.length - effectiveLimit}`}
        </button>
      )}
    </div>
  );
};

const ShareDialog = ({
  open,
  title,
  subtitle,
  lines,
  metrics,
  yi = [],
  ji = [],
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  lines: string[];
  metrics: ShareMetric[];
  yi?: string[];
  ji?: string[];
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  if (!open) return null;
  const text = [title, ...lines].filter(Boolean).join('\n');
  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  const svg = buildShareSvg({ title, subtitle, lines, metrics, yi, ji });
  const handleDownload = async () => {
    await downloadShareImage(title.replace(/[^\u4e00-\u9fffA-Za-z0-9_-]+/g, '-'), svg);
  };
  const handleShare = async () => {
    if (!navigator.share) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({ title, text });
      setShared(true);
      window.setTimeout(() => setShared(false), 1600);
    } catch {
      setShared(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_30px_90px_rgba(28,25,23,0.22)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-lg font-bold text-stone-800">分享摘要</div>
          <button type="button" onClick={onClose} className="rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-500 hover:bg-stone-50">
            关闭
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-stone-900">{title}</div>
              <div className="mt-1 text-sm font-semibold text-amber-700">{subtitle}</div>
            </div>
            <div className="mt-5 space-y-3">
              {metrics.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-600">{item.label}</span>
                    <span className="font-bold" style={{ color: item.color }}>{item.level}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-amber-100 bg-white/70 p-3 text-xs leading-6 text-stone-600">
              {lines.slice(0, 3).map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
            {(yi.length > 0 || ji.length > 0) && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3">
                  <div className="mb-1 font-bold text-emerald-700">宜</div>
                  {yi.slice(0, 3).map((item) => <div key={item} className="truncate text-emerald-800">{item}</div>)}
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50/80 p-3">
                  <div className="mb-1 font-bold text-red-600">忌</div>
                  {ji.slice(0, 3).map((item) => <div key={item} className="truncate text-red-700">{item}</div>)}
                </div>
              </div>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-amber-100 pt-3 text-xs">
              <span className="font-bold text-amber-700">元分 · 智解</span>
              <span className="text-stone-400">运势参考卡片</span>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-100 bg-stone-50/80 p-4 text-sm leading-7 text-stone-700">
            <div className="mb-2 text-base font-bold text-stone-900">文字摘要</div>
            {lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={handleDownload} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50">
            保存图片
          </button>
          <button type="button" onClick={handleShare} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100">
            {shared ? '已分享' : '系统分享'}
          </button>
          <button type="button" onClick={handleCopy} className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-amber-200 transition hover:bg-stone-800">
            {copied ? '已复制' : '复制摘要'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ScoreBars = ({ fortune }: { fortune: any }) => (
  <div className="grid grid-cols-2 gap-x-5 gap-y-4 md:gap-x-8 md:gap-y-5">
    {SCORE_ITEMS.map((item) => {
      const level = String(fortune?.[item.key] || '平');
      const value = fortune?._chart?.[item.key] || fortune?.chartValueMap?.[item.key] || levelValue(level);
      return (
        <div key={item.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-base leading-none md:text-lg ${item.color}`}>{item.icon}</span>
              <span className="text-sm font-semibold text-stone-600">{item.label}</span>
            </div>
            <span className={`text-sm font-bold ${levelTone(level)}`}>{level}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className={`h-full rounded-full ${levelBar(level)} transition-all duration-700`} style={{ width: `${Math.max(8, Math.min(100, value))}%` }} />
          </div>
        </div>
      );
    })}
  </div>
);

const InterpretationModeControl = ({
  mode,
  onModeChange,
  activeClass = 'bg-orange-500 text-white shadow-sm',
}: {
  mode: InterpretationMode;
  onModeChange: (mode: InterpretationMode) => void;
  activeClass?: string;
}) => (
  <div className="flex flex-wrap gap-1 rounded-2xl bg-stone-100 p-1">
    {(Object.keys(MODE_LABELS) as InterpretationMode[]).map((item) => {
      const active = mode === item;
      return (
        <button
          key={item}
          type="button"
          onClick={() => onModeChange(item)}
          title={MODE_CONFIG[item].description}
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition md:px-3 ${
            active ? activeClass : 'text-stone-500 hover:bg-white hover:text-stone-800'
          }`}
        >
          <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-white text-stone-400'}`}>
            {MODE_CONFIG[item].icon}
          </span>
          <span>{MODE_LABELS[item]}</span>
        </button>
      );
    })}
  </div>
);

const FortuneTrendChart = ({
  trend,
  selectedDate,
}: {
  trend: any[];
  selectedDate?: string;
}) => {
  const [activeDimensions, setActiveDimensions] = useState<DimensionKey[]>(['overall']);
  const [hoveredPoint, setHoveredPoint] = useState<TrendPoint | null>(null);
  const { series, range } = useMemo(() => {
    if (!trend?.length) return { series: [], range: { min: 25, max: 100 } };
    const values = activeDimensions.flatMap((dimension) =>
      trend.map((item) => item.scores?.[dimension] ?? item.scores?.overall ?? 52)
    );
    const nextRange = getAdaptiveChartRange(values);
    const nextSeries = activeDimensions.map((dimension) => ({
      dimension,
      points: trend.map((item, index) => {
        const value = item.scores?.[dimension] ?? item.scores?.overall ?? 52;
        const x = chartX(index, trend.length);
        const y = chartY(value, nextRange.min, nextRange.max);
        return { x, y, value, label: item.date, fullDate: item.fullDate, dimension };
      }),
    }));
    return { series: nextSeries, range: nextRange };
  }, [trend, activeDimensions]);

  if (!series.length) return null;
  const primaryPoints = series[0]?.points || [];
  const trendDirection = primaryPoints.length ? primaryPoints[primaryPoints.length - 1].value - primaryPoints[0].value : 0;
  const toggleDimension = (dimension: DimensionKey) => {
    setActiveDimensions((current) => {
      if (current.includes(dimension)) {
        return current.length === 1 ? current : current.filter((item) => item !== dimension);
      }
      return [...current, dimension];
    });
  };

  return (
    <div className="rounded-2xl border border-stone-100 bg-white/75 p-4 shadow-sm md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 md:mb-4 md:gap-3">
        <div className="flex items-center gap-3">
          <div className="text-base font-bold text-stone-800 md:text-lg">7日运势趋势</div>
          <div className={`text-sm font-bold ${trendDirection > 5 ? 'text-emerald-600' : trendDirection < -5 ? 'text-red-500' : 'text-stone-500'}`}>
            趋势：{trendDirection > 5 ? '上升' : trendDirection < -5 ? '下降' : '平稳'}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {SCORE_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleDimension(item.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition md:px-3 md:py-1.5 ${
                activeDimensions.includes(item.key) ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/65 text-stone-500 hover:bg-white'
              }`}
            >
              {dimensionShortLabel(item.label)}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-56 w-full rounded-2xl border border-stone-100 bg-stone-50/30 p-2 md:h-72">
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
          {chartGridValues(range).map((line) => (
            <line key={line} x1="8" y1={chartY(line, range.min, range.max)} x2="92" y2={chartY(line, range.min, range.max)} stroke="#e7e5e4" strokeWidth="0.4" strokeDasharray="1.5 2" />
          ))}
          {series.map((item) => (
            <path
              key={item.dimension}
              d={smoothPath(item.points)}
              fill="none"
              stroke={DIMENSION_COLOR[item.dimension]}
              strokeWidth={item.dimension === activeDimensions[0] ? '3.2' : '2.7'}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={item.dimension === activeDimensions[0] ? 1 : 0.72}
            />
          ))}
          {primaryPoints.map((point) => {
            const active = selectedDate && point.fullDate === selectedDate;
            const tooltipPoint = { ...point, dimension: activeDimensions[0] };
            return (
              <g
                key={point.fullDate || point.label}
                tabIndex={0}
                role="button"
                onMouseEnter={() => setHoveredPoint(tooltipPoint)}
                onMouseLeave={() => setHoveredPoint(null)}
                onFocus={() => setHoveredPoint(tooltipPoint)}
                onBlur={() => setHoveredPoint(null)}
                onClick={() => setHoveredPoint(tooltipPoint)}
                className="cursor-pointer outline-none"
              >
                <circle cx={point.x} cy={point.y} r={active ? '4.2' : '2.4'} fill={DIMENSION_COLOR[activeDimensions[0]]} stroke={active ? '#fff7ed' : '#ffffff'} strokeWidth={active ? '2.4' : '1'} />
                <text x={point.x} y="97" textAnchor="middle" className="fill-stone-500 text-[5px]">{point.label}</text>
              </g>
            );
          })}
        </svg>
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 min-w-[132px] rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-lg"
            style={{
              left: `${hoveredPoint.x}%`,
              top: `${hoveredPoint.y}%`,
              transform: 'translate(-50%, -112%)',
            }}
          >
            <div className="font-bold text-stone-800">{hoveredPoint.fullDate || hoveredPoint.label}</div>
            <div className="mt-1 flex items-center gap-2 text-stone-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DIMENSION_COLOR[hoveredPoint.dimension || activeDimensions[0]] }} />
              <span>{dimensionShortLabel(SCORE_ITEMS.find((item) => item.key === (hoveredPoint.dimension || activeDimensions[0]))?.label || '综合')}：<b className="text-stone-900">{Math.round(hoveredPoint.value)}</b></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AskPanel = ({
  title,
  dateText,
  suggestions,
  onAsk,
  isAsking,
}: {
  title: string;
  dateText: string;
  suggestions: string[];
  onAsk?: (question: string) => void;
  isAsking?: boolean;
}) => {
  const [draft, setDraft] = useState('');
  const submit = (text = draft) => {
    const question = text.trim();
    if (!question || !onAsk || isAsking) return;
    onAsk(question);
    setDraft('');
  };

  return (
    <div className="rounded-2xl border border-stone-100 bg-white/75 p-4 shadow-sm md:p-6">
      <div className="border-b border-stone-100 pb-3 md:pb-4">
        <div className="text-base font-bold text-stone-800 md:text-lg">{title}</div>
      </div>
      <div className="mt-3 rounded-2xl border border-stone-100 bg-stone-50/50 p-3 md:mt-5 md:p-4">
        <div className="text-sm font-bold text-stone-700">当前日期</div>
        <div className="mt-1 text-lg font-bold text-stone-900 md:mt-2 md:text-xl">{dateText}</div>
      </div>
      <div className="mt-3 flex gap-2 md:mt-5 md:gap-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          placeholder={`输入关于${dateText}的问题`}
          className="glass-input min-w-0 flex-1 rounded-2xl px-3 py-2.5 text-sm outline-none md:px-4 md:py-3"
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={!draft.trim() || !onAsk || isAsking}
          className="glass-cta rounded-2xl px-4 py-2.5 text-sm font-bold text-amber-300 disabled:opacity-50 md:px-5 md:py-3"
        >
          问 AI
        </button>
      </div>
      <div className="mt-4 md:mt-5">
        <div className="mb-2 text-sm font-bold text-stone-600 md:mb-3">常用问题</div>
        <div className="grid gap-2 md:grid-cols-2 md:gap-3">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => submit(item)}
              disabled={!onAsk || isAsking}
              className="rounded-2xl border border-stone-100 bg-white px-3 py-2.5 text-left text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 md:px-4 md:py-3"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const DirectionGrid = ({ directions }: { directions?: Record<string, string> }) => {
  const items = [
    ['caiShen', '财神位'],
    ['xiShen', '喜神位'],
    ['fuShen', '福神位'],
    ['yangGui', '阳贵神'],
    ['yinGui', '阴贵神'],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:gap-3">
      {items.map(([key, label]) => (
        <div key={key} className="rounded-2xl border border-stone-100 bg-stone-50/40 px-3 py-2.5 md:px-4 md:py-3">
          <div className="text-xs text-stone-400">{label}</div>
          <div className="mt-1 text-sm font-bold text-stone-700">{directions?.[key] || '—'}</div>
        </div>
      ))}
    </div>
  );
};

const DailyView = ({ data, onDateChange, onAsk, isAsking, caseOptions, selectedCaseId, onCaseChange }: Props) => {
  const [mode, setMode] = useState<InterpretationMode>('colloquial');
  const [showHours, setShowHours] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const fortune = (data.detail_info as any)?.fortune || {};
  const almanacPayload = fortune.almanac || {};
  const almanac = almanacPayload.almanac || {};
  const currentDate = parseDate(fortune.date || String(data.base_info?.date || ''));
  const yi = asList(almanac.suitable || almanac.yi);
  const ji = asList(almanac.avoid || almanac.ji);
  const hourly = Array.isArray(almanac.hourlyFortune) ? almanac.hourlyFortune : [];
  const advice = Array.isArray(fortune.advice) ? fortune.advice : [];

  const modeAdvice = useMemo(() => {
    const generated = getModeAdvice(fortune, mode);
    return generated.length ? generated : advice;
  }, [advice, fortune, mode]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] xl:gap-6">
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white/75 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-3 md:gap-4 md:p-6">
            <div className="flex flex-1 items-center justify-center gap-2 sm:justify-start md:gap-3">
              <button type="button" onClick={() => onDateChange?.(shiftDate(currentDate, -1))} className="rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-stone-500 hover:bg-stone-50 md:px-3 md:py-2">‹</button>
              <div>
                <div className="text-center text-2xl font-bold text-stone-900 sm:text-left">{formatDateZh(currentDate)}</div>
                <div className="mt-1 text-sm text-stone-500">农历 {almanac.lunarDate || '—'}</div>
              </div>
              <button type="button" onClick={() => onDateChange?.(shiftDate(currentDate, 1))} className="rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-stone-500 hover:bg-stone-50 md:px-3 md:py-2">›</button>
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-2 text-sm sm:w-auto sm:justify-end md:gap-4">
              <div className="text-stone-500">流日：<span className="font-bold text-amber-600">{fortune.dayStem}{fortune.dayBranch}</span></div>
              <div className="text-stone-500">主神：<span className="font-bold text-stone-800">{fortune.tenGod || '—'}</span></div>
              <CaseSelector caseOptions={caseOptions} selectedCaseId={selectedCaseId} onCaseChange={onCaseChange} />
              <div className={`rounded-full bg-stone-50 px-3 py-1 font-bold ${levelTone(fortune.overall || '平')}`}>{fortune.overall || '平'}</div>
            </div>
          </div>

          <div className="space-y-4 p-3 md:space-y-6 md:p-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <div className="mb-2 text-sm font-bold text-emerald-700">宜</div>
                <ChipList items={yi} tone="good" limit={6} collapsible />
              </div>
              <div>
                <div className="mb-2 text-sm font-bold text-red-600">忌</div>
                <ChipList items={ji} tone="bad" limit={6} collapsible />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="rounded-2xl border border-stone-100 bg-stone-50/40 p-3 md:p-4">
                <div className="mb-3 text-sm font-bold text-stone-700">吉神</div>
                <ChipList items={asList(almanac.jishen)} tone="good" limit={6} collapsible />
              </div>
              <div className="rounded-2xl border border-stone-100 bg-stone-50/40 p-3 md:p-4">
                <div className="mb-3 text-sm font-bold text-stone-700">凶煞</div>
                <ChipList items={asList(almanac.xiongsha)} tone="bad" limit={6} collapsible />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
              {[
                ['冲煞', almanac.chongSha],
                ['空亡', almanacPayload.kongWang],
                ['胎神', almanac.taiShen],
                ['天神', `${almanac.tianShen || '—'}${almanac.tianShenType ? `（${almanac.tianShenType}）` : ''}`],
                ['二十八宿', `${almanac.lunarMansion || '—'}${almanac.lunarMansionLuck ? `（${almanac.lunarMansionLuck}）` : ''}`],
                ['纳音', almanac.nayin],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-stone-100 bg-stone-50/40 px-3 py-2.5 md:px-4 md:py-3">
                  <div className="text-xs text-stone-400">{label}</div>
                  <div className="mt-1 text-sm font-bold text-stone-700">{value || '—'}</div>
                </div>
              ))}
            </div>

            <DirectionGrid directions={almanac.directions} />

            {almanac.lunarMansionSong && (
              <div className="rounded-2xl border border-stone-100 bg-stone-50/40 p-3 text-sm leading-7 text-stone-600 md:p-4">
                <span className="font-bold text-stone-700">宿曜歌诀：</span>{almanac.lunarMansionSong}
              </div>
            )}

            {hourly.length > 0 && (
              <div className="border-t border-white/70 pt-4 md:pt-5">
                <button type="button" onClick={() => setShowHours(!showHours)} className="flex w-full items-center justify-between text-left text-sm font-bold text-stone-700">
                  十二时辰吉凶
                  <span className="text-stone-400">{showHours ? '收起' : '展开'}</span>
                </button>
                {showHours && (
                  <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-2 md:gap-3">
                    {hourly.slice(0, 12).map((item: any) => (
                      <div key={item.ganZhi} className="rounded-2xl border border-stone-100 bg-stone-50/40 px-4 py-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="font-bold text-stone-800">{item.ganZhi}</span>
                          <span className={item.tianShenLuck === '吉' ? 'text-emerald-600' : 'text-red-500'}>{item.tianShen} · {item.tianShenLuck}</span>
                        </div>
                        <div className="mt-2 text-xs leading-6 text-stone-500">冲{item.chong} 煞{item.sha}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <FortuneTrendChart trend={fortune.trend || []} selectedDate={fortune.date} />
          <div className="rounded-2xl border border-stone-100 bg-white/75 p-4 shadow-sm md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
              <div>
                <div className="text-base font-bold text-stone-800 md:text-lg">运势分析</div>
                <div className="mt-1 text-sm text-stone-400">日干支：{fortune.dayStem}{fortune.dayBranch}</div>
              </div>
              <button type="button" onClick={() => setShareOpen(true)} className="rounded-2xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-bold text-stone-600 md:px-4 md:py-2">分享</button>
            </div>
            <ScoreBars fortune={fortune} />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/70 pt-4 md:mt-6 md:gap-4 md:pt-5">
              <div>
                <div className="text-xs text-stone-400">幸运色</div>
                <div className="mt-1 text-lg font-bold text-stone-800 md:text-xl">{fortune.luckyColor || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-stone-400">吉方位</div>
                <div className="mt-1 text-lg font-bold text-stone-800 md:text-xl">{fortune.luckyDirection || '—'}</div>
              </div>
            </div>
            <div className="mt-4 border-t border-white/70 pt-4 md:mt-6 md:pt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 md:mb-4">
                <div className="text-base font-bold text-stone-800 md:text-lg">运势指引</div>
                <InterpretationModeControl
                  mode={mode}
                  onModeChange={setMode}
                  activeClass="bg-sky-500 text-white shadow-sm"
                />
              </div>
              <ol className="space-y-2 md:space-y-3">
                {modeAdvice.map((item: string, index: number) => (
                  <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-7 text-stone-700">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/70 text-xs font-bold text-stone-500">{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <AskPanel
        title="问 AI"
        dateText={formatDateZh(currentDate)}
        onAsk={onAsk}
        isAsking={isAsking}
        suggestions={[
          '这一天适合做什么事情？',
          '这一天有什么需要注意的？',
          '这一天的吉凶如何？',
          '这一天适合出行吗？',
          '这一天适合签约或开业吗？',
          '这一天的财运如何？',
        ]}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${formatDateZh(currentDate)} 运势`}
        subtitle={`流日 ${fortune.dayStem || ''}${fortune.dayBranch || ''} · 主神 ${fortune.tenGod || '—'}`}
        metrics={getShareMetrics(fortune)}
        yi={yi}
        ji={ji}
        lines={[
          `综合：${fortune.overall || '平'}，主神：${fortune.tenGod || '—'}`,
          `事业：${fortune.career || '平'}，感情：${fortune.love || '平'}，财运：${fortune.wealth || '平'}`,
          `幸运色：${fortune.luckyColor || '—'}，吉方位：${fortune.luckyDirection || '—'}`,
          `建议：${advice.slice(0, 3).join(' ') || '稳中求进，顺势而为。'}`,
        ]}
      />
    </div>
  );
};

const MonthlyTrend = ({ calendar }: { calendar: any[] }) => {
  const [activeDimensions, setActiveDimensions] = useState<DimensionKey[]>(['overall', 'career']);
  const [hoveredPoint, setHoveredPoint] = useState<TrendPoint | null>(null);
  const { series, range } = useMemo(() => {
    const values = activeDimensions.flatMap((dimension) =>
      calendar.map((item: any) => item.scores?.[dimension] ?? item.scores?.overall ?? levelValue(item.level))
    );
    const nextRange = getAdaptiveChartRange(values);
    const nextSeries = activeDimensions.map((dimension) => ({
      dimension,
      points: calendar.map((item: any, index: number) => {
        const value = item.scores?.[dimension] ?? item.scores?.overall ?? levelValue(item.level);
        const x = chartX(index, calendar.length);
        const y = chartY(value, nextRange.min, nextRange.max);
        return { x, y, label: `${item.day}`, value, fullDate: item.date, dimension };
      }),
    }));
    return { series: nextSeries, range: nextRange };
  }, [calendar, activeDimensions]);
  if (!series.length) return null;
  const primaryPoints = series[0]?.points || [];
  const tickLabels = new Set(
    primaryPoints
      .filter((point, index) => {
        const day = Number(point.label);
        return index === 0 || index === primaryPoints.length - 1 || [7, 14, 21, 28].includes(day);
      })
      .map((point) => point.label)
  );
  const toggleDimension = (dimension: DimensionKey) => {
    setActiveDimensions((current) => {
      if (current.includes(dimension)) {
        return current.length === 1 ? current : current.filter((item) => item !== dimension);
      }
      return [...current, dimension];
    });
  };
  return (
    <div className="rounded-2xl border border-stone-100 bg-white/75 p-4 shadow-sm md:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 md:mb-4 md:gap-3">
        <div className="text-base font-bold text-stone-800 md:text-lg">运势起伏</div>
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {SCORE_ITEMS.map((item) => (
            <button key={item.key} type="button" onClick={() => toggleDimension(item.key)} className={`rounded-full px-2.5 py-1 text-xs font-bold transition md:px-3 md:py-1.5 ${activeDimensions.includes(item.key) ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-stone-50 text-stone-500 hover:bg-white'}`}>
              {dimensionShortLabel(item.label)}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-60 w-full rounded-2xl border border-stone-100 bg-stone-50/30 p-2 md:h-80">
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
          {chartGridValues(range).map((line) => (
            <line key={line} x1="8" y1={chartY(line, range.min, range.max)} x2="92" y2={chartY(line, range.min, range.max)} stroke="#e7e5e4" strokeWidth="0.4" strokeDasharray="1.5 2" />
          ))}
          {series.map((item) => (
            <path
              key={item.dimension}
              d={smoothPath(item.points)}
              fill="none"
              stroke={DIMENSION_COLOR[item.dimension]}
              strokeWidth={item.dimension === activeDimensions[0] ? '3.2' : '2.8'}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={item.dimension === activeDimensions[0] ? 1 : 0.72}
            />
          ))}
          {primaryPoints.map((point, index) => {
            const tooltipPoint = { ...point, dimension: activeDimensions[0] };
            const showDot = index === 0 || index === primaryPoints.length - 1 || index % 3 === 0;
            return (
              <g
                key={point.fullDate || point.label}
                tabIndex={0}
                role="button"
                onMouseEnter={() => setHoveredPoint(tooltipPoint)}
                onMouseLeave={() => setHoveredPoint(null)}
                onFocus={() => setHoveredPoint(tooltipPoint)}
                onBlur={() => setHoveredPoint(null)}
                onClick={() => setHoveredPoint(tooltipPoint)}
                className="cursor-pointer outline-none"
              >
                <circle cx={point.x} cy={point.y} r={showDot ? '2.25' : '1.25'} fill={DIMENSION_COLOR[activeDimensions[0]]} stroke="#fff" strokeWidth={showDot ? '1' : '0'} opacity={showDot ? 1 : 0.25} />
                {tickLabels.has(point.label) && (
                  <text x={point.x} y="97" textAnchor="middle" className="fill-stone-500 text-[5px]">{point.label}日</text>
                )}
              </g>
            );
          })}
        </svg>
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 min-w-[128px] rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-lg"
            style={{
              left: `${hoveredPoint.x}%`,
              top: `${hoveredPoint.y}%`,
              transform: 'translate(-50%, -112%)',
            }}
          >
            <div className="font-bold text-stone-800">{hoveredPoint.fullDate || `${hoveredPoint.label}日`}</div>
            <div className="mt-1 flex items-center gap-2 text-stone-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DIMENSION_COLOR[hoveredPoint.dimension || activeDimensions[0]] }} />
              <span>{dimensionShortLabel(SCORE_ITEMS.find((item) => item.key === (hoveredPoint.dimension || activeDimensions[0]))?.label || '综合')}：<b className="text-stone-900">{Math.round(hoveredPoint.value)}</b></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MonthlyView = ({ data, onDateChange, onOpenDailyDate, onAsk, isAsking, caseOptions, selectedCaseId, onCaseChange }: Props) => {
  const [mode, setMode] = useState<InterpretationMode>('colloquial');
  const [shareOpen, setShareOpen] = useState(false);
  const fortune = (data.detail_info as any)?.fortune || {};
  const calendar = Array.isArray(fortune.calendar) ? fortune.calendar : [];
  const year = Number(fortune.year || new Date().getFullYear());
  const month = Number(fortune.month || new Date().getMonth() + 1);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const monthDate = new Date(year, month - 1, 1);
  const monthlyGuide = useMemo(() => {
    const generated = getModeAdvice(fortune, mode);
    if (generated.length) return generated;
    return [
      `${MODE_PREFIX[mode]}综合为${fortune.overall || '平'}，本月宜先定节奏，再处理关键事项。`,
      `${MODE_PREFIX[mode]}事业为${fortune.career || '平'}，重要沟通尽量提前准备方案和边界。`,
      `${MODE_PREFIX[mode]}财运为${fortune.wealth || '平'}，支出与合作事项以可验证信息为准。`,
      `${MODE_PREFIX[mode]}感情为${fortune.love || '平'}，少用试探，多用明确表达。`,
    ];
  }, [fortune, mode]);
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white/75 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-3 md:gap-4 md:p-6">
          <div className="flex flex-1 items-center justify-center gap-2 sm:justify-start md:gap-3">
            <button type="button" onClick={() => onDateChange?.(shiftMonth(year, month, -1))} className="rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-stone-500 hover:bg-stone-50 md:px-3 md:py-2">‹</button>
            <div className="text-center">
              <div className="text-2xl font-bold text-stone-900">{year}年 {month}月</div>
              <button type="button" onClick={() => onDateChange?.(new Date())} className="mt-1 text-xs text-stone-500 hover:text-stone-800">回到本月</button>
            </div>
            <button type="button" onClick={() => onDateChange?.(shiftMonth(year, month, 1))} className="rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-stone-500 hover:bg-stone-50 md:px-3 md:py-2">›</button>
          </div>
          <div className="w-full rounded-full border border-stone-100 bg-stone-50/70 px-3 py-2 text-center text-sm text-stone-600 sm:w-auto sm:text-left md:px-4">
            <span className="mr-2">命主</span>
            <CaseSelector caseOptions={caseOptions} selectedCaseId={selectedCaseId} onCaseChange={onCaseChange} />
            {!caseOptions?.length && <span className="font-bold text-indigo-600">{String(data.base_info?.name || '当前命例')}</span>}
          </div>
        </div>
        <div className="grid gap-4 p-3 md:grid-cols-[0.85fr_1.15fr] md:gap-6 md:p-6">
          <div className="border-b border-stone-100 pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-6">
            <div className="text-sm font-bold text-stone-500">本月能量</div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-stone-900 md:text-4xl">{fortune.monthStem}{fortune.monthBranch}</span>
              <span className="text-sm text-stone-500">月</span>
            </div>
            <div className="mt-4 inline-flex rounded-2xl bg-stone-50 px-4 py-2 text-sm text-stone-600">
              主运十神：<span className="ml-1 font-bold text-stone-800">{fortune.tenGod || '—'}</span>
            </div>
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-stone-500">
                <span>综合运势</span>
                <span className={levelTone(fortune.overall || '平')}>{fortune.overall || '平'}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <div className={`h-full ${levelBar(fortune.overall || '平')}`} style={{ width: `${fortune._chart?.overall || 52}%` }} />
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2 text-base font-bold text-stone-800 md:mb-3 md:text-lg">运势批语</div>
            <p className="text-sm leading-8 text-stone-700">{fortune.summary || '本月宜稳中求进，结合每日运程安排节奏。'}</p>
            <div className="mt-4 md:mt-6">
              <ScoreBars fortune={fortune} />
            </div>
            <div className="mt-4 border-t border-stone-100 pt-4 md:mt-6 md:pt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 md:mb-4">
                <div className="text-base font-bold text-stone-800 md:text-lg">本月指引</div>
                <InterpretationModeControl
                  mode={mode}
                  onModeChange={setMode}
                  activeClass="bg-orange-500 text-white shadow-sm"
                />
              </div>
              <ol className="space-y-2 md:space-y-3">
                {monthlyGuide.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-7 text-stone-700">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-xs font-bold text-stone-500">{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <MonthlyTrend calendar={calendar} />

      <div className="rounded-2xl border border-stone-100 bg-white/75 p-4 shadow-sm md:p-6">
        <div className="mb-3 flex items-center justify-between gap-3 md:mb-4">
          <div className="text-base font-bold text-stone-800 md:text-lg">每日运程</div>
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-stone-500">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />吉</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-stone-400" />平</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />凶</span>
            <button type="button" onClick={() => setShareOpen(true)} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 font-bold text-stone-600">
              分享
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {['日', '一', '二', '三', '四', '五', '六'].map((item) => (
            <div key={item} className="py-2 text-center text-xs font-semibold text-stone-400">{item}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, index) => <div key={`empty-${index}`} />)}
          {calendar.map((day: any) => {
            const dayDate = new Date(year, month - 1, Number(day.day || 1));
            const isToday = new Date().toDateString() === dayDate.toDateString();
            return (
              <button
                key={day.day}
                type="button"
                onClick={() => (onOpenDailyDate || onDateChange)?.(dayDate)}
                className={`rounded-xl border px-1.5 py-2 text-center transition hover:-translate-y-0.5 hover:bg-white md:rounded-2xl md:px-2 md:py-3 ${
                  isToday ? 'border-orange-200 bg-orange-50/80 ring-1 ring-orange-200' : 'border-stone-100 bg-stone-50/45'
                }`}
              >
                <div className={`text-sm font-semibold ${isToday ? 'text-orange-600' : 'text-stone-600'}`}>{day.day}</div>
                <div className={`mx-auto mt-2 h-2 w-2 rounded-full ${levelDot(day.level)}`} />
                <div className={`mt-1 text-[11px] font-semibold ${levelTone(day.level)}`}>{day.level}</div>
              </button>
            );
          })}
        </div>
      </div>

      <AskPanel
        title="问 AI"
        dateText={`${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月`}
        onAsk={onAsk}
        isAsking={isAsking}
        suggestions={[
          '这个月整体需要把握什么重点？',
          '这个月事业运如何？',
          '这个月财运应该注意什么？',
          '这个月感情运如何？',
          '这个月行动节奏怎么安排？',
          '这个月有什么需要避开的风险？',
        ]}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${year}年${month}月运势`}
        subtitle={`流月 ${fortune.monthStem || ''}${fortune.monthBranch || ''} · 主运 ${fortune.tenGod || '—'}`}
        metrics={getShareMetrics(fortune)}
        yi={calendar.filter((item: any) => ['大吉', '吉', '中吉'].includes(String(item.level))).slice(0, 3).map((item: any) => `${item.day}日 ${item.level}`)}
        ji={calendar.filter((item: any) => ['小凶', '凶'].includes(String(item.level))).slice(0, 3).map((item: any) => `${item.day}日 ${item.level}`)}
        lines={[
          `流月：${fortune.monthStem || ''}${fortune.monthBranch || ''}，主运十神：${fortune.tenGod || '—'}`,
          `综合：${fortune.overall || '平'}，事业：${fortune.career || '平'}，财运：${fortune.wealth || '平'}`,
          `感情：${fortune.love || '平'}，健康：${fortune.health || '平'}，人际：${fortune.social || '平'}`,
          `总结：${fortune.summary || '本月宜稳中求进，结合每日运程安排节奏。'}`,
        ]}
      />
    </div>
  );
};

const FortuneGrid: React.FC<Props> = (props) => {
  const type = (props.data.detail_info as any)?.fortune?.type;
  return type === 'monthly' ? <MonthlyView {...props} /> : <DailyView {...props} />;
};

export default FortuneGrid;
