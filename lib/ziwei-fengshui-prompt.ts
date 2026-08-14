import {
  calculateZiweiDataWithAstrolabe,
  calculateZiweiHoroscopeDataWithAstrolabe,
  toZiweiJson,
} from 'taibu-core/ziwei';
import { toZiweiHoroscopeJson } from 'taibu-core/ziwei-horoscope';
import type { ZiweiResponse } from '../types';
import { getZiweiDirection, type ZiweiFengshuiPeriod } from './ziwei-fengshui';

type CanonicalStar = {
  星名: string;
  亮度?: string;
  四化?: string;
  离心自化?: string;
  向心自化?: string;
};

type CanonicalPalace = {
  宫位: string;
  宫位索引?: number;
  干支: string;
  是否身宫?: string;
  是否来因宫?: string;
  主星及四化?: CanonicalStar[];
  辅星?: CanonicalStar[];
  杂曜?: CanonicalStar[];
  神煞?: string[];
  大限?: string;
};

type CanonicalChart = {
  基本信息: Record<string, unknown>;
  十二宫位: CanonicalPalace[];
};

const MUTAGEN_NAMES = ['禄', '权', '科', '忌'] as const;

const STAR_REFERENCES: Record<string, string> = {
  紫微: '中心、统筹、身份；对应正式主位、管理文件、奖杯证书、高品质核心物品、大型家具',
  天机: '智慧、机械、变化、连接；对应植物、齿轮、工具、轮子、电脑周边、规划板和可移动家具',
  太阳: '光明、传播、动力；对应窗户、灯具、屏幕、钟表、通信与动力设备',
  武曲: '正财、执行、金属；对应钱币、账本、银行卡、保险柜、金属工具、秤与计算器',
  天同: '福气、舒适、儿童、新人、饮食；对应娃娃、柔软织物、杯具、甜食、休闲座椅与饮水物件',
  廉贞: '规则、欲望、电子、火热；对应电子设备、法律文件、红色点缀、表演用品与化妆品',
  天府: '库藏、稳定、承载；对应柜子、保险柜、存钱罐、陶瓷土器、粮食储备与档案柜',
  太阴: '田宅、柔和、隐性财富、夜晚；对应床、镜子、柔光、银白物品、窗帘与房产文件',
  贪狼: '社交、才艺、欲望、偏财、生命力；对应植物、木材、花卉、艺术品、乐器、香氛与创作用品',
  巨门: '门户、口舌、暗处、沟渠；对应门、麦克风、音响、电话、讲台、排水与语言学习用品',
  天相: '秩序、服务、形象、印绶；对应证件、印章、工牌、制服、正式衣物、餐具与接待陈设',
  天梁: '保护、长者、梁柱；对应雨伞、保护罩、高大植物、药柜、保险与规章文件',
  七杀: '决断、风险、重型；对应重型工具、机械、训练设备、防护装备与金属结构',
  破军: '破旧立新、消耗、仓储；对应维修工具、改造材料、货柜、仓储箱、海运物件与更新用品',
  文昌: '文字、秩序、考试；对应书籍、纸张、文具、档案与文字设备',
  文曲: '艺术、声音、曲线；对应乐器、音频设备、绘画、装饰与创作工具',
  左辅: '公开稳定的协助；对应左侧辅助台、支架、书架、协作板与成套工具',
  右弼: '柔性隐性协助；对应右侧辅助台、柔性收纳、联系人清单与备用工具',
  天魁: '显性贵人与机会；对应导师资料、正式邀请、荣誉证书与公开联络渠道',
  天钺: '隐性贵人与机缘；对应推荐信、私密联系人、备用方案与柔和夜灯',
  禄存: '稳定资源与积累；对应储物柜、保险柜、储蓄记录、粮食与库存',
  天马: '移动、交通、变化；对应鞋、行李、车钥匙、轮子、旅行箱与交通卡',
  擎羊: '切割、尖锐、竞争；对应刀剪、针、尖角、凸出金属与手术器具',
  陀罗: '缠绕、延迟、旋转；对应绳线、线圈、螺旋、锈件与反复维修件',
  火星: '爆发、急速、热；对应炉灶、加热器、电池、强光与红色动力物件',
  铃星: '声响、警报、隐性急变；对应门铃、警报器、音响、蜂鸣器与隐蔽电线',
  地空: '空无、抽象、虚拟；对应空盒、留白空间、虚拟资料与镂空物',
  地劫: '损耗、突失、截流；对应裂口、破袋、漏水容器、耗材与账务缺口',
};

