CREATE TABLE "ZiweiFengshuiAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "targetYear" INTEGER NOT NULL,
    "chartFingerprint" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "lastError" TEXT,
    "pointReserved" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZiweiFengshuiAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZiweiFengshuiAnalysis_caseId_targetYear_chartFingerprint_promptVersion_key"
ON "ZiweiFengshuiAnalysis"("caseId", "targetYear", "chartFingerprint", "promptVersion");

CREATE INDEX "ZiweiFengshuiAnalysis_userId_caseId_targetYear_idx"
ON "ZiweiFengshuiAnalysis"("userId", "caseId", "targetYear");

CREATE INDEX "ZiweiFengshuiAnalysis_status_updatedAt_idx"
ON "ZiweiFengshuiAnalysis"("status", "updatedAt");

ALTER TABLE "ZiweiFengshuiAnalysis"
ADD CONSTRAINT "ZiweiFengshuiAnalysis_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ZiweiFengshuiAnalysis"
ADD CONSTRAINT "ZiweiFengshuiAnalysis_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "DivinationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
