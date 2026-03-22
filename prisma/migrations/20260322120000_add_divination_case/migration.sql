CREATE TABLE "DivinationCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chartParams" JSONB,
    "chartData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DivinationCase_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DivinationSession"
ADD COLUMN "caseId" TEXT;

CREATE INDEX "DivinationCase_userId_modelType_updatedAt_idx"
ON "DivinationCase"("userId", "modelType", "updatedAt");

CREATE INDEX "DivinationSession_caseId_updatedAt_idx"
ON "DivinationSession"("caseId", "updatedAt");

ALTER TABLE "DivinationCase"
ADD CONSTRAINT "DivinationCase_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "DivinationSession"
ADD CONSTRAINT "DivinationSession_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "DivinationCase"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
