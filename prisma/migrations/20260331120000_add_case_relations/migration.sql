-- CreateTable
CREATE TABLE "CaseRelation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseAId" TEXT NOT NULL,
    "caseBId" TEXT NOT NULL,
    "labelAToB" TEXT,
    "labelBToA" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseRelation_userId_caseAId_idx" ON "CaseRelation"("userId", "caseAId");

-- CreateIndex
CREATE INDEX "CaseRelation_userId_caseBId_idx" ON "CaseRelation"("userId", "caseBId");

-- AddForeignKey
ALTER TABLE "CaseRelation" ADD CONSTRAINT "CaseRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRelation" ADD CONSTRAINT "CaseRelation_caseAId_fkey" FOREIGN KEY ("caseAId") REFERENCES "DivinationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRelation" ADD CONSTRAINT "CaseRelation_caseBId_fkey" FOREIGN KEY ("caseBId") REFERENCES "DivinationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
