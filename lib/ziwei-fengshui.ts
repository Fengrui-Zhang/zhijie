import type { ZiweiResponse } from '../types';

export const ZIWEI_FENGSHUI_PROMPT_VERSION = 'ziwei_fengshui_v4' as const;

export const ZIWEI_FENGSHUI_LAYERS = ['natal', 'decadal', 'yearly'] as const;
export type ZiweiFengshuiLayer = (typeof ZIWEI_FENGSHUI_LAYERS)[number];

export type ZiweiFengshuiPeriod = {
  layer: ZiweiFengshuiLayer;
  key: string;
  label: string;
  targetYear: number | null;
  startAge?: number;
  endAge?: number;
  palaceName?: string;
};

export type ZiweiFengshuiDecadalOption = ZiweiFengshuiPeriod & {
  layer: 'decadal';
  targetYear: number;
  startAge: number;
  endAge: number;
  palaceName: string;
};

export const ZIWEI_FENGSHUI_TENDENCIES = ['吉象鲜明', '中性成象', '动象突出', '煞忌成象'] as const;
export type ZiweiFengshuiTendency = (typeof ZIWEI_FENGSHUI_TENDENCIES)[number];

export const ZIWEI_FENGSHUI_EVIDENCE_GRADES = ['稳定传统', '视频明示', '扩展取象'] as const;
export type ZiweiFengshuiEvidenceGrade = (typeof ZIWEI_FENGSHUI_EVIDENCE_GRADES)[number];

export type ZiweiFengshuiFocus = 'overall' | 'wealth' | 'career' | 'social' | 'study' | 'relationship' | 'health' | 'home';

export type ZiweiDirection = {
  branch: string;
  centerDegree: number;
  degreeRange: string;
  direction: string;
  element: string;
};

export type ZiweiFengshuiEvidence = {
  chain: string;
  grade: ZiweiFengshuiEvidenceGrade;
};

export type ZiweiFengshuiObjectPrediction = {
  item: string;
  state: string;
  basis: string;
};

export type ZiweiFengshuiEnhancementItem = {
  item: string;
  material: string;
  color: string;
  quantity: string;
  symbolism: string;
};

export type ZiweiFengshuiEnhancementAdvice = {
  goal: string;
  supportingStar: string;
  items: ZiweiFengshuiEnhancementItem[];
  placement: string;
  activationLogic: string;
  expectedEffect: string;
};

export type ZiweiFengshuiPalaceResult = {
  palaceName: string;
  branch: string;
  direction: string;
  degreeRange: string;
  centerDegree: number;
  tendency: ZiweiFengshuiTendency;
  summary: string;
  predictedObjects: ZiweiFengshuiObjectPrediction[];
  natalEvidence: string[];
  timingEvidence: string[];
  enhancementAdvice: ZiweiFengshuiEnhancementAdvice;
  contraindications: string[];
  evidenceChains: ZiweiFengshuiEvidence[];
};

export type ZiweiFengshuiResult = {
  schemaVersion: typeof ZIWEI_FENGSHUI_PROMPT_VERSION;
  analysisLayer: ZiweiFengshuiLayer;
  periodKey: string;
  periodLabel: string;
  targetYear: number | null;
  generatedAt: string;
  summary: string;
  periodNotice: string;
  priorityPalaceNames: string[];
  palaces: ZiweiFengshuiPalaceResult[];
};

export type ZiweiFengshuiGenerationPayload = {
  summary: string;
  periodNotice: string;
  priorityPalaceNames: string[];
  palaces: Array<Omit<ZiweiFengshuiPalaceResult, 'branch' | 'direction' | 'degreeRange' | 'centerDegree'>>;
};

