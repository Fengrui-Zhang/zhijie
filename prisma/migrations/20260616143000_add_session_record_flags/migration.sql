ALTER TABLE "DivinationSession"
ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "DivinationSession_userId_isPinned_updatedAt_idx"
ON "DivinationSession"("userId", "isPinned", "updatedAt");

CREATE INDEX "DivinationSession_userId_isArchived_updatedAt_idx"
ON "DivinationSession"("userId", "isArchived", "updatedAt");
