const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const ids = (value: unknown[]) => [...new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id)))].slice(0, 4);

export function restoreAgentSessionContext(chartParams: unknown, messages: { role: string; metadata?: unknown }[]) {
  const params = record(chartParams);
  if (params.type !== 'agent_chat') return chartParams;
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role !== 'user') continue;
    const metadata = record(messages[index].metadata);
    if (!Array.isArray(metadata.selectedCaseIds) || !Array.isArray(metadata.selectedSessionIds)) continue;
    return { ...params, sourceCaseIds: ids(metadata.selectedCaseIds), sourceSessionIds: ids(metadata.selectedSessionIds) };
  }
  return chartParams;
}
