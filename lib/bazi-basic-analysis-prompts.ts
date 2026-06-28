export type BaziBasicAnalysisType = 'wuxing' | 'personality';

export type SupportedAnalysisChartType =
  | 'life_fortune_trend'
  | 'fortune_radar'
  | 'wuxing_energy'
  | 'life_timeline'
  | 'fortune_calendar'
  | 'personality_petal';

export const WUXING_PROMPT = `你是一位专业的命理分析师，擅长八字五行分析。请根据用户提供的八字信息，进行专业的五行分析。

分析要求：
1. 分析五行的整体配置和平衡状态
2. 判断五行的强弱对比，结合日主在月令的十二长生状态（长生、帝旺为旺，病、死、绝为衰）
3. 确定喜用神和忌神
4. 分析地支关系（三合局、六合、六冲）对五行的影响：
   - 三合局（申子辰水、亥卯未木、寅午戌火、巳酉丑金）力量最强
   - 六合可增强相关五行
   - 六冲主动荡变化
5. 给出五行调理建议（颜色、方位、职业等）
6. 分析五行对性格和命运的影响

输出格式：
- 使用清晰的段落结构
- 每个要点单独成段
- 语言专业但通俗易懂
- 总字数控制在500-800字`;

export const PERSONALITY_PROMPT = `你是一位专业的命理分析师，擅长通过八字分析人格特征。请根据用户提供的八字信息，进行深度人格分析。

分析要求：
1. 分析核心性格特征（3-5个主要特质），结合日主十二长生状态：
   - 长生、帝旺：有冲劲、主动积极
   - 沐浴、冠带：注重外表、追求进步
   - 衰、病、死：内敛稳重、深思熟虑
   - 墓、绝、胎、养：潜力待发、厚积薄发
2. 分析优势与潜质
3. 分析需要注意的性格盲点
4. 结合地支关系分析人际关系：
   - 三合局主团结协作
   - 六合主亲和人缘
   - 六冲主性格冲突或变动
5. 分析适合的发展方向

输出格式：
- 使用清晰的段落结构
- 每个特质单独成段并有具体说明
- 语言温暖亲切，富有洞察力
- 总字数控制在500-800字`;

const CHART_PROMPT_HINTS: Record<SupportedAnalysisChartType, string> = {
  life_fortune_trend: '适合展示大运/流年趋势，data 需包含 currentAge、currentYear、periods、lifeHighlight。',
  fortune_radar: '适合展示当前多维评分，data 需包含 period、scores、overallScore、overallLabel、topAdvice；所有 score、overallScore 必须使用百分制 0-100，不允许使用 0-10 小数制；scores 请使用 career、wealth、love、health、family、social 等 key，每项必须包含 score 与中文 label，不能使用“项目1”这类占位名称。',
  wuxing_energy: '适合展示五行能量分布，data 需包含 elements、favorableElement、unfavorableElement、advice、interactions；elements 的 value/score 必须使用百分制 0-100。',
  life_timeline: '适合展示人生关键节点，data 需包含 currentAge、milestones。',
  personality_petal: '适合展示人格特质花瓣图，data 需包含 traits、topTraits、summary；traits 每项必须包含 key、中文 label、score、description，不能使用“项目1”这类占位名称。',
  fortune_calendar: '适合展示月度/年度运势日历热力图，data 需包含 year、month、days（每日 overallScore + level）、monthSummary。',
};

export const getAllowedBaziAnalysisChartTypes = (
  type: BaziBasicAnalysisType,
): SupportedAnalysisChartType[] => (
  type === 'wuxing'
    ? ['life_fortune_trend', 'fortune_radar', 'wuxing_energy', 'life_timeline', 'fortune_calendar']
    : ['personality_petal', 'life_timeline', 'fortune_radar', 'fortune_calendar']
);

export const buildVisualizationOutputContractPrompt = (
  allowedChartTypes: SupportedAnalysisChartType[],
) => {
  const lines = [
    '【重要】请在分析中输出至少一个 ```chart-json 代码块。',
    '代码块内部必须是合法 JSON，包含 chartType、title、data 字段。',
    '请使用以下图表类型：',
    ...allowedChartTypes.map((chartType) => `- ${chartType}: ${CHART_PROMPT_HINTS[chartType]}`),
    '不要输出注释、省略号或无法解析的占位字段。',
    '优先给出最有价值的 1-2 个图表。',
  ];
  return lines.join('\n');
};

export const buildBaziBasicAnalysisSystemPrompt = (
  type: BaziBasicAnalysisType,
  personalizationPrompt = '',
) => [
  type === 'wuxing' ? WUXING_PROMPT : PERSONALITY_PROMPT,
  personalizationPrompt.trim(),
  buildVisualizationOutputContractPrompt(getAllowedBaziAnalysisChartTypes(type)),
].filter(Boolean).join('\n\n');

export const buildBaziBasicAnalysisUserPrompt = (chartText: string) =>
  `请分析以下八字：\n\n${chartText.trim()}`;
