-- AlterTable
ALTER TABLE "test_case_versions" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "test_cases" ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "execution_step_results" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "actualResult" TEXT,
    "notes" TEXT,
    "executedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_step_results_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "execution_step_results" ADD CONSTRAINT "execution_step_results_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "test_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_step_results" ADD CONSTRAINT "execution_step_results_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
