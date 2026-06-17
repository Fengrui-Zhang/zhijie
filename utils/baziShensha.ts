type PillarPosition = 'year' | 'month' | 'day' | 'hour' | 'fortune';

export type BaziShenShaContext = {
  yearStem: string;
  yearBranch: string;
  monthStem: string;
  monthBranch: string;
  dayStem: string;
  dayBranch: string;
  hourStem?: string;
  hourBranch?: string;
  sex?: number;
  kongZhi?: string[];
};

type TargetPillar = {
  stem?: string;
  branch: string;
  position?: PillarPosition;
};

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);

const offsetBranch = (branch: string, offset: number) => {
  const index = BRANCHES.indexOf(branch);
  if (index < 0) return '';
  return BRANCHES[(index + offset + 120) % 12];
};

const addUnique = (target: string[], value: string) => {
  if (value && !target.includes(value)) target.push(value);
};

const hasBranch = (map: Record<string, string | string[]>, key: string, branch: string) => {
  const value = map[key];
  return Array.isArray(value) ? value.includes(branch) : value === branch;
};

const inSanHe = (branch: string, groups: Record<string, string[]>) =>
  Object.entries(groups).find(([, branches]) => branches.includes(branch))?.[0] || '';

const TIAN_YI_CURRENT: Record<string, string[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  庚: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  辛: ['寅', '午'],
  壬: ['卯', '巳'],
  癸: ['卯', '巳'],
};

const TAI_JI: Record<string, string[]> = {
  甲: ['子', '午'],
  乙: ['子', '午'],
  丙: ['卯', '酉'],
  丁: ['卯', '酉'],
  戊: ['辰', '戌', '丑', '未'],
  己: ['辰', '戌', '丑', '未'],
  庚: ['寅', '亥'],
  辛: ['寅', '亥'],
  壬: ['巳', '申'],
  癸: ['巳', '申'],
};

const YANG_REN: Record<string, string> = {
  甲: '卯',
  乙: '寅',
  丙: '午',
  丁: '巳',
  戊: '午',
  己: '巳',
  庚: '酉',
  辛: '申',
  壬: '子',
  癸: '亥',
};

const WEN_CHANG: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
};

const LU_SHEN: Record<string, string> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子',
};

const XUE_TANG: Record<string, string> = {
  甲: '亥',
  乙: '午',
  丙: '寅',
  丁: '酉',
  戊: '寅',
  己: '酉',
  庚: '巳',
  辛: '子',
  壬: '申',
  癸: '卯',
};

const CI_GUAN: Record<string, string> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子',
};

const JIN_YU: Record<string, string> = {
  甲: '辰',
  乙: '巳',
  丙: '未',
  戊: '未',
  丁: '申',
  己: '申',
  庚: '戌',
  辛: '亥',
  壬: '丑',
  癸: '寅',
};

const GUO_YIN: Record<string, string> = {
  甲: '戌',
  乙: '亥',
  丙: '丑',
  丁: '寅',
  戊: '丑',
  己: '寅',
  庚: '辰',
  辛: '巳',
  壬: '未',
  癸: '申',
};

const FU_XING: Record<string, string> = {
  甲: '寅',
  乙: '丑',
  丙: '子',
  丁: '亥',
  戊: '申',
  己: '未',
  庚: '午',
  辛: '巳',
  壬: '辰',
  癸: '卯',
};

const HONG_YAN: Record<string, string> = {
  甲: '午',
  乙: '申',
  丙: '寅',
  丁: '未',
  戊: '辰',
  己: '辰',
  庚: '戌',
  辛: '酉',
  壬: '子',
  癸: '申',
};

const SAN_HE_GROUPS: Record<string, string[]> = {
  fire: ['寅', '午', '戌'],
  water: ['申', '子', '辰'],
  wood: ['亥', '卯', '未'],
  metal: ['巳', '酉', '丑'],
};

const SAN_HE_BRANCH_RULES = {
  yiMa: { fire: '申', water: '寅', wood: '巳', metal: '亥' },
  taoHua: { fire: '卯', water: '酉', wood: '子', metal: '午' },
  huaGai: { fire: '戌', water: '辰', wood: '未', metal: '丑' },
  jiangXing: { fire: '午', water: '子', wood: '卯', metal: '酉' },
  jieSha: { fire: '亥', water: '巳', wood: '申', metal: '寅' },
  wangShen: { fire: '巳', water: '亥', wood: '寅', metal: '申' },
  zaiSha: { fire: '子', water: '午', wood: '酉', metal: '卯' },
  poSui: { fire: '卯', water: '酉', wood: '子', metal: '午' },
  liuE: { fire: '酉', water: '卯', wood: '午', metal: '子' },
} as const;

