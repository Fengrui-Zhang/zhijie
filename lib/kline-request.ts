export const KLINE_REQUEST_OPTIONS = Object.freeze({
  timeoutMs: 150_000,
  maxTokens: 8_192,
  thinking: 'disabled' as const,
  responseFormat: 'json_object' as const,
  visualResponse: false,
  temperature: 0.1,
});

export function assertCompleteKlineResult(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new Error('K线结果格式无效');
  }
  const result = value as { dayun?: unknown; liunian?: unknown };
  if (!Array.isArray(result.dayun) || !Array.isArray(result.liunian)) {
    throw new Error('K线结果缺少必要数组字段');
  }
  if (result.dayun.length !== 7) {
    throw new Error(`K线大运数据不完整：应为 7 步，实际为 ${result.dayun.length} 步`);
  }
  if (result.liunian.length !== 70) {
    throw new Error(`K线流年数据不完整：应为 70 年，实际为 ${result.liunian.length} 年`);
  }
}
