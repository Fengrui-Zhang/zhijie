export const CHAT_TIMEOUT_MESSAGE = 'AI 分析时间较长，本次请求已超时且不会扣除点数，请稍后重试。';

export function isTimeoutLike(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error || '');
  return name === 'TimeoutError' || name === 'AbortError' || /timeout|timed out|aborted due to timeout/i.test(message);
}

export function friendlyChatError(error: unknown, fallback = 'AI 服务暂时不可用，请稍后重试。') {
  if (isTimeoutLike(error)) return CHAT_TIMEOUT_MESSAGE;
  const message = error instanceof Error ? error.message : String(error || '');
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'AI 服务连接中断，本次请求未完成，请稍后重试。';
  }
  return message.trim() || fallback;
}