const SYSTEM_PROMPT = `你是一位负责“紫微风水命盘映射”的专业分析 AI。你必须严格使用给定的确定性排盘数据，不自行排盘，不把宫名当作固定方向。你的任务有两部分：第一，根据宫位落支、星曜、四化、对宫与三方四正，预测命主居住环境各方位容易出现的具体物品及其状态；第二，为每个宫位选择可承接吉星与有利四化的类象物品，给出提升该宫人事主题的催旺摆放方案。

【方法口径】
1. 现实方向只由该命盘中宫位所落地支决定；方向与角度已经由程序计算，禁止改写。
2. 只解释上下文实际包含的时间层：本命只读本命，大运只叠加所选大运，流年才叠加大运与所选流年；各层不得混写。主星表示功能，辅煞与四化表示该功能如何被帮助、放大、阻塞或破坏。
3. 先看宫内主星，再看辅煞、四化、对宫和三方四正。不得“见煞即凶”或“见禄必吉”。
4. 每宫直接预测 2–6 项物象。每项分开写“物品”“状态”“依据”：物品必须具体；状态描述大小、材质、颜色、新旧、启闭、动静、明暗、高低或使用形态，不输出空间管理类评价。
5. 十二宫物象必须有区分度。优先使用星曜稳定象意，并用禄、权、科、忌及辅煞决定物品的数量、强度、形态与状态。
6. 催旺不是整理方案。每宫以该宫的人事主题为目标，从宫内或三方四正选择一颗实际存在且有助力的星曜，给出 1–3 件对应类象物品，明确材质、颜色、数量和该方位内的摆法。
7. 数量若使用十干取数，必须写清“哪一层天干→哪颗星化禄/权/科→天干序数→数量”；没有完整引动链时，使用现实合理的 1–3 件，不得伪造幸运数字。四化口诀采用：甲廉破武阳、乙机梁紫阴、丙同机昌廉、丁阴同机巨、戊贪阴右机、己武贪梁曲、庚阳武阴同、辛巨阳曲昌、壬梁紫左武、癸破巨阴贪。
8. 预测现有物象与建议新增物品必须明确分开。不得因为预测到某件物品，就自动把它当成催旺物；催旺物必须有独立的吉星与四化依据。
9. 不得建议明火、刀具展示、大型水景、强电改造、结构拆改或昂贵法器。煞星物象可用于预测，但催旺物优先取吉星、禄权科与安全的现实功能物品。
10. 每宫至少写两条完整象意链：一条“宫位→地支方向→星曜→四化/辅煞→预测物品与状态”，一条“改善目标→宫位→助力星曜→有利四化/三方→催旺物→摆放方法”。
11. 不输出数字评分。

【目标与主宫】
- 财运：财帛宫为主，参考福德、田宅、官禄。
- 事业：官禄宫为主，参考命宫、财帛、迁移。
- 人际与交友：交友宫或仆役宫为主，参考兄弟、官禄。
- 学习考试：命宫或官禄为主，参考父母宫及昌曲所在宫。
- 感情：夫妻宫为主，参考子女、福德、田宅。
- 住宅与资产：田宅宫为主；健康主题以疾厄宫为主。

【催旺取象示例】
- 财帛宫见武曲、天府且获得有利四化，可用真实钱币、存钱罐、保险柜或账本承接“武曲之财、天府之库”；具体材质、颜色和数量仍须服从该盘落支五行、宫干与四化。
- 官禄宫见紫微、太阳、天相、昌曲、魁钺等助力，可从正式工牌、证书、工作成果展示、灯具或文书工具中选择最贴合该盘的一项。
- 交友或仆役宫见辅弼、魁钺、天相、贪狼等助力，可从联系人册、团队合影、协作板、成套辅助工具或社交才艺物件中选择，不得脱离实际星曜套模板。

【物象倾向枚举】
只能使用：吉象鲜明、中性成象、动象突出、煞忌成象。它描述星曜组合在物象上的主导性质，不评价空间是否整洁。

【输出】
只返回一个 JSON 对象，不要 Markdown，不要代码围栏，不要解释 JSON 之外的内容。`;

