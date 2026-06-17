export type WuxingCalibrationStrength = 'veryWeak' | 'weak' | 'balanced' | 'strong' | 'veryStrong';

export interface WuxingCalibration {
  source: 'ai_wuxing';
  strengthLevel?: WuxingCalibrationStrength;
  strengthScore?: number;
  favorableElements: string[];
  unfavorableElements: string[];
  elementScores?: Record<string, number>;
  reason: string;
  extractedAt: string;
  generatedAt?: string;
}

const ELEMENTS = ['木', '火', '土', '金', '水'];
const STRENGTH_SCORE: Record<WuxingCalibrationStrength, number> = {
  veryWeak: 24,
  weak: 38,
  balanced: 55,
  strong: 70,
  veryStrong: 84,
};
const STRENGTH_LABEL: Record<WuxingCalibrationStrength, string> = {
  veryWeak: '极弱',
  weak: '偏弱',
  balanced: '中和',
  strong: '偏强',
  veryStrong: '极强',
};

const toRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const uniqElements = (values: unknown[]): string[] => {
  const result: string[] = [];
  const pushFromText = (text: string) => {
    ELEMENTS.forEach((element) => {
      if (text.includes(element) && !result.includes(element)) result.push(element);
    });
  };
  values.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => pushFromText(String(item || '')));
      return;
    }
    if (typeof value === 'string') pushFromText(value);
  });
  return result;
};

const normalizeStrength = (value: unknown): WuxingCalibrationStrength | undefined => {
  const text = String(value || '').trim();
  if (!text) return undefined;
  if (text === 'veryWeak' || text.includes('极弱') || text.includes('太弱')) return 'veryWeak';
  if (text === 'weak' || text.includes('偏弱') || text.includes('身弱') || text.includes('较弱')) return 'weak';
  if (text === 'balanced' || text.includes('中和') || text.includes('平衡') || text.includes('均衡')) return 'balanced';
  if (text === 'veryStrong' || text.includes('极强') || text.includes('太旺') || text.includes('过旺')) return 'veryStrong';
  if (text === 'strong' || text.includes('偏强') || text.includes('身强') || text.includes('较旺') || text.includes('旺')) return 'strong';
  return undefined;
};

const extractTextWindow = (content: string, labels: string[]) => {
  for (const label of labels) {
    const index = content.indexOf(label);
    if (index < 0) continue;
    return content.slice(index, index + 140);
  }
  return '';
};

const extractSectionByLabels = (content: string, labels: string[], stopLabels: string[]) => {
  for (const label of labels) {
    const start = content.indexOf(label);
    if (start < 0) continue;
    const fromLabel = content.slice(start);
    const hardStopCandidates = [
      ...stopLabels.map((stop) => {
        const index = fromLabel.indexOf(stop, label.length);
        return index > 0 ? index : Number.POSITIVE_INFINITY;
      }),
      ...['\n', '。', '；', ';'].map((stop) => {
        const index = fromLabel.indexOf(stop, label.length);
        return index > 0 ? index : Number.POSITIVE_INFINITY;
      }),
      80,
    ];
    const end = Math.min(...hardStopCandidates);
    return fromLabel.slice(0, Number.isFinite(end) ? end : 80);
  }
  return '';
};

