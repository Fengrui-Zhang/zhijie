/** 会话默认保留天数 */
export const SESSION_RETENTION_DAYS = 15;

/** 返回「保留期内」的起始时间（早于此时间的会话应被清理） */
export function getRetentionCutoff(): Date {
  const d = new Date();
  d.setDate(d.getDate() - SESSION_RETENTION_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}