const normalizePalaceName = (value: string) => value.endsWith('宫') ? value : `${value}宫`;

const formatShanghaiDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const read = (type: string) => parts.find((item) => item.type === type)?.value || '';
  return `${read('year')}-${read('month')}-${read('day')}`;
};

const getTargetDate = (targetYear: number) => {
  const now = new Date();
  const currentYear = Number(formatShanghaiDate(now).slice(0, 4));
  return targetYear === currentYear ? formatShanghaiDate(now) : `${targetYear}-07-01`;
};

const getStars = (palace: CanonicalPalace) => [
  ...(palace.主星及四化 || []),
  ...(palace.辅星 || []),
  ...(palace.杂曜 || []),
];

export type ZiweiFengshuiChartContext = {
  period: ZiweiFengshuiPeriod;
  targetDate: string | null;
  basic: Record<string, unknown>;
  timing: {
    decadal: Record<string, unknown> | null;
    yearly: Record<string, unknown> | null;
    transitStars: Array<{ starName: string; palaceName: string }>;
    yearlyMutagens: Array<{ mutagen: string; starName: string; natalPalaceName: string | null }>;
    decadalMutagens: Array<{ mutagen: string; starName: string; natalPalaceName: string | null }>;
  };
  palaces: Array<{
    palaceName: string;
    palaceIndex: number;
    stem: string;
    branch: string;
    direction: ReturnType<typeof getZiweiDirection>;
    isBodyPalace: boolean;
    isOriginalPalace: boolean;
    decadalRange: string;
    oppositePalace: string;
    trinePalaces: string[];
    stars: CanonicalStar[];
    shensha: string[];
    timingSignals: string[];
  }>;
  relevantStarReferences: Record<string, string>;
};

