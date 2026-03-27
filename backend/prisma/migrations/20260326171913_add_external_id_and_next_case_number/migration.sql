-- AlterTable
ALTER TABLE "test_cases" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "test_suites" ADD COLUMN     "nextCaseNumber" INTEGER NOT NULL DEFAULT 1;