const HONG_LUAN: Record<string, string> = {
  子: '卯',
  丑: '寅',
  寅: '丑',
  卯: '子',
  辰: '亥',
  巳: '戌',
  午: '酉',
  未: '申',
  申: '未',
  酉: '午',
  戌: '巳',
  亥: '辰',
};

const TIAN_XI: Record<string, string> = {
  子: '酉',
  丑: '申',
  寅: '未',
  卯: '午',
  辰: '巳',
  巳: '辰',
  午: '卯',
  未: '寅',
  申: '丑',
  酉: '子',
  戌: '亥',
  亥: '戌',
};

const ZI_YI: Record<string, string> = {
  戌: '巳',
  巳: '戌',
  辰: '亥',
  亥: '辰',
  寅: '未',
  未: '寅',
  卯: '申',
  申: '卯',
  午: '丑',
  丑: '午',
  子: '酉',
  酉: '子',
};

const GU_CHEN: Record<string, string> = {
  寅: '巳',
  卯: '巳',
  辰: '巳',
  巳: '申',
  午: '申',
  未: '申',
  申: '亥',
  酉: '亥',
  戌: '亥',
  亥: '寅',
  子: '寅',
  丑: '寅',
};

const GUA_SU: Record<string, string> = {
  寅: '丑',
  卯: '丑',
  辰: '丑',
  巳: '辰',
  午: '辰',
  未: '辰',
  申: '未',
  酉: '未',
  戌: '未',
  亥: '戌',
  子: '戌',
  丑: '戌',
};

const TIAN_YI_MEDICAL: Record<string, string> = {
  寅: '丑',
  卯: '寅',
  辰: '卯',
  巳: '辰',
  午: '巳',
  未: '午',
  申: '未',
  酉: '申',
  戌: '酉',
  亥: '戌',
  子: '亥',
  丑: '子',
};

const DIAO_KE: Record<string, string> = {
  子: '戌',
  丑: '亥',
  寅: '子',
  卯: '丑',
  辰: '寅',
  巳: '卯',
  午: '辰',
  未: '巳',
  申: '午',
  酉: '未',
  戌: '申',
  亥: '酉',
};

const SANG_MEN: Record<string, string> = {
  子: '寅',
  丑: '卯',
  寅: '辰',
  卯: '巳',
  辰: '午',
  巳: '未',
  午: '申',
  未: '酉',
  申: '戌',
  酉: '亥',
  戌: '子',
  亥: '丑',
};

const TIAN_DE: Record<string, string> = {
  寅: '丁',
  卯: '申',
  辰: '壬',
  巳: '辛',
  午: '亥',
  未: '甲',
  申: '癸',
  酉: '寅',
  戌: '丙',
  亥: '乙',
  子: '巳',
  丑: '庚',
};

const YUE_DE: Record<string, string> = {
  寅: '丙',
  午: '丙',
  戌: '丙',
  申: '壬',
  子: '壬',
  辰: '壬',
  亥: '甲',
  卯: '甲',
  未: '甲',
  巳: '庚',
  酉: '庚',
  丑: '庚',
};

const DE_XIU_STEMS: Record<string, string[]> = {
  fire: ['丙', '丁', '戊', '癸'],
  water: ['壬', '癸', '戊', '己', '丙', '辛', '甲'],
  wood: ['甲', '乙', '庚', '辛'],
  metal: ['庚', '辛', '乙'],
};

const TIAN_SHE_DAY: Record<string, string> = {
  spring: '戊寅',
  summer: '甲午',
  autumn: '戊申',
  winter: '甲子',
};

const seasonByMonthBranch = (branch: string) => {
  if (['寅', '卯', '辰'].includes(branch)) return 'spring';
  if (['巳', '午', '未'].includes(branch)) return 'summer';
  if (['申', '酉', '戌'].includes(branch)) return 'autumn';
  return 'winter';
};

const KUI_GANG = ['壬辰', '庚戌', '庚辰', '戊戌'];
const YIN_CHA_YANG_CUO = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
const SHI_E_DA_BAI = ['甲辰', '乙巳', '丙申', '丁亥', '戊戌', '己丑', '庚辰', '辛巳', '壬申', '癸亥'];
const GU_LUAN = ['乙巳', '丁巳', '辛亥', '戊申', '壬寅', '戊午', '壬子', '丙午'];
const SHUI_NI_DAY = ['丙子', '癸未', '癸丑'];

