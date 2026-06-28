export type PromptCopyMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const VISUAL_RESPONSE_INSTRUCTION = [
  '当用户的问题适合用图示总结时，可在自然语言结论之后附加一个 fenced code block，语言标记使用 chart-json。',
  'chart-json 必须是严格 JSON，支持的 chartType 仅限 fortune_radar、fortune_trend、fortune_calendar、wuxing_energy、life_timeline、divination_verdict。',
  '不要为了图表牺牲正文判断；没有明确评分、趋势或阶段信息时不要输出图表块。',
  '图表块示例字段：{"chartType":"divination_verdict","title":"占断摘要","data":{"score":65,"question":"...","keyFactors":[{"factor":"..."}]}}。',
].join('\n');

const ROLE_LABEL: Record<PromptCopyMessage['role'], string> = {
  system: '系统提示词',
  user: '用户提示词',
  assistant: 'AI回复',
};

export const withVisualInstruction = (messages: PromptCopyMessage[]) => {
  if (messages.length === 0) {
    return [{ role: 'system' as const, content: VISUAL_RESPONSE_INSTRUCTION }];
  }
  if (messages[0]?.role === 'system') {
    return [
      {
        role: 'system' as const,
        content: `${messages[0].content}\n\n${VISUAL_RESPONSE_INSTRUCTION}`,
      },
      ...messages.slice(1),
    ];
  }
  return [{ role: 'system' as const, content: VISUAL_RESPONSE_INSTRUCTION }, ...messages];
};

export const formatPromptCopyMessages = (
  messages: PromptCopyMessage[],
  options?: {
    title?: string;
    includeVisualInstruction?: boolean;
    note?: string;
  },
) => {
  const finalMessages = options?.includeVisualInstruction === false
    ? messages
    : withVisualInstruction(messages);
  const roleCounts: Partial<Record<PromptCopyMessage['role'], number>> = {};
  const blocks = finalMessages
    .map((message) => {
      const label = ROLE_LABEL[message.role];
      roleCounts[message.role] = (roleCounts[message.role] || 0) + 1;
      const suffix = message.role === 'system' ? '' : ` ${roleCounts[message.role]}`;
      return `【${label}${suffix}】\n${message.content.trim()}`;
    })
    .filter(Boolean);

  return blocks.join('\n\n').trim();
};
