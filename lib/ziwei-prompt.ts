import type { ZiweiResponse } from '../types';

export const ZIWEI_ANALYSIS_SYSTEM_PROMPT = `你是一位专业的紫微斗数命理分析师，擅长通过紫微斗数命盘分析人生运势。请根据用户提供的命盘信息，进行专业的分析解读。

分析要求：
1. 分析命宫主星及其组合的性格特征
2. 分析命盘格局（如紫府同宫、机月同梁等经典格局）
3. 分析四化飞星（禄权科忌）对各宫位的影响
4. 分析事业、财帛、感情等重点宫位
5. 结合大限和流年运势给出建议
6. 指出命盘中的优势与需要注意的方面

输出格式：
- 使用清晰的段落结构
- 每个分析维度单独成段
- 语言专业但通俗易懂
- 总字数控制在800-1200字`;

export const ZIWEI_PERSONALITY_SYSTEM_PROMPT = `你是一位资深的紫微斗数宗师，综合运用三合紫微、飞星紫微、河洛紫微、钦天四化等各流派分析技法。

## 核心能力
- 十二宫星曜分布与主辅星组合解读
- 四化飞星（化禄权科忌）的宫位联动分析
- 大限流年叠宫与限运推断
- 命主性格、事业、财运、婚姻、健康等全方位论断

## 分析框架
1. 命宫主星定性格根基，看庙旺利陷
2. 四化飞布定人生主轴，化忌定关键课题
3. 大限流年叠宫，逐运分析关键事件与时间窗口
4. 综合各宫交互，给出趋吉避凶建议

## 回答风格
- 先结论后展开，条理清晰
- 指出关键宫位与核心星曜影响
- 关键事件须给出时间范围和吉凶属性
- 给出具体可执行的建议`;

const formatFallbackPalace = (palace: any) => {
  if (!palace) return '';
  const mainStars = [
    palace.ziweixing ? `${palace.ziweixing}${palace.ziweixing_xingyao ? `(${palace.ziweixing_xingyao})` : ''}` : '',
    palace.tianfuxing ? `${palace.tianfuxing}${palace.tianfuxing_xingyao ? `(${palace.tianfuxing_xingyao})` : ''}` : '',
  ].filter(Boolean).join('、') || '-';
  return `| ${palace.minggong || '-'} | ${palace.yinshou || '-'} | ${palace.daxian || '-'} | ${mainStars} | ${palace.yearganxing || '-'} |`;
};

export const formatZiweiChartContext = (data: ZiweiResponse) => {
  if (data.taibuText?.trim()) {
    return data.taibuText.trim();
  }

  const { base_info, detail_info } = data;
  const palaces = detail_info?.xiantian_info?.gong_pan || [];
  const palaceText = palaces.map(formatFallbackPalace).filter(Boolean).join('\n');
  return [
    '# 紫微命盘',
    '',
    '## 基本信息',
    `- 命主: ${base_info.name}`,
    `- 性别: ${base_info.sex}`,
    `- 阳历: ${base_info.gongli}${base_info.nongli ? ` (农历: ${base_info.nongli})` : ''}`,
    `- 命宫: ${base_info.minggong}`,
    `- 身宫: ${base_info.shengong}`,
    `- 五行局: ${base_info.mingju}`,
    `- 命主星: ${base_info.mingzhu}`,
    `- 身主星: ${base_info.shenzhu}`,
    base_info.zhen?.shicha ? `- 真太阳时: ${base_info.zhen.shicha}` : '',
    '',
    '## 十二宫位全盘',
    '| 宫位 | 干支 | 大限 | 主星 | 辅杂曜 |',
    '|------|------|------|------|--------|',
    palaceText,
  ].filter(Boolean).join('\n');
};

export const buildZiweiSystemPrompt = (data: ZiweiResponse, currentTimeText?: string) => [
  ZIWEI_PERSONALITY_SYSTEM_PROMPT,
  '',
  ZIWEI_ANALYSIS_SYSTEM_PROMPT,
  '',
  '【紫微斗数命盘上下文】',
  formatZiweiChartContext(data),
  currentTimeText || '',
  '',
  '请严格基于以上命盘资料分析，不得臆测与杜撰。若用户追问具体事项，优先结合命宫、身宫、三方四正、四化、大限流年等上下文回答。',
].filter(Boolean).join('\n');

export const buildZiweiAnalysisPrompt = (data: ZiweiResponse, question?: string, currentTimeText?: string) => {
  const trimmedQuestion = question?.trim();
  return [
    '请分析以下紫微斗数命盘：',
    '',
    formatZiweiChartContext(data),
    currentTimeText || '',
    '',
    trimmedQuestion
      ? `用户问题：${trimmedQuestion}\n请结合命盘重点回答，必要时补充全盘背景。`
      : '请进行一次完整的紫微斗数命盘分析。',
  ].filter(Boolean).join('\n');
};
