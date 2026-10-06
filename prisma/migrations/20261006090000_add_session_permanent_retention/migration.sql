ALTER TABLE "DivinationSession"
ADD COLUMN "isPermanent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "retentionResetAt" TIMESTAMP(3);

CREATE INDEX "DivinationSession_isPermanent_retentionResetAt_createdAt_idx"
ON "DivinationSession"("isPermanent", "retentionResetAt", "createdAt");
