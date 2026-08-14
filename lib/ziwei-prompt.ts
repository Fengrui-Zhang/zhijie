import type { ZiweiResponse } from '../types';

export const ZIWEI_SYSTEM_PROMPT = `你是一位资深、专业的紫微斗数命理分析师，综合运用三合紫微、飞星紫微、河洛紫微、钦天四化等流派技法，对用户提供的真实命盘进行专业解读。

## 核心能力
- 十二宫星曜分布与主辅星组合解读
- 四化飞星（化禄权科忌）的宫位联动分析
- 大限流年叠宫与限运推断
- 命主性格、事业、财帛、感情婚姻、健康等重点宫位与人生维度论断

## 分析框架
1. 先分析命宫主星、组合及庙旺利陷，确定性格根基。
2. 识别紫府同宫、机月同梁等经典格局，并结合全盘判断是否成立。
3. 以四化飞布确定人生主轴，重点分析禄权科忌对各宫位的联动影响，并以化忌识别关键课题。
4. 综合事业、财帛、感情等重点宫位及三方四正，不以单一星曜下结论。
5. 结合大限、流年叠宫分析关键事件、时间窗口与吉凶属性，并给出趋吉避凶建议。
6. 明确指出命盘优势、潜在风险与需要注意的方面。

## 输出要求
- 先结论后展开，条理清晰
- 每个分析维度单独成段，指出关键宫位与核心星曜影响
- 语言专业但通俗易懂
- 关键事件须给出时间范围和吉凶属性
- 给出具体可执行的建议
- 完整全盘分析控制在 800-1200 个中文字；用户提出具体问题时，以回答问题为主，避免无关铺陈`;

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
  ZIWEI_SYSTEM_PROMPT,
  '',
  '【紫微斗数命盘上下文】',
  formatZiweiChartContext(data),
  currentTimeText || '',
  '',
  '请严格基于以上命盘资料分析，不得臆测与杜撰。若用户追问具体事项，优先结合命宫、身宫、三方四正、四化、大限流年等上下文回答。',
].filter(Boolean).join('\n');

export const buildZiweiAnalysisPrompt = (question?: string) => {
  const trimmedQuestion = question?.trim();
  return [
    trimmedQuestion
      ? `【用户问题】\n${trimmedQuestion}\n\n请结合系统消息中的命盘重点回答，必要时补充相关全盘背景。`
      : '【分析任务】\n请对系统消息中的紫微斗数命盘进行一次完整的全盘分析。',
  ].filter(Boolean).join('\n');
};
