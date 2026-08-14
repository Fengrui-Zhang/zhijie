export type AgentEvent =
  | { type: 'turn_started'; turnId: string; sessionId: string }
  | { type: 'ai_call_started'; call: number }
  | { type: 'ai_call_completed'; call: number; pointsUsed: number }
  | { type: 'tool_started'; runId: string; toolCallId: string; toolName: string; label: string; inputSummary: string }
  | { type: 'tool_completed'; runId: string; toolCallId: string; toolName: string; label: string; summary: string; detail?: string }
  | { type: 'tool_failed'; runId: string; toolCallId: string; toolName: string; label: string; error: string }
  | { type: 'clarification_required'; message: string; fields?: string[] }
  | { type: 'assistant_final'; content: string; aiCalls: number; pointsUsed: number; remainingQuota: number; sessionId: string; turnId: string }
  | { type: 'turn_failed'; error: string; code?: string; aiCalls: number; pointsUsed: number };

export type AgentToolResult = {
  summary: string;
  content: string;
  detail?: string;
  matterKey?: string;
  divinationMode?: 'time' | 'number' | 'manual' | 'case' | 'date';
  timeBucketKey?: string;
  raw?: unknown;
};

export type AgentToolContext = {
  userId: string;
  sessionId: string;
  turnId: string;
  userMessage: string;
  knowledgeEnabled: boolean;
  now: Date;
};

export type AgentToolDefinition = {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: AgentToolContext) => Promise<AgentToolResult>;
};

export class AgentInputError extends Error {
  code: string;
  fields?: string[];

  constructor(message: string, code = 'INVALID_TOOL_INPUT', fields?: string[]) {
    super(message);
    this.name = 'AgentInputError';
    this.code = code;
    this.fields = fields;
  }
}
export class AgentQuotaError extends Error {
  constructor(message = '剩余额度不足，无法继续调用 AI。') {
    super(message);
    this.name = 'AgentQuotaError';
  }
}
