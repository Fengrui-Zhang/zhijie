ALTER TABLE "EmailVerificationCode"
ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'registration';

CREATE INDEX "EmailVerificationCode_email_purpose_createdAt_idx"
ON "EmailVerificationCode"("email", "purpose", "createdAt");