export const ZIWEI_DIRECTIONS: Record<string, ZiweiDirection> = {
  子: { branch: '子', centerDegree: 0, degreeRange: '345°–15°', direction: '正北', element: '水' },
  丑: { branch: '丑', centerDegree: 30, degreeRange: '15°–45°', direction: '东北偏北', element: '土' },
  寅: { branch: '寅', centerDegree: 60, degreeRange: '45°–75°', direction: '东北偏东', element: '木' },
  卯: { branch: '卯', centerDegree: 90, degreeRange: '75°–105°', direction: '正东', element: '木' },
  辰: { branch: '辰', centerDegree: 120, degreeRange: '105°–135°', direction: '东南偏东', element: '土' },
  巳: { branch: '巳', centerDegree: 150, degreeRange: '135°–165°', direction: '东南偏南', element: '火' },
  午: { branch: '午', centerDegree: 180, degreeRange: '165°–195°', direction: '正南', element: '火' },
  未: { branch: '未', centerDegree: 210, degreeRange: '195°–225°', direction: '西南偏南', element: '土' },
  申: { branch: '申', centerDegree: 240, degreeRange: '225°–255°', direction: '西南偏西', element: '金' },
  酉: { branch: '酉', centerDegree: 270, degreeRange: '255°–285°', direction: '正西', element: '金' },
  戌: { branch: '戌', centerDegree: 300, degreeRange: '285°–315°', direction: '西北偏西', element: '土' },
  亥: { branch: '亥', centerDegree: 330, degreeRange: '315°–345°', direction: '西北偏北', element: '水' },
};

export const ZIWEI_FENGSHUI_FOCUS_OPTIONS: Array<{ key: ZiweiFengshuiFocus; label: string }> = [
  { key: 'overall', label: '全盘' },
  { key: 'wealth', label: '财运' },
  { key: 'career', label: '事业' },
  { key: 'social', label: '人际/交友' },
  { key: 'study', label: '学习' },
  { key: 'relationship', label: '感情' },
  { key: 'health', label: '健康' },
  { key: 'home', label: '住宅' },
];

export const ZIWEI_FENGSHUI_LAYER_OPTIONS: Array<{ key: ZiweiFengshuiLayer; label: string }> = [
  { key: 'natal', label: '本命' },
  { key: 'decadal', label: '大运' },
  { key: 'yearly', label: '流年' },
];

export function getZiweiFengshuiDecadalOptions(data: ZiweiResponse): ZiweiFengshuiDecadalOption[] {
  const canonical = data.taibuJson as { 十二宫位?: Array<{ 宫位?: string; 大限?: string }> } | undefined;
  const birthYear = Number(String((data.taibuJson as any)?.基本信息?.阳历 || data.base_info.gongli || '').match(/\d{4}/)?.[0]);
  if (!Number.isInteger(birthYear)) return [];
  return (canonical?.十二宫位 || [])
    .flatMap((palace) => {
      const match = String(palace.大限 || '').match(/(\d+)[~～—–-](\d+)/u);
      if (!match) return [];
      const startAge = Number(match[1]);
      const endAge = Number(match[2]);
      const startYear = birthYear + startAge - 1;
      const endYear = birthYear + endAge - 1;
      return [{
        layer: 'decadal' as const,
        key: `${startAge}-${endAge}`,
        label: `${startAge}–${endAge}岁 · ${palace.宫位 || '大运'}`,
        targetYear: Math.min(2200, Math.max(1900, startYear + Math.floor((endYear - startYear) / 2))),
        startAge,
        endAge,
        palaceName: palace.宫位 || '',
      }];
    })
    .sort((left, right) => left.startAge - right.startAge);
}

export function resolveZiweiFengshuiPeriod(
  data: ZiweiResponse,
  layer: ZiweiFengshuiLayer,
  periodKey?: string | null,
): ZiweiFengshuiPeriod {
  if (layer === 'natal') return { layer, key: 'natal', label: '原命局', targetYear: null };
  if (layer === 'yearly') {
    const year = Number.parseInt(String(periodKey || ''), 10);
    if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error('流年必须在 1900–2200 之间');
    return { layer, key: String(year), label: `${year}年流年`, targetYear: year };
  }
  const option = getZiweiFengshuiDecadalOptions(data).find((item) => item.key === periodKey);
  if (!option) throw new Error('所选大运不在该命盘的大运列表中');
  return option;
}

