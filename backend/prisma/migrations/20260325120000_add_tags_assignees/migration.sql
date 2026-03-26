-- Migration: Add tags, assignees, and new fields
-- Created: 2026-03-25

-- Add copiedFromId to test_suites
ALTER TABLE "test_suites" ADD COLUMN "copiedFromId" TEXT;

-- Add copiedFromId to test_cases
ALTER TABLE "test_cases" ADD COLUMN "copiedFromId" TEXT;

-- Add environment and platform to test_executions
ALTER TABLE "test_executions" ADD COLUMN "environment" TEXT;
ALTER TABLE "test_executions" ADD COLUMN "platform" TEXT;

-- Add testCaseId to bugs
ALTER TABLE "bugs" ADD COLUMN "testCaseId" TEXT;

-- Create tags table
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for tags
CREATE UNIQUE INDEX "tags_name_projectId_key" ON "tags"("name", "projectId");

-- Create test_case_tags junction table
CREATE TABLE "test_case_tags" (
    "testCaseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "test_case_tags_pkey" PRIMARY KEY ("testCaseId", "tagId")
);

-- Create bug_tags junction table
CREATE TABLE "bug_tags" (
    "bugId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "bug_tags_pkey" PRIMARY KEY ("bugId", "tagId")
);

-- Create test_execution_tags junction table
CREATE TABLE "test_execution_tags" (
    "executionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "test_execution_tags_pkey" PRIMARY KEY ("executionId", "tagId")
);

-- Create test_suite_assignees junction table
CREATE TABLE "test_suite_assignees" (
    "suiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "test_suite_assignees_pkey" PRIMARY KEY ("suiteId", "userId")
);

-- Create test_case_assignees junction table
CREATE TABLE "test_case_assignees" (
    "testCaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "test_case_assignees_pkey" PRIMARY KEY ("testCaseId", "userId")
);

-- Add foreign keys for tags table
ALTER TABLE "tags" ADD CONSTRAINT "tags_projectId_fkey" 
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for test_case_tags
ALTER TABLE "test_case_tags" ADD CONSTRAINT "test_case_tags_testCaseId_fkey" 
    FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_case_tags" ADD CONSTRAINT "test_case_tags_tagId_fkey" 
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for bug_tags
ALTER TABLE "bug_tags" ADD CONSTRAINT "bug_tags_bugId_fkey" 
    FOREIGN KEY ("bugId") REFERENCES "bugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bug_tags" ADD CONSTRAINT "bug_tags_tagId_fkey" 
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for test_execution_tags
ALTER TABLE "test_execution_tags" ADD CONSTRAINT "test_execution_tags_executionId_fkey" 
    FOREIGN KEY ("executionId") REFERENCES "test_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_execution_tags" ADD CONSTRAINT "test_execution_tags_tagId_fkey" 
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for test_suite_assignees
ALTER TABLE "test_suite_assignees" ADD CONSTRAINT "test_suite_assignees_suiteId_fkey" 
    FOREIGN KEY ("suiteId") REFERENCES "test_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_suite_assignees" ADD CONSTRAINT "test_suite_assignees_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for test_case_assignees
ALTER TABLE "test_case_assignees" ADD CONSTRAINT "test_case_assignees_testCaseId_fkey" 
    FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "test_case_assignees" ADD CONSTRAINT "test_case_assignees_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key for testCaseId in bugs
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_testCaseId_fkey" 
    FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for faster lookups
CREATE INDEX "tags_projectId_idx" ON "tags"("projectId");
CREATE INDEX "test_case_tags_tagId_idx" ON "test_case_tags"("tagId");
CREATE INDEX "bug_tags_tagId_idx" ON "bug_tags"("tagId");
CREATE INDEX "test_execution_tags_tagId_idx" ON "test_execution_tags"("tagId");
CREATE INDEX "test_suite_assignees_userId_idx" ON "test_suite_assignees"("userId");
CREATE INDEX "test_case_assignees_userId_idx" ON "test_case_assignees"("userId");
