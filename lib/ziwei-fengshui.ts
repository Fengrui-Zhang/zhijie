export const ZIWEI_FENGSHUI_PROMPT_VERSION = 'ziwei_fengshui_v2' as const;

export const ZIWEI_FENGSHUI_STATUSES = ['协调顺畅', '基本平稳', '杂乱受阻', '重点调整'] as const;
export type ZiweiFengshuiStatus = (typeof ZIWEI_FENGSHUI_STATUSES)[number];

export const ZIWEI_FENGSHUI_EVIDENCE_GRADES = ['稳定传统', '视频明示', '扩展取象'] as const;
export type ZiweiFengshuiEvidenceGrade = (typeof ZIWEI_FENGSHUI_EVIDENCE_GRADES)[number];

export type ZiweiFengshuiFocus = 'overall' | 'wealth' | 'career' | 'study' | 'relationship' | 'health' | 'home';

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

export type ZiweiFengshuiPlacementAdvice = {
  item: string;
  method: string;
  reason: string;
  avoidWhen: string[];
};

export type ZiweiFengshuiPalaceResult = {
  palaceName: string;
  branch: string;
  direction: string;
  degreeRange: string;
  centerDegree: number;
  status: ZiweiFengshuiStatus;
  summary: string;
  currentObjects: string[];
  natalEvidence: string[];
  yearlyEvidence: string[];
  optimizationSteps: string[];
  placementAdvice: ZiweiFengshuiPlacementAdvice;
  avoid: string[];
  evidenceChains: ZiweiFengshuiEvidence[];
};

export type ZiweiFengshuiResult = {
  schemaVersion: typeof ZIWEI_FENGSHUI_PROMPT_VERSION;
  targetYear: number;
  generatedAt: string;
  summary: string;
  yearlyNotice: string;
  priorityPalaceNames: string[];
  palaces: ZiweiFengshuiPalaceResult[];
};

export type ZiweiFengshuiGenerationPayload = {
  summary: string;
  yearlyNotice: string;
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
  { key: 'study', label: '学习' },
  { key: 'relationship', label: '感情' },
  { key: 'health', label: '健康' },
  { key: 'home', label: '住宅' },
];

const FOCUS_PALACE_CANDIDATES: Record<Exclude<ZiweiFengshuiFocus, 'overall'>, string[]> = {
  wealth: ['财帛宫', '福德宫', '田宅宫'],
  career: ['官禄宫', '命宫', '迁移宫'],
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

function readPlacementAdvice(value: unknown, field: string): ZiweiFengshuiPlacementAdvice {
  if (!isRecord(value)) throw new Error(`${field}格式无效`);
  return {
    item: readString(value.item, `${field}.item`, 160),
    method: readString(value.method, `${field}.method`, 260),
    reason: readString(value.reason, `${field}.reason`, 300),
    avoidWhen: readStringList(value.avoidWhen, `${field}.avoidWhen`, { min: 1, max: 4, itemLength: 180 }),
  };
}

export function validateZiweiFengshuiGeneration(
  raw: unknown,
  expectedPalaces: Array<{ palaceName: string; branch: string }>,
  targetYear: number,
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
    const status = value.status;
    if (!ZIWEI_FENGSHUI_STATUSES.includes(status as ZiweiFengshuiStatus)) {
      throw new Error(`${palaceName}的状态无效`);
    }
    const chainsRaw = value.evidenceChains;
    if (!Array.isArray(chainsRaw) || chainsRaw.length < 1 || chainsRaw.length > 4) {
      throw new Error(`${palaceName}的象意链数量必须在1-4之间`);
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
      status: status as ZiweiFengshuiStatus,
      summary: readString(value.summary, `${palaceName}.summary`, 220),
      currentObjects: readStringList(value.currentObjects, `${palaceName}.currentObjects`, { min: 2, max: 6 }),
      natalEvidence: readStringList(value.natalEvidence, `${palaceName}.natalEvidence`, { min: 1, max: 5 }),
      yearlyEvidence: readStringList(value.yearlyEvidence, `${palaceName}.yearlyEvidence`, { min: 1, max: 5 }),
      optimizationSteps: readStringList(value.optimizationSteps, `${palaceName}.optimizationSteps`, { min: 1, max: 6 }),
      placementAdvice: readPlacementAdvice(value.placementAdvice, `${palaceName}.placementAdvice`),
      avoid: readStringList(value.avoid, `${palaceName}.avoid`, { min: 1, max: 4 }),
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
    targetYear,
    generatedAt,
    summary: readString(raw.summary, 'summary', 900),
    yearlyNotice: readString(raw.yearlyNotice, 'yearlyNotice', 600),
    priorityPalaceNames,
    palaces,
  };
}