const FOCUS_PALACE_CANDIDATES: Record<Exclude<ZiweiFengshuiFocus, 'overall'>, string[]> = {
  wealth: ['财帛宫', '福德宫', '田宅宫'],
  career: ['官禄宫', '命宫', '迁移宫'],
  social: ['交友宫', '仆役宫', '兄弟宫', '官禄宫'],
  study: ['命宫', '父母宫', '官禄宫'],
  relationship: ['夫妻宫', '子女宫', '福德宫'],
  health: ['疾厄宫', '父母宫', '命宫'],
  home: ['田宅宫', '子女宫', '命宫'],
};

export function getZiweiDirection(branch: string): ZiweiDirection {
  const direction = ZIWEI_DIRECTIONS[branch];
  if (!direction) throw new Error(`无法识别紫微宫位地支：${branch || '空'}`);
  return direction;
}

export function getZiweiFengshuiFocusPalaces(
  focus: ZiweiFengshuiFocus,
  result: ZiweiFengshuiResult | null,
): string[] {
  const available = new Set(result?.palaces.map((palace) => palace.palaceName) || []);
  const candidates = focus === 'overall'
    ? result?.priorityPalaceNames || []
    : FOCUS_PALACE_CANDIDATES[focus];
  return candidates.filter((name, index) => available.has(name) && candidates.indexOf(name) === index).slice(0, 3);
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const readString = (value: unknown, field: string, maxLength = 800) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}不能为空`);
  return value.trim().slice(0, maxLength);
};

const readStringList = (value: unknown, field: string, options: { min?: number; max?: number; itemLength?: number } = {}) => {
  const { min = 0, max = 6, itemLength = 280 } = options;
  if (!Array.isArray(value)) throw new Error(`${field}必须是数组`);
  const list = value.map((item, index) => readString(item, `${field}[${index}]`, itemLength));
  if (list.length < min || list.length > max) throw new Error(`${field}数量必须在${min}-${max}之间`);
  return list;
};

function readObjectPredictions(value: unknown, field: string): ZiweiFengshuiObjectPrediction[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) throw new Error(`${field}数量必须在2-6之间`);
  return value.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`${field}[${index}]格式无效`);
    return {
      item: readString(entry.item, `${field}[${index}].item`, 160),
      state: readString(entry.state, `${field}[${index}].state`, 220),
      basis: readString(entry.basis, `${field}[${index}].basis`, 300),
    };
  });
}

function readEnhancementAdvice(value: unknown, field: string): ZiweiFengshuiEnhancementAdvice {
  if (!isRecord(value)) throw new Error(`${field}格式无效`);
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 3) {
    throw new Error(`${field}.items数量必须在1-3之间`);
  }
  return {
    goal: readString(value.goal, `${field}.goal`, 100),
    supportingStar: readString(value.supportingStar, `${field}.supportingStar`, 120),
    items: value.items.map((entry, index) => {
      if (!isRecord(entry)) throw new Error(`${field}.items[${index}]格式无效`);
      return {
        item: readString(entry.item, `${field}.items[${index}].item`, 160),
        material: readString(entry.material, `${field}.items[${index}].material`, 120),
        color: readString(entry.color, `${field}.items[${index}].color`, 120),
        quantity: readString(entry.quantity, `${field}.items[${index}].quantity`, 120),
        symbolism: readString(entry.symbolism, `${field}.items[${index}].symbolism`, 260),
      };
    }),
    placement: readString(value.placement, `${field}.placement`, 320),
    activationLogic: readString(value.activationLogic, `${field}.activationLogic`, 420),
    expectedEffect: readString(value.expectedEffect, `${field}.expectedEffect`, 260),
  };
}

export function validateZiweiFengshuiGeneration(
  raw: unknown,
  expectedPalaces: Array<{ palaceName: string; branch: string }>,
  period: ZiweiFengshuiPeriod,
  generatedAt = new Date().toISOString(),
): ZiweiFengshuiResult {
  if (!isRecord(raw)) throw new Error('模型返回的紫微风水结果不是对象');
  const palaceRows = raw.palaces;
  if (!Array.isArray(palaceRows) || palaceRows.length !== 12) throw new Error('模型必须返回恰好十二个宫位');

  const expectedMap = new Map(expectedPalaces.map((palace) => [palace.palaceName, palace]));
  if (expectedMap.size !== 12) throw new Error('排盘数据未包含十二个唯一宫位');
  const seen = new Set<string>();
  const palaces = palaceRows.map((value, index): ZiweiFengshuiPalaceResult => {
    if (!isRecord(value)) throw new Error(`palaces[${index}]格式无效`);
    const palaceName = readString(value.palaceName, `palaces[${index}].palaceName`, 20);
    const expected = expectedMap.get(palaceName);
    if (!expected) throw new Error(`模型返回未知宫位：${palaceName}`);
    if (seen.has(palaceName)) throw new Error(`模型重复返回宫位：${palaceName}`);
    seen.add(palaceName);
    const tendency = value.tendency;
    if (!ZIWEI_FENGSHUI_TENDENCIES.includes(tendency as ZiweiFengshuiTendency)) {
      throw new Error(`${palaceName}的物象倾向无效`);
    }
    const chainsRaw = value.evidenceChains;
    if (!Array.isArray(chainsRaw) || chainsRaw.length < 2 || chainsRaw.length > 4) {
      throw new Error(`${palaceName}的象意链数量必须在2-4之间`);
    }
    const evidenceChains = chainsRaw.map((chain, chainIndex): ZiweiFengshuiEvidence => {
      if (!isRecord(chain)) throw new Error(`${palaceName}.evidenceChains[${chainIndex}]格式无效`);
      const grade = chain.grade;
      if (!ZIWEI_FENGSHUI_EVIDENCE_GRADES.includes(grade as ZiweiFengshuiEvidenceGrade)) {
        throw new Error(`${palaceName}的象意来源等级无效`);
      }
      return {
        chain: readString(chain.chain, `${palaceName}.evidenceChains[${chainIndex}].chain`, 420),
        grade: grade as ZiweiFengshuiEvidenceGrade,
      };
    });
    const direction = getZiweiDirection(expected.branch);
    return {
      palaceName,
      branch: expected.branch,
      direction: direction.direction,
      degreeRange: direction.degreeRange,
      centerDegree: direction.centerDegree,
      tendency: tendency as ZiweiFengshuiTendency,
      summary: readString(value.summary, `${palaceName}.summary`, 220),
      predictedObjects: readObjectPredictions(value.predictedObjects, `${palaceName}.predictedObjects`),
      natalEvidence: readStringList(value.natalEvidence, `${palaceName}.natalEvidence`, { min: 1, max: 5 }),
      timingEvidence: readStringList(value.timingEvidence, `${palaceName}.timingEvidence`, { min: 0, max: 5 }),
      enhancementAdvice: readEnhancementAdvice(value.enhancementAdvice, `${palaceName}.enhancementAdvice`),
      contraindications: readStringList(value.contraindications, `${palaceName}.contraindications`, { min: 1, max: 4 }),
      evidenceChains,
    };
  });

  if (seen.size !== expectedMap.size) throw new Error('模型未覆盖全部十二宫');
  const priorityPalaceNames = readStringList(raw.priorityPalaceNames, 'priorityPalaceNames', { min: 1, max: 3, itemLength: 20 });
  for (const name of priorityPalaceNames) {
    if (!expectedMap.has(name)) throw new Error(`优先宫位无效：${name}`);
  }

  return {
    schemaVersion: ZIWEI_FENGSHUI_PROMPT_VERSION,
    analysisLayer: period.layer,
    periodKey: period.key,
    periodLabel: period.label,
    targetYear: period.targetYear,
    generatedAt,
    summary: readString(raw.summary, 'summary', 900),
    periodNotice: readString(raw.periodNotice, 'periodNotice', 600),
    priorityPalaceNames,
    palaces,
  };
}
