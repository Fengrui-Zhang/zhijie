ALTER TABLE "User"
  ADD COLUMN "agentLockUntil" TIMESTAMP(3),
  ADD COLUMN "agentLockTurnId" TEXT;

ALTER TABLE "ChatMessage"
  ADD COLUMN "agentTurnId" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE TABLE "AgentTurn" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "aiCallCount" INTEGER NOT NULL DEFAULT 0,
  "pointsUsed" INTEGER NOT NULL DEFAULT 0,
  "matterKey" TEXT,
  "clarification" JSONB,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AgentTurn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentToolRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "turnId" TEXT NOT NULL,
  "toolCallId" TEXT,
  "toolName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "input" JSONB NOT NULL,
  "resultSummary" TEXT,
  "resultText" TEXT,
  "rawResult" JSONB,
  "errorCode" TEXT,
  "matterKey" TEXT,
  "divinationMode" TEXT,
  "timeBucketKey" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AgentToolRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMessage_agentTurnId_createdAt_idx" ON "ChatMessage"("agentTurnId", "createdAt");
CREATE INDEX "AgentTurn_userId_createdAt_idx" ON "AgentTurn"("userId", "createdAt");
CREATE INDEX "AgentTurn_sessionId_createdAt_idx" ON "AgentTurn"("sessionId", "createdAt");
CREATE INDEX "AgentToolRun_userId_timeBucketKey_divinationMode_idx" ON "AgentToolRun"("userId", "timeBucketKey", "divinationMode");
CREATE INDEX "AgentToolRun_sessionId_startedAt_idx" ON "AgentToolRun"("sessionId", "startedAt");
CREATE INDEX "AgentToolRun_turnId_startedAt_idx" ON "AgentToolRun"("turnId", "startedAt");

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_agentTurnId_fkey" FOREIGN KEY ("agentTurnId") REFERENCES "AgentTurn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentTurn" ADD CONSTRAINT "AgentTurn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentTurn" ADD CONSTRAINT "AgentTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DivinationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentToolRun" ADD CONSTRAINT "AgentToolRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentToolRun" ADD CONSTRAINT "AgentToolRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DivinationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentToolRun" ADD CONSTRAINT "AgentToolRun_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "AgentTurn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