const RECOMPUTED_LABELS = new Set([
  '天乙贵人',
  '太极贵人',
  '文昌',
  '文昌贵人',
  '国印',
  '国印贵人',
  '学堂',
  '词馆',
  '金舆',
  '将星',
  '天医',
  '天赦',
  '禄神',
  '红鸾',
  '天喜',
  '福星',
  '福星贵人',
  '德秀贵人',
  '华盖',
  '羊刃',
  '劫煞',
  '灾煞',
  '亡神',
  '天罗',
  '地网',
  '孤辰',
  '寡宿',
  '元辰',
  '大耗',
  '空亡',
  '桃花',
  '咸池',
  '红艳煞',
  '十恶大败',
  '阴差阳错',
  '孤鸾煞',
  '魁罡',
  '勾煞',
  '绞煞',
  '勾绞煞',
  '丧门',
  '吊客',
  '白虎',
  '白虎煞',
  '官符',
  '官符煞',
  '病符',
  '病符煞',
  '死符',
  '死符煞',
  '破碎',
  '破碎煞',
  '六厄',
  '自缢煞',
  '水溺煞',
]);

const matchSanHeRule = (
  sourceBranch: string,
  targetBranch: string,
  rule: Record<string, string>,
) => {
  const group = inSanHe(sourceBranch, SAN_HE_GROUPS);
  return !!group && rule[group] === targetBranch;
};

