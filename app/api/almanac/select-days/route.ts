import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { DEEPSEEK_FLASH_MODEL } from '../../../../lib/analysis-models';
import { auth } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { calculateTaibuChart } from '../../../../lib/taibu-chart';
import { ModelType } from '../../../../types';

type CandidateDay = {
  date: string;
  ganZhi: string;
  dayStem: string;
  dayBranch: string;
  lunarDate: string;
  suitable: string[];
  avoid: string[];
  jishen: string[];
  xiongsha: string[];
  chongSha: string;
  kongWang: string;
  tianShen: string;
  tianShenType: string;
  tianShenLuck: string;
  lunarMansion: string;
  lunarMansionLuck: string;
  directions: Record<string, unknown>;
  hourlyFortune: Array<{
    ganZhi: string;
    tianShen: string;
    tianShenType: string;
    tianShenLuck: string;
    chong: string;
    sha: string;
    suitable: string[];
    avoid: string[];
  }>;
  score: number;
};

type SelectionResult = {
  summary: string;
  selected: Array<{
    date: string;
    label: string;
    score: number;
    reasons: string[];
    cautions: string[];
    recommendedHours?: Array<{
      ganZhi: string;
      label: string;
      reason: string;
      caution?: string;
    }>;
    suitable?: string[];
    avoid?: string[];
  }>;
  notes?: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 60;

const toDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+08:00`);
  return Number.isFinite(date.getTime()) ? date : null;
};

const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const textIncludesAny = (list: string[], targets: string[]) =>
  list.some((item) => targets.some((target) => item.includes(target)));

const inferMatterKeywords = (matter: string) => {
  const source = matter.trim();
  if (!source) return [];
  const pairs: Array<[RegExp, string[]]> = [
    [/婚|嫁|订婚|领证|合婚|结婚/, ['嫁娶', '纳采', '订盟']],
    [/开业|开张|营业|签约|合同|交易|合作|立券/, ['开市', '交易', '立券', '纳财']],
    [/搬家|乔迁|入宅|移徙|安床/, ['入宅', '移徙', '安床']],
    [/装修|动土|修造|破土|开工/, ['修造', '动土']],
    [/出行|旅行|搬迁|赴任/, ['出行', '赴任']],
    [/祭祀|祈福|求嗣|还愿/, ['祭祀', '祈福', '求嗣']],
    [/安葬|入殓|启钻|除服|成服/, ['安葬', '入殓', '启钻', '除服', '成服']],
    [/求财|投资|纳财|收款|置业/, ['纳财', '交易', '立券']],
  ];
  return pairs.flatMap(([pattern, keywords]) => pattern.test(source) ? keywords : []);
};

const scoreCandidate = (candidate: Omit<CandidateDay, 'score'>, matter: string) => {
  const keywords = inferMatterKeywords(matter);
  let score = 50;
  if (candidate.tianShenType === '黄道') score += 14;
  if (candidate.tianShenLuck === '吉') score += 8;
  if (candidate.lunarMansionLuck === '吉') score += 6;
  score += Math.min(12, candidate.jishen.length * 2);
  score -= Math.min(12, candidate.xiongsha.length * 2);
  if (keywords.length > 0) {
    if (textIncludesAny(candidate.suitable, keywords)) score += 18;
    if (textIncludesAny(candidate.avoid, keywords)) score -= 24;
  }
  if (candidate.avoid.includes('诸事不宜')) score -= 30;
  if (candidate.suitable.includes('无')) score -= 10;
  return Math.max(0, Math.min(100, score));
};

const SOFT_CAUTION_MAP: Array<[RegExp, string]> = [
  [/凶神|游祸|天刑|黑道|白虎|朱雀|玄武|勾陈/, '当天仍有小干扰，重要流程按计划推进即可。'],
  [/五虚|虚耗|五离/, '精力、预算和沟通要留有余量。'],
  [/破财|耗财|劫财/, '涉及费用和合同金额时多核对一遍。'],
  [/欺诈|被骗|骗局/, '合作对象和关键信息建议提前确认。'],
  [/口舌|争|讼|纠纷/, '沟通时尽量说清边界，避免临时争执。'],
  [/冲|煞/, '可避开冲突方位，时间安排不要太赶。'],
  [/病|伤|灾/, '当天注意安全和身体状态，节奏稳一点。'],
];

const softenCaution = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  const matched = SOFT_CAUTION_MAP.find(([pattern]) => pattern.test(text));
  if (matched) return matched[1];
  return text
    .replace(/[凶煞]/g, '小阻力')
    .replace(/大忌/g, '不太建议')
    .replace(/危险/g, '需要谨慎')
    .replace(/灾/g, '波动')
    .slice(0, 42);
};

const normalizeCautions = (value: unknown) => {
  const normalized = asList(value).map(softenCaution).filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, 3);
};

const scoreHour = (
  hour: CandidateDay['hourlyFortune'][number],
  matter: string,
) => {
  const keywords = inferMatterKeywords(matter);
  let score = 45;
  if (hour.tianShenType === '黄道') score += 20;
  if (hour.tianShenLuck === '吉') score += 12;
  if (keywords.length > 0) {
    if (textIncludesAny(hour.suitable, keywords)) score += 18;
    if (textIncludesAny(hour.avoid, keywords)) score -= 22;
  }
  if (hour.avoid.includes('诸事不宜')) score -= 35;
  return Math.max(0, Math.min(100, score));
};

const fallbackRecommendedHours = (candidate: CandidateDay | undefined, matter: string) => {
  if (!candidate) return [];
  return candidate.hourlyFortune
    .map((hour) => ({ hour, score: scoreHour(hour, matter) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ hour }) => ({
      ganZhi: hour.ganZhi,
      label: `${hour.ganZhi}时`,
      reason: hour.suitable.length ? `适合：${hour.suitable.slice(0, 3).join('、')}` : `${hour.tianShen || '此时'}相对稳妥`,
      caution: normalizeCautions(hour.avoid).join('；'),
    }));
};

const summarizeChart = async (date: Date, birthYear?: number): Promise<CandidateDay> => {
  const chart = await calculateTaibuChart({
    modelType: ModelType.ALMANAC,
    params: {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: 9,
      minute: 0,
      sex: 0,
      name: '择日',
      born_year: birthYear,
    },
  });
  const chartRecord = chart as { detail_info?: Record<string, unknown> };
  const detail = chartRecord.detail_info?.almanac as Record<string, unknown> | undefined;
  const inner = (detail?.almanac as Record<string, unknown> | undefined) || detail || {};
  const dayInfo = (detail?.dayInfo as Record<string, string> | undefined) || {};
  const candidateWithoutScore: Omit<CandidateDay, 'score'> = {
    date: String(detail?.date || toDateOnly(date)),
    ganZhi: String(dayInfo.ganZhi || ''),
    dayStem: String(dayInfo.stem || ''),
    dayBranch: String(dayInfo.branch || ''),
    lunarDate: String(inner.lunarDate || ''),
    suitable: asList(inner.suitable || inner.yi),
    avoid: asList(inner.avoid || inner.ji),
    jishen: asList(inner.jishen || inner.jiShen),
    xiongsha: asList(inner.xiongsha || inner.xiongSha),
    chongSha: String(inner.chongSha || ''),
    kongWang: String((detail as any)?.kongWang || inner.kongWang || ''),
    tianShen: String(inner.tianShen || ''),
    tianShenType: String(inner.tianShenType || ''),
    tianShenLuck: String(inner.tianShenLuck || ''),
    lunarMansion: String(inner.lunarMansion || ''),
    lunarMansionLuck: String(inner.lunarMansionLuck || ''),
    directions: (inner.directions && typeof inner.directions === 'object' ? inner.directions : {}) as Record<string, unknown>,
    hourlyFortune: Array.isArray(inner.hourlyFortune)
      ? inner.hourlyFortune.map((hour: any) => ({
          ganZhi: String(hour.ganZhi || ''),
          tianShen: String(hour.tianShen || ''),
          tianShenType: String(hour.tianShenType || ''),
          tianShenLuck: String(hour.tianShenLuck || ''),
          chong: String(hour.chong || ''),
          sha: String(hour.sha || ''),
          suitable: asList(hour.suitable),
          avoid: asList(hour.avoid),
        }))
      : [],
  };
  return {
    ...candidateWithoutScore,
    score: scoreCandidate(candidateWithoutScore, ''),
  };
};

const extractJson = (content: string): SelectionResult | null => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced || content;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as SelectionResult;
  } catch {
    return null;
  }
};

const normalizeSelection = (selection: SelectionResult | null, candidates: CandidateDay[], matter: string): SelectionResult => {
  const fallbackSelected = candidates
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => ({
      date: item.date,
      label: item.score >= 78 ? '优选吉日' : item.score >= 62 ? '可用吉日' : '备选日期',
      score: item.score,
      reasons: [
        `${item.tianShen || '值神'}${item.tianShenType ? `为${item.tianShenType}` : ''}`,
        item.suitable.length ? `宜：${item.suitable.slice(0, 4).join('、')}` : '宜项较少，建议搭配吉时使用',
      ],
      cautions: item.avoid.length ? normalizeCautions(item.avoid.slice(0, 4).join('、')) : [],
      recommendedHours: fallbackRecommendedHours(item, matter),
      suitable: item.suitable.slice(0, 8),
      avoid: item.avoid.slice(0, 8),
    }));
  const selected = Array.isArray(selection?.selected) && selection?.selected.length
    ? selection.selected
        .filter((item) => item && typeof item.date === 'string')
        .slice(0, 8)
        .map((item) => {
          const source = candidates.find((candidate) => candidate.date === item.date);
          return {
            date: item.date,
            label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : '推荐吉日',
            score: Math.max(0, Math.min(100, Number(item.score) || source?.score || 70)),
            reasons: asList(item.reasons).slice(0, 4),
            cautions: normalizeCautions(item.cautions),
            recommendedHours: Array.isArray(item.recommendedHours) && item.recommendedHours.length
              ? item.recommendedHours.slice(0, 4).map((hour: any) => ({
                  ganZhi: String(hour.ganZhi || ''),
                  label: String(hour.label || hour.ganZhi || '吉时'),
                  reason: String(hour.reason || '适合推进关键事项').slice(0, 60),
                  caution: softenCaution(hour.caution),
                }))
              : fallbackRecommendedHours(source, matter),
            suitable: asList(item.suitable).length ? asList(item.suitable).slice(0, 8) : (source?.suitable.slice(0, 8) ?? []),
            avoid: asList(item.avoid).length ? asList(item.avoid).slice(0, 8) : (source?.avoid.slice(0, 8) ?? []),
          };
        })
    : fallbackSelected;

  return {
    summary: typeof selection?.summary === 'string' && selection.summary.trim()
      ? selection.summary.trim()
      : `已根据「${matter || '所选事项'}」筛选出 ${selected.length} 个相对适合的日期。`,
    selected,
    notes: Array.isArray(selection?.notes) ? selection.notes.map(String).filter(Boolean).slice(0, 4) : [],
  };
};

const pickCaseInfo = async (caseId: string, userId: string) => {
  if (!caseId) return null;
  const item = await prisma.divinationCase.findFirst({
    where: { id: caseId, userId, modelType: 'bazi' },
    select: { id: true, title: true, chartParams: true, chartData: true },
  });
  if (!item) return null;
  const chartData = item.chartData as Record<string, unknown> | null;
  const params = item.chartParams as Record<string, unknown> | null;
  const text = typeof chartData?.taibuText === 'string' ? chartData.taibuText.slice(0, 1800) : '';
  const baziInfo = chartData?.bazi_info as Record<string, unknown> | undefined;
  const pillars = Array.isArray(baziInfo?.bazi) ? baziInfo.bazi.join(' ') : '';
  return {
    id: item.id,
    title: item.title,
    name: String(params?.name || item.title),
    dayMaster: String((baziInfo?.bazi as string[] | undefined)?.[2]?.[0] || ''),
    pillars,
    chartParams: params,
    chartText: text,
  };
};

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: '请先登录后再使用智能择吉' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    matter?: string;
    startDate?: string;
    endDate?: string;
    caseId?: string;
  };
  const matter = typeof body.matter === 'string' ? body.matter.trim().slice(0, 300) : '';
  if (!matter) {
    return NextResponse.json({ error: '请输入要择吉的事项' }, { status: 400 });
  }

  const start = parseDateOnly(body.startDate) || new Date();
  const requestedEnd = parseDateOnly(body.endDate) || new Date(start.getTime() + 14 * DAY_MS);
  const rangeDays = Math.floor((requestedEnd.getTime() - start.getTime()) / DAY_MS) + 1;
  if (rangeDays <= 0) {
    return NextResponse.json({ error: '结束日期不能早于开始日期' }, { status: 400 });
  }
  if (rangeDays > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: `日期范围最多支持 ${MAX_RANGE_DAYS} 天` }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { quota: true } });
  if (!user || user.quota <= 0) {
    return NextResponse.json({ error: '您的提问额度已用完' }, { status: 403 });
  }

  const caseInfo = await pickCaseInfo(typeof body.caseId === 'string' ? body.caseId : '', userId);
  const birthYear = Number((caseInfo as any)?.chartParams?.year);
  const candidates = await Promise.all(
    Array.from({ length: rangeDays }, (_, index) => summarizeChart(new Date(start.getTime() + index * DAY_MS), Number.isFinite(birthYear) ? birthYear : undefined)),
  );
  const scoredCandidates = candidates
    .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate, matter) }))
    .sort((a, b) => b.score - a.score);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY is missing.' }, { status: 500 });
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const prompt = [
    '你是专业择日顾问。请只基于候选黄历数据、用户事项和可选命主信息，选出最适合的 3-6 个日期。',
    '不要编造候选范围外的日期。不要长篇论述。',
    '注意事项必须使用温和、生活化语言，不要直接输出吓人的神煞名称，不要说“凶”“灾”“欺诈”等刺激性词；如果有风险，只说“多核对合同/沟通留余量/避开冲突方位/节奏稳一点”。',
    '每个推荐日期都要从 hourlyFortune 中选择 2-4 个适合该事项的吉时，写入 recommendedHours。推荐吉时也要结合命主信息。',
    '必须输出严格 JSON，不要 Markdown。格式：',
    '{"summary":"一句总评","selected":[{"date":"YYYY-MM-DD","label":"优选吉日/可用吉日/备选日期","score":0-100,"reasons":["短理由"],"cautions":["温和提醒"],"recommendedHours":[{"ganZhi":"甲子","label":"子时 23:00-01:00","reason":"适合...","caution":"温和提醒"}],"suitable":["宜项"],"avoid":["忌项"]}],"notes":["简短备注"]}',
    '',
    `用户事项：${matter}`,
    caseInfo ? `命主信息：${JSON.stringify(caseInfo)}` : '命主信息：未选择，按通用黄历择日。',
    `候选日期：${JSON.stringify(scoredCandidates.slice(0, Math.min(scoredCandidates.length, 35)))}`,
  ].join('\n');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_FLASH_MODEL,
      temperature: 0.35,
      messages: [
        { role: 'system', content: '你负责结构化择日筛选，只输出可解析 JSON。' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText || '智能择吉请求失败，请稍后重试' }, { status: response.status });
  }

  const payload = await response.json();
  const content = String(payload.choices?.[0]?.message?.content || '');
  const result = normalizeSelection(extractJson(content), scoredCandidates, matter);

  await prisma.user.update({ where: { id: userId }, data: { quota: { decrement: 1 } } });
  const createdSession = await prisma.divinationSession.create({
    data: {
      userId,
      caseId: caseInfo?.id || null,
      modelType: ModelType.ALMANAC,
      title: `择吉日 - ${matter.slice(0, 18)}`,
      chartParams: {
        matter,
        startDate: toDateOnly(start),
        endDate: toDateOnly(requestedEnd),
        caseId: caseInfo?.id || null,
      } as Prisma.InputJsonValue,
      chartData: {
        selection: result,
        candidates: scoredCandidates,
        caseInfo,
      } as Prisma.InputJsonValue,
      messages: {
        create: [
          { role: 'user', content: `择吉事项：${matter}\n范围：${toDateOnly(start)} 至 ${toDateOnly(requestedEnd)}${caseInfo ? `\n命主：${caseInfo.title}` : ''}` },
          { role: 'assistant', content: result.summary },
        ],
      },
    },
  });

  return NextResponse.json({ ...result, sessionId: createdSession.id });
}
