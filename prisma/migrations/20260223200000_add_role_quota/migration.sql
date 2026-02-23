-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "quota" INTEGER NOT NULL DEFAULT 30;

-- Update DivinationSession foreign key to cascade on delete
ALTER TABLE "DivinationSession" DROP CONSTRAINT IF EXISTS "DivinationSession_userId_fkey";
ALTER TABLE "DivinationSession" ADD CONSTRAINT "DivinationSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
