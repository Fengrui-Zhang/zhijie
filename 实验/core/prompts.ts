import type { BaziResponse } from '../../types.ts';
import { formatKnowledgeContext } from '../../utils/knowledge.ts';
import type { ExperimentCase, PromptBundle, RetrievedKnowledgeItem, RetrievalMode } from '../types.ts';

const DEFAULT_BAZI_QUESTION = '请分析此命造的性格、事业、财运、婚姻，并给出未来5-10年的大致运势点评。';

function formatBaziPrompt(data: BaziResponse) {
  const { base_info, bazi_info, dayun_info, detail_info, start_info } = data;
  const shenshaInfo = detail_info?.shensha
    ? `年柱: ${detail_info.shensha.year}\n  月柱: ${detail_info.shensha.month}\n  日柱: ${detail_info.shensha.day}\n  时柱: ${detail_info.shensha.hour}`
    : '无';
  const jishenInfo = start_info?.jishen && start_info.jishen.length > 0
    ? `年柱: ${start_info.jishen[0] || '—'}\n  月柱: ${start_info.jishen[1] || '—'}\n  日柱: ${start_info.jishen[2] || '—'}\n  时柱: ${start_info.jishen[3] || '—'}`
    : '无';
  const dayunShenshaInfo = detail_info?.dayunshensha && detail_info.dayunshensha.length > 0
    ? detail_info.dayunshensha.map((item) => `${item.tgdz}: ${item.shensha}`).join('；')
    : '无';
  const dayunRanges = dayun_info?.big?.map((name, idx) => {
    const start = dayun_info.big_start_year?.[idx];
    const end = dayun_info.big_end_year?.[idx];
    const age = dayun_info.xu_sui?.[idx];
    const startText = start ?? '—';
    const endText = end ?? '—';
    const ageText = age ?? '—';
    return `${name}（${startText}-${endText}，${ageText}岁起）`;
  }) || [];
  return `
  【八字命理排盘】
  姓名: ${base_info.name} (${base_info.sex})
  公历: ${base_info.gongli}
  真太阳时调整: ${base_info.zhen?.shicha || '无'}
  八字: ${bazi_info.bazi.join(' ')}
  五行纳音: ${bazi_info.na_yin.join(' ')}
  格局: ${base_info.zhengge}
  神煞:
  四柱神煞:
  ${shenshaInfo}
  吉神凶煞:
  ${jishenInfo}
  大运神煞: ${dayunShenshaInfo}
  喜用神分析需AI自行推断。

  大运: ${dayun_info.big.join(' -> ')}
  大运起止: ${dayunRanges.join('；')}
  起运: ${base_info.qiyun}
  `;
}

function buildGenericDirectPrompt(caseItem: ExperimentCase) {
  const { params, question } = caseItem;
  const sexLabel = params.sex === 0 ? '男' : '女';
  return [
    `命主：${params.name}`,
    `性别：${sexLabel}`,
    `出生时间：${params.year}年${params.month}月${params.day}日${params.hours}时${params.minute}分`,
    params.province && params.city ? `出生地：${params.province}${params.city}` : '',
    `问题：${question}`,
    '请直接给出命理分析，并尽量说明你的判断依据。若信息不足，可以指出不确定之处，但不要捏造排盘细节。',
  ].filter(Boolean).join('\n');
}

function buildGenericChartPrompt(chartData: BaziResponse, question: string) {
  const chartText = formatBaziPrompt(chartData).trim();
  const finalQuestion = question.trim() || DEFAULT_BAZI_QUESTION;
  return [
    '以下是某位命主的专业八字排盘信息，请根据排盘直接进行命理分析。',
    '',
    chartText,
    '',
    `用户问题：${finalQuestion}`,
    '请用中文回答，并尽量说明你判断的依据。',
  ].join('\n');
}