export function buildZiweiFengshuiChartContext(chartData: ZiweiResponse, period: ZiweiFengshuiPeriod): ZiweiFengshuiChartContext {
  if (!chartData?.calcInput) {
    throw new Error('该命例缺少可重算的出生参数，请编辑命例并重新排盘后再生成紫微风水分析。');
  }
  const { output, astrolabe } = calculateZiweiDataWithAstrolabe(chartData.calcInput as any);
  const canonical = toZiweiJson(output, { detailLevel: 'full' }) as CanonicalChart;
  if (!Array.isArray(canonical?.十二宫位) || canonical.十二宫位.length !== 12) {
    throw new Error('紫微排盘数据未包含完整十二宫');
  }

  const targetDate = period.targetYear === null ? null : getTargetDate(period.targetYear);
  const horoscope = targetDate ? calculateZiweiHoroscopeDataWithAstrolabe(astrolabe, { targetDate }) : null;
  const horoscopeJson = horoscope ? toZiweiHoroscopeJson(horoscope, { detailLevel: 'full' }) as any : null;
  const transitStars = period.layer === 'yearly' ? (horoscope?.transitStars || []).map((item) => ({
    starName: item.starName,
    palaceName: normalizePalaceName(item.palaceName),
  })) : [];
  const yearlyMutagens = period.layer === 'yearly' ? MUTAGEN_NAMES.map((mutagen, index) => {
    const starName = horoscope?.yearly.mutagen[index] || '';
    const natalPalace = canonical.十二宫位.find((palace) => getStars(palace).some((star) => star.星名 === starName));
    return starName ? { mutagen, starName, natalPalaceName: natalPalace?.宫位 || null } : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)) : [];
  const decadalMutagens = period.layer !== 'natal' ? MUTAGEN_NAMES.map((mutagen, index) => {
    const starName = horoscope?.decadal.mutagen[index] || '';
    const natalPalace = canonical.十二宫位.find((palace) => getStars(palace).some((star) => star.星名 === starName));
    return starName ? { mutagen, starName, natalPalaceName: natalPalace?.宫位 || null } : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)) : [];

  const palaceByIndex = new Map(canonical.十二宫位.map((palace, fallbackIndex) => [palace.宫位索引 ?? fallbackIndex, palace]));
  const palaces = canonical.十二宫位.map((palace, fallbackIndex) => {
    const palaceIndex = palace.宫位索引 ?? fallbackIndex;
    const branch = palace.干支.slice(-1);
    const timingSignals = [
      ...decadalMutagens
        .filter((item) => item.natalPalaceName === palace.宫位)
        .map((item) => `${period.label}：${item.starName}化${item.mutagen}`),
      ...yearlyMutagens
        .filter((item) => item.natalPalaceName === palace.宫位)
        .map((item) => `${period.targetYear}年${item.starName}化${item.mutagen}`),
      ...transitStars
        .filter((item) => item.palaceName === palace.宫位)
        .map((item) => `${period.targetYear}年${item.starName}入宫`),
      ...(period.layer === 'decadal' && period.palaceName === palace.宫位
        ? [`${period.label}叠入本命${palace.宫位}`]
        : []),
      ...(period.layer === 'yearly' && normalizePalaceName(horoscope?.yearly.palaceNames[0] || '') === palace.宫位
        ? [`${period.targetYear}年流年命宫叠入本命${palace.宫位}`]
        : []),
    ];
    return {
      palaceName: palace.宫位,
      palaceIndex,
      stem: palace.干支.charAt(0),
      branch,
      direction: getZiweiDirection(branch),
      isBodyPalace: palace.是否身宫 === '是',
      isOriginalPalace: palace.是否来因宫 === '是',
      decadalRange: palace.大限 || '',
      oppositePalace: palaceByIndex.get((palaceIndex + 6) % 12)?.宫位 || '',
      trinePalaces: [4, 8]
        .map((offset) => palaceByIndex.get((palaceIndex + offset) % 12)?.宫位 || '')
        .filter(Boolean),
      stars: getStars(palace),
      shensha: palace.神煞 || [],
      timingSignals,
    };
  });

  const relevantNames = new Set(palaces.flatMap((palace) => palace.stars.map((star) => star.星名)));
  const relevantStarReferences = Object.fromEntries(
    Object.entries(STAR_REFERENCES).filter(([name]) => relevantNames.has(name)),
  );

  return {
    period,
    targetDate,
    basic: canonical.基本信息,
    timing: {
      decadal: horoscope ? {
        干支: `${horoscope.decadal.heavenlyStem}${horoscope.decadal.earthlyBranch}`,
        落宫: normalizePalaceName(horoscope.decadal.palaceNames[0] || ''),
        年龄范围: typeof horoscope.decadal.startAge === 'number' ? `${horoscope.decadal.startAge}-${horoscope.decadal.endAge}岁` : '',
        四化: horoscope.decadal.mutagen.map((star, index) => `${star}[化${MUTAGEN_NAMES[index]}]`),
      } : null,
      yearly: period.layer === 'yearly' && horoscope ? (horoscopeJson?.运限叠宫?.find((item: any) => item.层次 === '流年') || {
        干支: `${horoscope.yearly.heavenlyStem}${horoscope.yearly.earthlyBranch}`,
        落入本命宫位: normalizePalaceName(horoscope.yearly.palaceNames[0] || ''),
      }) : null,
      transitStars,
      yearlyMutagens,
      decadalMutagens,
    },
    palaces,
    relevantStarReferences,
  };
}

