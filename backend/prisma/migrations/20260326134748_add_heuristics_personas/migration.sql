-- DropForeignKey
ALTER TABLE "bugs" DROP CONSTRAINT "bugs_testCaseId_fkey";

-- DropIndex
DROP INDEX "bug_tags_tagId_idx";

-- DropIndex
DROP INDEX "tags_projectId_idx";

-- DropIndex
DROP INDEX "test_case_assignees_userId_idx";

-- DropIndex
DROP INDEX "test_case_tags_tagId_idx";

-- DropIndex
DROP INDEX "test_execution_tags_tagId_idx";

-- DropIndex
DROP INDEX "test_suite_assignees_userId_idx";

-- CreateTable
CREATE TABLE "et_charters" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "charter" TEXT NOT NULL,
    "areas" TEXT[],
    "startDate" TIMESTAMP(3),
    "testerId" TEXT,
    "duration" TEXT,
    "testDesignPercentage" INTEGER DEFAULT 40,
    "bugInvestigationPercentage" INTEGER DEFAULT 30,
    "sessionSetupPercentage" INTEGER DEFAULT 10,
    "charterVsOpportunity" INTEGER DEFAULT 70,
    "dataFiles" TEXT[],
    "testNotes" JSONB,
    "opportunities" JSONB,
    "bugs" JSONB,
    "issues" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "et_charters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heuristics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "elements" JSONB,
    "examples" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "heuristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "heuristicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "characteristics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "et_charter_heuristics" (
    "id" TEXT NOT NULL,
    "etCharterId" TEXT NOT NULL,
    "heuristicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "et_charter_heuristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bug_et_charters" (
    "id" TEXT NOT NULL,
    "bugId" TEXT NOT NULL,
    "etCharterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bug_et_charters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "et_charter_test_cases" (
    "id" TEXT NOT NULL,
    "etCharterId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "et_charter_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "et_charter_heuristics_etCharterId_heuristicId_key" ON "et_charter_heuristics"("etCharterId", "heuristicId");

-- CreateIndex
CREATE UNIQUE INDEX "bug_et_charters_bugId_etCharterId_key" ON "bug_et_charters"("bugId", "etCharterId");

-- CreateIndex
CREATE UNIQUE INDEX "et_charter_test_cases_etCharterId_testCaseId_key" ON "et_charter_test_cases"("etCharterId", "testCaseId");

-- AddForeignKey
ALTER TABLE "et_charters" ADD CONSTRAINT "et_charters_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "test_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "et_charters" ADD CONSTRAINT "et_charters_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "et_charters" ADD CONSTRAINT "et_charters_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_heuristicId_fkey" FOREIGN KEY ("heuristicId") REFERENCES "heuristics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "et_charter_heuristics" ADD CONSTRAINT "et_charter_heuristics_etCharterId_fkey" FOREIGN KEY ("etCharterId") REFERENCES "et_charters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "et_charter_heuristics" ADD CONSTRAINT "et_charter_heuristics_heuristicId_fkey" FOREIGN KEY ("heuristicId") REFERENCES "heuristics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_et_charters" ADD CONSTRAINT "bug_et_charters_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "bugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bug_et_charters" ADD CONSTRAINT "bug_et_charters_etCharterId_fkey" FOREIGN KEY ("etCharterId") REFERENCES "et_charters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "et_charter_test_cases" ADD CONSTRAINT "et_charter_test_cases_etCharterId_fkey" FOREIGN KEY ("etCharterId") REFERENCES "et_charters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "et_charter_test_cases" ADD CONSTRAINT "et_charter_test_cases_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
