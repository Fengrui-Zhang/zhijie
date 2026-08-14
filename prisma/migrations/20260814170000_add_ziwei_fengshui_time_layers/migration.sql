ALTER TABLE "ZiweiFengshuiAnalysis"
ADD COLUMN "analysisLayer" TEXT NOT NULL DEFAULT 'yearly',
ADD COLUMN "periodKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN "periodLabel" TEXT;

ALTER TABLE "ZiweiFengshuiAnalysis"
ALTER COLUMN "targetYear" DROP NOT NULL;

UPDATE "ZiweiFengshuiAnalysis"
SET "analysisLayer" = 'yearly',
    "periodKey" = "targetYear"::text,
    "periodLabel" = "targetYear"::text || '年流年';

DROP INDEX "ZiweiFengshuiAnalysis_caseId_targetYear_chartFingerprint_promptVersion_key";
DROP INDEX "ZiweiFengshuiAnalysis_userId_caseId_targetYear_idx";

CREATE UNIQUE INDEX "ZiweiFengshuiAnalysis_caseId_analysisLayer_periodKey_chartFingerprint_promptVersion_key"
ON "ZiweiFengshuiAnalysis"("caseId", "analysisLayer", "periodKey", "chartFingerprint", "promptVersion");

CREATE INDEX "ZiweiFengshuiAnalysis_userId_caseId_analysisLayer_periodKey_idx"
ON "ZiweiFengshuiAnalysis"("userId", "caseId", "analysisLayer", "periodKey");
