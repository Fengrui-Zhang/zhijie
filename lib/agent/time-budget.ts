export const AGENT_TURN_BUDGET_MS = 270_000;
export const AGENT_CALL_TIMEOUT_MS = 90_000;
export const AGENT_FINAL_RESERVE_MS = 105_000;
export const AGENT_MIN_CALL_TIMEOUT_MS = 15_000;

export function calculateAgentCallBudget(iteration: number, elapsedMs: number, maxCalls: number) {
  const remainingMs = AGENT_TURN_BUDGET_MS - Math.max(0, elapsedMs);
  const forcedFinal = iteration === maxCalls - 1 || (iteration > 0 && remainingMs <= AGENT_FINAL_RESERVE_MS);
  const timeoutMs = Math.max(
    AGENT_MIN_CALL_TIMEOUT_MS,
    Math.min(AGENT_CALL_TIMEOUT_MS, forcedFinal ? remainingMs - 5_000 : remainingMs - AGENT_FINAL_RESERVE_MS),
  );
  return {
    remainingMs,
    forcedFinal,
    timeoutMs,
    exhausted: remainingMs <= AGENT_MIN_CALL_TIMEOUT_MS + 5_000,
  };
}
