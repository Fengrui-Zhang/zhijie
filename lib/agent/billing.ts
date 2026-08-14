export const MAX_AGENT_AI_CALLS = 6;
export const AGENT_POINTS_PER_AI_CALL = 0.5;
export const MAX_AGENT_POINTS_PER_TURN = Math.ceil(MAX_AGENT_AI_CALLS * AGENT_POINTS_PER_AI_CALL);

export function calculateAgentPoints(aiCalls: number) {
  const normalizedCalls = Math.max(0, Math.min(MAX_AGENT_AI_CALLS, Math.floor(aiCalls)));
  return Math.ceil(normalizedCalls * AGENT_POINTS_PER_AI_CALL);
}
export function shouldReserveAgentPoint(nextCall: number) {
  if (!Number.isInteger(nextCall) || nextCall < 1 || nextCall > MAX_AGENT_AI_CALLS) return false;
  return calculateAgentPoints(nextCall) > calculateAgentPoints(nextCall - 1);
}