export function buildStructuredBaziSystem(chartData: BaziResponse, knowledgeContext = '') {
  const panText = formatBaziPrompt(chartData);
  const now = new Date();
  const currentTimeText = `当前时间: ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日${now.getHours()}时${now.getMinutes()}分`;
  const body = [
    '你是一位深谙段建业盲派命理体系的算命专家。你推命的核心逻辑是理法、象法、技法三位一体，重点在于观察八字如何通过做功来表述人生 。',
    '如果知识库检索到强有力的证据，请保持专业判断，不要为了迎合用户情绪而轻易动摇观点；在适当位置可引用或提及知识库中的关键信息作为依据。',
    'Workflow:',
    '1. 建立坐标：宾主与体用 分清宾主：日、时为主位（代表我、我的家、我的工具）；年、月为宾位（代表他人的、外界的、我面对的环境） 。 定体用：将十神分为体（日主、印、禄、比劫，代表我自己或操纵的工具）和用（财、官，代表我的目的和追求）。食伤视情况而定，食神近体，伤官近用 。',
    '2. 核心分析：寻找做功方式 请根据以下逻辑分析八字的能量耗散与效率： 日干意向：日干有无合（合财/官）、有无生（生食伤），这是日干追求目标的体现 。 主位动作：日支是否参与刑、冲、克、穿、合、墓。若日支不做功，再看有无禄神和比劫做功 。 成党成势：分析干支是否成党，成功者往往有势，通过强方制掉弱方来做功 。 做功类型：判定是制用、化用、生用还是合用结构 ，干支自合（如丁亥、戊子、辛巳、壬午）属于合制做功，合则能去，效率极高。',
    '3. 层次判定：效率与干净度 富贵贫贱：制得干净、做功效率高者为大富贵；制不干净、能量内耗或废神多者为平庸 。 虚实取象：财星虚透主才华、口才而非钱财；官星虚透主名气而非权位 。',
    '4. 细节推断：穿、破与墓库 穿（害）分析：重点观察子未、丑午、卯辰、酉戌等相穿，这代表防不胜防的伤害或穿倒（破坏性质） 。 墓库开闭：辰戌丑未是否逢冲刑，不冲为墓（死的），冲开为库（活的），库必须开才能发挥作用 。日主坐下的印库或者比劫库不能被冲，财库和官库逢冲则开。',
    '5. 输出格式要求：',
    '6. 八字排盘及体用分析。',
    '7. 做功逻辑详解（说明使用了什么工具，制了什么东西，效率如何）。',
    '8. 富贵层次判定。',
    '',
    '这是某位提问者的八字排盘信息，请你据此进行推断：',
    '',
    panText,
    currentTimeText,
    '',
    '请严格基于以上数据分析，不得臆测与杜撰。',
  ].join('\n');

  return knowledgeContext ? `${body}\n\n${knowledgeContext}` : body;
}

export function buildPromptBundle(
  caseItem: ExperimentCase,
  method: {
    useChart: boolean;
    useStructuredPrompt: boolean;
    retrievalMode: RetrievalMode;
  },
  chartData: BaziResponse | null,
  knowledgeChunks: RetrievedKnowledgeItem[]
): PromptBundle {
  const knowledgeContext = formatKnowledgeContext(knowledgeChunks);
  const knowledgeQuery = caseItem.question.trim() || DEFAULT_BAZI_QUESTION;

  if (!method.useChart) {
    return {
      system: '你是一位中文命理分析助手，请根据用户提供的信息进行回答；如果缺少专业排盘依据，请明确说明不确定性。',
      user: buildGenericDirectPrompt(caseItem),
      retrievalMode: method.retrievalMode,
      knowledgeQuery,
    };
  }

  if (!chartData) {
    throw new Error('Chart data is required for chart-based methods.');
  }

  if (!method.useStructuredPrompt) {
    return {
      system: knowledgeContext
        ? `你是一位中文命理分析助手。请参考已提供的资料和排盘信息进行回答。\n\n${knowledgeContext}`
        : '你是一位中文命理分析助手。请根据排盘信息回答用户问题。',
      user: buildGenericChartPrompt(chartData, caseItem.question),
      retrievalMode: method.retrievalMode,
      knowledgeQuery,
    };
  }

  const userPrompt = caseItem.question.trim() || DEFAULT_BAZI_QUESTION;
  return {
    system: buildStructuredBaziSystem(chartData, knowledgeContext),
    user: `用户问题：${userPrompt}\n请结合命盘重点回答，必要时补充全盘背景。`,
    retrievalMode: method.retrievalMode,
    knowledgeQuery,
  };
}
