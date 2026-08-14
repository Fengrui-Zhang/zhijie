import {
  calculateZiweiDataWithAstrolabe,
  calculateZiweiHoroscopeDataWithAstrolabe,
  toZiweiJson,
} from 'taibu-core/ziwei';
import { toZiweiHoroscopeJson } from 'taibu-core/ziwei-horoscope';
import type { ZiweiResponse } from '../types';
import { getZiweiDirection } from './ziwei-fengshui';

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
  紫微: '中心、统筹、身份；检查主位、管理文件和核心物品是否失序或损坏',
  天机: '智慧、机械、变化、连接；检查枯死植物、卡死机构、缠绕线路和失灵小电器',
  太阳: '光明、传播、动力；检查照明、窗面、过热电器和电源状态',
  武曲: '正财、执行、金属；检查账目票据、锁具、工具、锈蚀和尖锐边缘',
  天同: '舒适、儿童、新人、饮食；检查积水、变质食物、脏杯具和过量囤积',
  廉贞: '规则、电子、火热；检查坏电器、过热、暴露线路、过期化妆品与刺激性堆积',
  天府: '库藏、稳定、承载；检查柜体、库存、霉变、过期和收纳失控',
  太阴: '田宅、洁净、夜晚；检查卧室、寝具、镜面、漏水、潮湿和夜间照明',
  贪狼: '社交、才艺、欲望、生命力；检查植物、木材、酒器、香味和娱乐物是否过量',
  巨门: '门户、口舌、暗处、沟渠；检查门锁异响、排水堵塞、暗角、异味和噪声',
  天相: '秩序、服务、形象；检查证件、印章、衣物、接待区和成对物品的平衡',
  天梁: '保护、长者、梁柱；检查屋顶梁柱、药箱、保护设备和高植株；结构问题交给专业人员',
  七杀: '决断、风险、重型；检查裸露刀刃、失控机械、尖角、噪声和防护缺失',
  破军: '破旧立新、消耗、仓储；检查垃圾、坏物、空箱、漏水容器和烂尾维修',
  文昌: '文字、秩序、考试；检查书纸档案、文字设备和管线是否杂乱',
  文曲: '艺术、声音、曲线；检查乐器音响、噪声、线材缠绕和烂尾作品',
  左辅: '公开稳定的协助；检查左侧支撑、书架、工具和协作板',
  右弼: '柔性隐性协助；检查右侧收纳、备用品和联系人资料',
  天魁: '显性贵人与机会；检查导师资料、证书和公开求助渠道',
  天钺: '隐性贵人与机缘；检查推荐信、私密联系人、备用方案和夜间暗角',
  禄存: '稳定积累；检查储物柜、储蓄记录、库存和过期囤积',
  天马: '移动、交通、变化；检查鞋、行李、车钥匙、轮子和通道',
  擎羊: '显性切割和尖锐；优先收纳刀剪、包角并处理外露金属',
  陀罗: '缠绕、拖延、堵塞；优先解缠、除锈、疏通和完成维修',
  火星: '爆发、热与明火；优先检查过热、易燃堆积、电池鼓包和消防风险',
  铃星: '警报、声响和隐蔽电气刺激；优先处理异响、误报、隐藏线路和夜间噪声',
  地空: '落空、断层；检查无意义空盒、缺失功能和数字资料备份',
  地劫: '损耗、泄漏；检查裂口、漏水容器、资源浪费和异常支出',
};