export function calculateZhijieShenSha(
  context: BaziShenShaContext,
  target: TargetPillar,
): string[] {
  const names: string[] = [];
  const { branch, stem = '' } = target;
  const position = target.position || 'fortune';
  const ganZhi = stem ? `${stem}${branch}` : '';
  const allBranches = [context.yearBranch, context.monthBranch, context.dayBranch, context.hourBranch].filter(Boolean);
  const allStems = [context.yearStem, context.monthStem, context.dayStem, context.hourStem].filter(Boolean);
  const allChars = [...allBranches, ...allStems];

  if (hasBranch(TIAN_YI_CURRENT, context.dayStem, branch) || hasBranch(TIAN_YI_CURRENT, context.yearStem, branch)) addUnique(names, '天乙贵人');
  if (hasBranch(TAI_JI, context.dayStem, branch) || hasBranch(TAI_JI, context.yearStem, branch)) addUnique(names, '太极贵人');
  if (hasBranch(WEN_CHANG, context.dayStem, branch)) addUnique(names, '文昌');
  if (hasBranch(GUO_YIN, context.dayStem, branch)) addUnique(names, '国印贵人');
  if (hasBranch(XUE_TANG, context.dayStem, branch)) addUnique(names, '学堂');
  if (hasBranch(CI_GUAN, context.dayStem, branch)) addUnique(names, '词馆');
  if (hasBranch(JIN_YU, context.dayStem, branch)) addUnique(names, '金舆');
  if (hasBranch(TIAN_YI_MEDICAL, context.monthBranch, branch)) addUnique(names, '天医');
  if (hasBranch(LU_SHEN, context.dayStem, branch)) addUnique(names, '禄神');
  if (hasBranch(YANG_REN, context.dayStem, branch)) addUnique(names, '羊刃');
  if (hasBranch(FU_XING, context.dayStem, branch)) addUnique(names, '福星贵人');
  if (hasBranch(HONG_YAN, context.dayStem, branch)) addUnique(names, '红艳煞');

  if (matchSanHeRule(context.yearBranch, branch, SAN_HE_BRANCH_RULES.jiangXing) || matchSanHeRule(context.dayBranch, branch, SAN_HE_BRANCH_RULES.jiangXing)) addUnique(names, '将星');
  if (matchSanHeRule(context.yearBranch, branch, SAN_HE_BRANCH_RULES.huaGai) || matchSanHeRule(context.dayBranch, branch, SAN_HE_BRANCH_RULES.huaGai)) addUnique(names, '华盖');
  if (matchSanHeRule(context.yearBranch, branch, SAN_HE_BRANCH_RULES.yiMa) || matchSanHeRule(context.dayBranch, branch, SAN_HE_BRANCH_RULES.yiMa)) addUnique(names, '驿马');
  if (matchSanHeRule(context.yearBranch, branch, SAN_HE_BRANCH_RULES.taoHua) || matchSanHeRule(context.dayBranch, branch, SAN_HE_BRANCH_RULES.taoHua)) addUnique(names, '桃花');
  if (matchSanHeRule(context.yearBranch, branch, SAN_HE_BRANCH_RULES.jieSha) || matchSanHeRule(context.dayBranch, branch, SAN_HE_BRANCH_RULES.jieSha)) addUnique(names, '劫煞');
  if (matchSanHeRule(context.yearBranch, branch, SAN_HE_BRANCH_RULES.wangShen) || matchSanHeRule(context.dayBranch, branch, SAN_HE_BRANCH_RULES.wangShen)) addUnique(names, '亡神');
  if (matchSanHeRule(context.yearBranch, branch, SAN_HE_BRANCH_RULES.zaiSha) || matchSanHeRule(context.dayBranch, branch, SAN_HE_BRANCH_RULES.zaiSha)) addUnique(names, '灾煞');
  if (matchSanHeRule(context.yearBranch, branch, SAN_HE_BRANCH_RULES.poSui)) addUnique(names, '破碎煞');
  if (matchSanHeRule(context.yearBranch, branch, SAN_HE_BRANCH_RULES.liuE)) addUnique(names, '六厄');

  if (HONG_LUAN[context.yearBranch] === branch) addUnique(names, '红鸾');
  if (TIAN_XI[context.yearBranch] === branch) addUnique(names, '天喜');
  if (GU_CHEN[context.yearBranch] === branch) addUnique(names, '孤辰');
  if (GUA_SU[context.yearBranch] === branch) addUnique(names, '寡宿');
  if (SANG_MEN[context.yearBranch] === branch) addUnique(names, '丧门');
  if (DIAO_KE[context.yearBranch] === branch) addUnique(names, '吊客');
  if (offsetBranch(context.yearBranch, -4) === branch) addUnique(names, '白虎煞');
  if (offsetBranch(context.yearBranch, 5) === branch) addUnique(names, '官符煞');
  if (offsetBranch(context.yearBranch, -1) === branch) addUnique(names, '病符煞');
  if (offsetBranch(context.yearBranch, 5) === branch) addUnique(names, '死符煞');
  const yuanChenBranch = YANG_STEMS.has(context.yearStem)
    ? offsetBranch(context.yearBranch, 7)
    : offsetBranch(context.yearBranch, -5);
  if (yuanChenBranch === branch) {
    addUnique(names, '元辰');
    addUnique(names, '大耗');
  }
  if (ZI_YI[context.yearBranch] === branch) addUnique(names, '自缢煞');

  const yangYear = YANG_STEMS.has(context.yearStem);
  const isFemale = context.sex === 1;
  const normalGouJiao = (yangYear && !isFemale) || (!yangYear && isFemale);
  const gouBranch = normalGouJiao ? offsetBranch(context.yearBranch, 3) : offsetBranch(context.yearBranch, -3);
  const jiaoBranch = normalGouJiao ? offsetBranch(context.yearBranch, -3) : offsetBranch(context.yearBranch, 3);
  if (gouBranch === branch) addUnique(names, '勾煞');
  if (jiaoBranch === branch) addUnique(names, '绞煞');

  const tianDe = TIAN_DE[context.monthBranch];
  if (tianDe && (stem === tianDe || branch === tianDe)) addUnique(names, '天德贵人');
  const yueDe = YUE_DE[context.monthBranch];
  if (yueDe && stem === yueDe) addUnique(names, '月德贵人');

  const deXiuGroup = inSanHe(context.monthBranch, SAN_HE_GROUPS);
  if (deXiuGroup && stem && DE_XIU_STEMS[deXiuGroup]?.includes(stem)) addUnique(names, '德秀贵人');

  if (context.kongZhi?.includes(branch)) addUnique(names, '空亡');
  if (['戌', '亥'].includes(branch) && allBranches.includes(branch === '戌' ? '亥' : '戌')) addUnique(names, '天罗');
  if (['辰', '巳'].includes(branch) && allBranches.includes(branch === '辰' ? '巳' : '辰')) addUnique(names, '地网');

  if (position === 'day') {
    const season = seasonByMonthBranch(context.monthBranch);
    if (TIAN_SHE_DAY[season] === ganZhi) addUnique(names, '天赦');
    if (KUI_GANG.includes(ganZhi)) addUnique(names, '魁罡');
    if (SHI_E_DA_BAI.includes(ganZhi)) addUnique(names, '十恶大败');
    if (YIN_CHA_YANG_CUO.includes(ganZhi)) addUnique(names, '阴差阳错');
    if (SHUI_NI_DAY.includes(ganZhi) && allChars.some((value) => ['壬', '癸', '亥', '子'].includes(value))) addUnique(names, '水溺煞');
  }

  if ((position === 'day' || position === 'hour') && GU_LUAN.includes(ganZhi)) {
    addUnique(names, '孤鸾煞');
  }

  return names;
}

export function normalizeZhijieShenSha(
  existing: string[] | string | undefined,
  context: BaziShenShaContext,
  target: TargetPillar,
): string[] {
  const existingList = Array.isArray(existing)
    ? existing
    : String(existing || '').split(/[|、\s]+/).filter(Boolean);
  const retained = existingList.filter((item) => !RECOMPUTED_LABELS.has(item));
  return [...retained, ...calculateZhijieShenSha(context, target)].filter((item, index, list) => item && list.indexOf(item) === index);
}