const extractChartJsonBlocks = (content: string) => {
  const blocks: Record<string, unknown>[] = [];
  const pattern = /```chart-json\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const record = toRecord(parsed);
      if (record) blocks.push(record);
    } catch {
      // Ignore malformed visualization blocks; the prose fallback can still work.
    }
  }
  return blocks;
};

const extractElementScores = (data: Record<string, unknown>) => {
  const scores: Record<string, number> = {};
  const elements = data.elements;
  if (Array.isArray(elements)) {
    elements.forEach((item) => {
      const record = toRecord(item);
      if (!record) return;
      const element = String(record.element || record.name || record.label || '');
      const value = Number(record.score ?? record.value ?? record.energy);
      if (ELEMENTS.includes(element) && Number.isFinite(value)) {
        scores[element] = Math.max(0, Math.min(100, Math.round(value)));
      }
    });
  } else {
    const record = toRecord(elements);
    if (record) {
      ELEMENTS.forEach((element) => {
        const value = Number(record[element]);
        if (Number.isFinite(value)) scores[element] = Math.max(0, Math.min(100, Math.round(value)));
      });
    }
  }
  return Object.keys(scores).length ? scores : undefined;
};

export const getStoredWuxingCalibration = (initialAnalysisData: unknown): WuxingCalibration | null => {
  const root = toRecord(initialAnalysisData);
  const store = toRecord(root?.baziBasicAnalyses);
  const calibration = toRecord(store?.wuxingCalibration);
  if (!calibration || calibration.source !== 'ai_wuxing') return null;
  const favorableElements = uniqElements([calibration.favorableElements]);
  const unfavorableElements = uniqElements([calibration.unfavorableElements]);
  if (!calibration.strengthLevel && favorableElements.length === 0 && unfavorableElements.length === 0) return null;
  return {
    source: 'ai_wuxing',
    strengthLevel: normalizeStrength(calibration.strengthLevel),
    strengthScore: Number.isFinite(Number(calibration.strengthScore)) ? Number(calibration.strengthScore) : undefined,
    favorableElements,
    unfavorableElements,
    elementScores: toRecord(calibration.elementScores) as Record<string, number> | undefined,
    reason: typeof calibration.reason === 'string' ? calibration.reason : '已参考 AI 五行分析结果。',
    extractedAt: typeof calibration.extractedAt === 'string' ? calibration.extractedAt : new Date().toISOString(),
    generatedAt: typeof calibration.generatedAt === 'string' ? calibration.generatedAt : undefined,
  };
};

export const getSavedWuxingAnalysisContent = (initialAnalysisData: unknown) => {
  const root = toRecord(initialAnalysisData);
  const store = toRecord(root?.baziBasicAnalyses);
  const item = toRecord(store?.wuxing);
  const content = item?.content;
  return typeof content === 'string' && content.trim() ? content.trim() : '';
};

export const extractWuxingCalibrationFromContent = (
  content: string,
  options: { generatedAt?: string } = {},
): WuxingCalibration | null => {
  const text = content.trim();
  if (!text) return null;

  let strengthLevel: WuxingCalibrationStrength | undefined;
  let favorableElements: string[] = [];
  let unfavorableElements: string[] = [];
  let elementScores: Record<string, number> | undefined;

  for (const block of extractChartJsonBlocks(text)) {
    if (block.chartType !== 'wuxing_energy') continue;
    const data = toRecord(block.data);
    if (!data) continue;
    strengthLevel = strengthLevel || normalizeStrength(data.strengthLevel || data.dayMasterStrength || data.strength);
    favorableElements = uniqElements([
      favorableElements,
      data.favorableElements,
      data.favorableElement,
      data.usefulElements,
      data.usefulGod,
      data.yongshen,
    ]);
    unfavorableElements = uniqElements([
      unfavorableElements,
      data.unfavorableElements,
      data.unfavorableElement,
      data.avoidElements,
      data.avoidGod,
      data.jishen,
    ]);
    elementScores = elementScores || extractElementScores(data);
  }

  const strengthWindow = extractTextWindow(text, ['日主', '身强', '身弱', '强弱', '旺衰', '平衡']);
  strengthLevel = strengthLevel || normalizeStrength(strengthWindow || text.slice(0, 500));
  favorableElements = favorableElements.length
    ? favorableElements
    : uniqElements([extractSectionByLabels(text, ['喜用神', '用神', '喜神', '喜用'], ['忌神', '忌用', '忌讳'])]);
  unfavorableElements = unfavorableElements.length
    ? unfavorableElements
    : uniqElements([extractSectionByLabels(text, ['忌神', '忌用', '忌讳'], ['喜用神', '用神', '喜神', '喜用'])]);

  if (!strengthLevel && favorableElements.length === 0 && unfavorableElements.length === 0) return null;

  const reasonParts = [
    strengthLevel ? `强弱：${STRENGTH_LABEL[strengthLevel]}` : '',
    favorableElements.length ? `喜用：${favorableElements.join('、')}` : '',
    unfavorableElements.length ? `忌神：${unfavorableElements.join('、')}` : '',
  ].filter(Boolean);

  return {
    source: 'ai_wuxing',
    strengthLevel,
    strengthScore: strengthLevel ? STRENGTH_SCORE[strengthLevel] : undefined,
    favorableElements,
    unfavorableElements,
    elementScores,
    reason: reasonParts.length ? `AI五行分析提取：${reasonParts.join('；')}。` : '已参考 AI 五行分析结果。',
    extractedAt: new Date().toISOString(),
    generatedAt: options.generatedAt,
  };
};

export const attachWuxingCalibration = (initialAnalysisData: unknown) => {
  if (getStoredWuxingCalibration(initialAnalysisData)) return initialAnalysisData;
  const content = getSavedWuxingAnalysisContent(initialAnalysisData);
  if (!content) return initialAnalysisData;
  const root = toRecord(initialAnalysisData);
  const store = toRecord(root?.baziBasicAnalyses) || {};
  const wuxing = toRecord(store.wuxing);
  const calibration = extractWuxingCalibrationFromContent(content, {
    generatedAt: typeof wuxing?.generatedAt === 'string' ? wuxing.generatedAt : undefined,
  });
  if (!calibration) return initialAnalysisData;
  return {
    ...(root || {}),
    baziBasicAnalyses: {
      ...store,
      wuxingCalibration: calibration,
    },
  };
};
