-- Migration: Clean test-related data
-- Created: 2026-03-25
-- Description: DELETE all data from test-related tables keeping users, roles, enums

-- Delete junction tables first (due to foreign key constraints)
DELETE FROM "test_case_tags";
DELETE FROM "bug_tags";
DELETE FROM "test_execution_tags";
DELETE FROM "test_suite_assignees";
DELETE FROM "test_case_assignees";

-- Delete tags (will cascade from junction tables if not deleted above)
DELETE FROM "tags";

-- Delete test-related data
DELETE FROM "custom_field_values";
DELETE FROM "attachments" WHERE "entityType" IN ('bug', 'test_execution', 'test_case', 'test_plan');
DELETE FROM "bug_test_executions";
DELETE FROM "bugs";
DELETE FROM "test_executions";
DELETE FROM "test_cases";
DELETE FROM "test_suites";
DELETE FROM "test_plans";

-- Reset sequences if needed (for PostgreSQL)
-- SELECT setval('test_plans_id_seq', 1, false);
-- SELECT setval('test_suites_id_seq', 1, false);
-- SELECT setval('test_cases_id_seq', 1, false);
-- SELECT setval('test_executions_id_seq', 1, false);
-- SELECT setval('bugs_id_seq', 1, false);