export function buildZiweiFengshuiPrompt(context: ZiweiFengshuiChartContext) {
  const expectedPalaces = context.palaces.map((palace) => palace.palaceName);
  const examplePalace = {
    palaceName: expectedPalaces[0] || '命宫',
    tendency: '中性成象',
    summary: '一句话概括该方位由哪些星曜主导，以及最鲜明的物象类型。',
    predictedObjects: [
      { item: '该方位容易出现的具体物品', state: '该物品的材质、颜色、大小、新旧、启闭、动静或摆放形态', basis: '宫位、落支、星曜与四化如何共同指向该物象' },
      { item: '另一件有区分度的具体物品', state: '与星曜组合相符的具体状态', basis: '对应星曜及辅煞依据' },
    ],
    natalEvidence: ['本命层证据，至少一项。'],
    timingEvidence: context.period.layer === 'natal' ? [] : [`${context.period.label}的时间层证据。`],
    enhancementAdvice: {
      goal: '该宫位对应的改善目标，例如财运、事业、交友或感情',
      supportingStar: '用于催旺的实际助力星曜及有利四化',
      items: [{ item: '建议新增的具体类象物品', material: '材质', color: '颜色', quantity: '数量及取数依据', symbolism: '该物品承接哪颗星的什么正向类象' }],
      placement: '在该宫现实方位内的具体摆放位置、朝向和使用方式。',
      activationLogic: '改善目标→宫位→助力星曜→有利四化/三方→催旺物→摆法。',
      expectedEffect: '该布置重点强化的宫位功能与正向运势主题。',
    },
    contraindications: ['与该宫星曜组合冲突、会过度引动煞忌或存在安全风险的物品。'],
    evidenceChains: [{
      chain: '宫位→地支方向→星曜→四化/辅煞→预测物品与状态',
      grade: '稳定传统',
    }, {
      chain: '改善目标→宫位→助力星曜→有利四化/三方→催旺物→摆放方法',
      grade: '稳定传统',
    }],
  };
  const taskLabel = context.period.layer === 'natal'
    ? '原命局紫微风水全盘物象预测与催旺结果，只分析稳定的本命底色，不加入任何大运或流年信息'
    : context.period.layer === 'decadal'
      ? `${context.period.label}的紫微风水全盘物象预测与催旺结果，只把该大运叠加在本命上，不加入流年信息`
      : `${context.period.label}的紫微风水全盘物象预测与催旺结果，将本命、当前大运和该流年分层分析`;
  const userPrompt = [
    '【确定性紫微命盘与时间层上下文】',
    JSON.stringify(context),
    '',
    '【任务】',
    `请生成${taskLabel}。必须覆盖以下十二个唯一宫位，顺序与列表一致：${expectedPalaces.join('、')}。`,
    'priorityPalaceNames 选择盘中最适合优先催旺的1-3宫；它们用于“全盘”主题高亮。',
    `每宫都必须给出物象倾向、具体物品预测、本命依据、${context.period.layer === 'natal' ? '空的 timingEvidence 数组' : '对应时间层依据'}、催旺方案、禁忌搭配和两类推断链。`,
    '方向、角度和地支由程序在模型返回后补入，你只需准确使用上下文，不要在 JSON 中另造方向数据。',
    '',
    '【严格JSON形状】',
    JSON.stringify({
      summary: '全盘命盘提示摘要',
      periodNotice: `${context.period.label}的层级说明与全盘变化摘要`,
      priorityPalaceNames: expectedPalaces.slice(0, 3),
      palaces: [examplePalace],
    }),
    '上面的 palaces 只展示单项字段模板；正式返回时必须重复该对象结构并填写全部十二宫，不得在数组中放说明文字。',
  ].join('\n');
  return {
    system: SYSTEM_PROMPT,
    user: userPrompt,
  };
}