const SYSTEM_PROMPT = `你是一位负责“紫微风水命盘映射”的专业分析 AI。你必须严格使用给定的确定性排盘数据，不自行排盘，不把宫名当作固定方向。你的任务是根据宫位落支、主辅星、煞曜、四化、对宫与三方四正，推演每个现实方位当前最鲜明的物品、陈设和空间状态，再给出对应的整理、摆放与优化方案。

【方法口径】
1. 现实方向只由该命盘中宫位所落地支决定；方向与角度已经由程序计算，禁止改写。
2. 本命、大限、流年必须分层解释。主星表示功能，辅煞与四化表示该功能如何被帮助、放大、阻塞或破坏。
3. 先看宫内主星，再看辅煞、四化、对宫和三方四正。不得“见煞即凶”或“见禄必吉”。
4. 每宫必须直接给出 2–6 项当前物象，包括具体物品、陈设、材质、整洁度、光线、通道、潮湿、噪声或损坏状态。直接陈述推演结果，不要反复使用“可能、也许、待检查”等弱化措辞。
5. 十二宫物象必须有区分度，不能全部套用“杂乱、损坏、过期”等通用词。优先使用星曜象意表中的具体对应，并结合四化、辅煞改变其状态。
6. 优化遵循先减后加：先处理安全、损坏、故障、堵漏、枯死、过期、脏乱和闲置；每宫再给恰好一项少量、可逆、低风险的摆放方案，可以是调整已有物品，也可以是新增一件简单功能性物品。
7. 不得建议明火、刀具展示、大型水景、强电改造、结构拆改、昂贵法器或为了凑数字大量购买物品。涉及承重、燃气、强电、管道和消防时，只能建议请合格人员处理。
8. 每宫至少写一条完整推断链：“宫位→地支方向→星曜→四化/辅煞→当前物象→优化建议”，并标注为“稳定传统”“视频明示”或“扩展取象”。
9. 不输出数字评分，不承诺必然效果。

【状态枚举】
只能使用：协调顺畅、基本平稳、杂乱受阻、重点调整。

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
  targetYear: number;
  targetDate: string;
  basic: Record<string, unknown>;
  annual: {
    decadal: Record<string, unknown>;
    yearly: Record<string, unknown>;
    transitStars: Array<{ starName: string; palaceName: string }>;
    yearlyMutagens: Array<{ mutagen: string; starName: string; natalPalaceName: string | null }>;
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
    annualSignals: string[];
  }>;
  relevantStarReferences: Record<string, string>;
};

export function buildZiweiFengshuiChartContext(chartData: ZiweiResponse, targetYear: number): ZiweiFengshuiChartContext {
  if (!chartData?.calcInput) {
    throw new Error('该命例缺少可重算的出生参数，请编辑命例并重新排盘后再生成紫微风水分析。');
  }
  const { output, astrolabe } = calculateZiweiDataWithAstrolabe(chartData.calcInput as any);
  const canonical = toZiweiJson(output, { detailLevel: 'full' }) as CanonicalChart;
  if (!Array.isArray(canonical?.十二宫位) || canonical.十二宫位.length !== 12) {
    throw new Error('紫微排盘数据未包含完整十二宫');
  }

  const targetDate = getTargetDate(targetYear);
  const horoscope = calculateZiweiHoroscopeDataWithAstrolabe(astrolabe, { targetDate });
  const horoscopeJson = toZiweiHoroscopeJson(horoscope, { detailLevel: 'full' }) as any;
  const transitStars = (horoscope.transitStars || []).map((item) => ({
    starName: item.starName,
    palaceName: normalizePalaceName(item.palaceName),
  }));
  const yearlyMutagens = MUTAGEN_NAMES.map((mutagen, index) => {
    const starName = horoscope.yearly.mutagen[index] || '';
    const natalPalace = canonical.十二宫位.find((palace) => getStars(palace).some((star) => star.星名 === starName));
    return starName ? { mutagen, starName, natalPalaceName: natalPalace?.宫位 || null } : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const palaceByIndex = new Map(canonical.十二宫位.map((palace, fallbackIndex) => [palace.宫位索引 ?? fallbackIndex, palace]));
  const palaces = canonical.十二宫位.map((palace, fallbackIndex) => {
    const palaceIndex = palace.宫位索引 ?? fallbackIndex;
    const branch = palace.干支.slice(-1);
    const starNames = new Set(getStars(palace).map((star) => star.星名));
    const annualSignals = [
      ...yearlyMutagens
        .filter((item) => item.natalPalaceName === palace.宫位)
        .map((item) => `${targetYear}年${item.starName}化${item.mutagen}`),
      ...transitStars
        .filter((item) => item.palaceName === palace.宫位)
        .map((item) => `${targetYear}年${item.starName}入宫`),
      ...(normalizePalaceName(horoscope.yearly.palaceNames[0] || '') === palace.宫位
        ? [`${targetYear}年流年命宫叠入本命${palace.宫位}`]
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
      annualSignals,
      _starNames: starNames,
    };
  }).map(({ _starNames: _ignored, ...palace }) => palace);

  const relevantNames = new Set(palaces.flatMap((palace) => palace.stars.map((star) => star.星名)));
  const relevantStarReferences = Object.fromEntries(
    Object.entries(STAR_REFERENCES).filter(([name]) => relevantNames.has(name)),
  );

  return {
    targetYear,
    targetDate,
    basic: canonical.基本信息,
    annual: {
      decadal: {
        干支: `${horoscope.decadal.heavenlyStem}${horoscope.decadal.earthlyBranch}`,
        落宫: normalizePalaceName(horoscope.decadal.palaceNames[0] || ''),
        年龄范围: typeof horoscope.decadal.startAge === 'number' ? `${horoscope.decadal.startAge}-${horoscope.decadal.endAge}岁` : '',
        四化: horoscope.decadal.mutagen.map((star, index) => `${star}[化${MUTAGEN_NAMES[index]}]`),
      },
      yearly: horoscopeJson.运限叠宫?.find((item: any) => item.层次 === '流年') || {
        干支: `${horoscope.yearly.heavenlyStem}${horoscope.yearly.earthlyBranch}`,
        落入本命宫位: normalizePalaceName(horoscope.yearly.palaceNames[0] || ''),
      },
      transitStars,
      yearlyMutagens,
    },
    palaces,
    relevantStarReferences,
  };
}

export function buildZiweiFengshuiPrompt(context: ZiweiFengshuiChartContext) {
  const expectedPalaces = context.palaces.map((palace) => palace.palaceName);
  const examplePalace = {
    palaceName: expectedPalaces[0] || '命宫',
    status: '基本平稳',
    summary: '一句话概括该方位当前的空间状态与主要物象。',
    currentObjects: ['该方位当前存在的具体物品或陈设。', '该物品呈现的状态、材质、光线或使用情况。'],
    natalEvidence: ['本命层证据，至少一项。'],
    yearlyEvidence: [`${context.targetYear}年流年层证据；若无直接流曜，也要明确写“本年无直接流曜叠入，以本命物象为主”。`],
    optimizationSteps: ['针对现有物象优先进行的整理、移动、维修或清除。'],
    placementAdvice: {
      item: '建议摆放或重新安排的一件简单物品',
      method: '摆在该方位的具体位置、数量、朝向或使用方式。',
      reason: '结合星曜、四化与现实功能说明理由。',
      avoidWhen: ['不宜采用此方案的具体空间或安全条件。'],
    },
    avoid: ['该方位不宜摆放或不宜自行操作的事项。'],
    evidenceChains: [{
      chain: '宫位→地支方向→星曜→四化/辅煞→当前物象→优化建议',
      grade: '稳定传统',
    }],
  };
  const userPrompt = [
    '【确定性紫微命盘与流年上下文】',
    JSON.stringify(context),
    '',
    '【任务】',
    `请生成${context.targetYear}年的紫微风水全盘物象与优化结果。必须覆盖以下十二个唯一宫位，顺序与列表一致：${expectedPalaces.join('、')}。`,
    'priorityPalaceNames 选择最值得优先优化的1-3宫；它们用于“全盘”主题高亮。',
    '每宫都必须给出当前物象、本命依据、流年依据、优化步骤、恰好一项摆放方案、避免事项和推断链。',
    '方向、角度和地支由程序在模型返回后补入，你只需准确使用上下文，不要在 JSON 中另造方向数据。',
    '',
    '【严格JSON形状】',
    JSON.stringify({
      summary: '全盘命盘提示摘要',
      yearlyNotice: `${context.targetYear}年变化及本命/流年分层说明`,
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
