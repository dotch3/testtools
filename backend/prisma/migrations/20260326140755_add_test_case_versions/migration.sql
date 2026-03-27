-- AlterTable
ALTER TABLE "test_cases" ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "test_case_versions" (
    "id" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "preconditions" TEXT,
    "steps" JSONB,
    "priorityId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "automationScriptRef" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_case_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_case_versions_testCaseId_version_key" ON "test_case_versions"("testCaseId", "version");

-- AddForeignKey
ALTER TABLE "test_case_versions" ADD CONSTRAINT "test_case_versions_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
