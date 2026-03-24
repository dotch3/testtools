# Plan 7 — Executions + Bugs (Manual execution, CI trigger, bugs CRUD, bug-execution linking, attachments)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement test execution recording (manual + CI-triggered), bug tracking with external tracker integration, file attachments, and the linking between executions and bugs. This covers the full execution-to-bug lifecycle.

**Architecture:** Backend follows clean architecture (domain/ -> services/ -> infrastructure/ -> interfaces/http/). Frontend uses Next.js 16.2 with App Router, `[locale]` routing via next-intl, shadcn/ui components, and Tailwind CSS 4.

**Tech Stack:** TypeScript, Fastify 5, Prisma 6, PostgreSQL 16, Redis 7, BullMQ, Next.js 16.2, shadcn/ui, Tailwind CSS 4, next-intl, Lucide React, Zod

**IMPORTANT:** Before writing any Next.js frontend code, read the relevant guide in `frontend/node_modules/next/dist/docs/` to understand Next.js 16 breaking changes.

---

## File Map

```
backend/
  src/
    domain/
      entities/
        TestExecution.ts
        Bug.ts
        Attachment.ts
      repositories/
        ITestExecutionRepository.ts
        IBugRepository.ts
        IAttachmentRepository.ts
    services/
      TestExecutionService.ts
      BugService.ts
      AttachmentService.ts
    infrastructure/
      repositories/
        PrismaTestExecutionRepository.ts
        PrismaBugRepository.ts
        PrismaAttachmentRepository.ts
      bullmq/
        queues.ts
        workers/
          syncBugsWorker.ts
          triggerCIWorker.ts
        jobStatusStore.ts
    interfaces/
      http/
        routes/
          executions.ts
          bugs.ts
          attachments.ts
          jobs.ts
        schemas/
          executionSchemas.ts
          bugSchemas.ts
          attachmentSchemas.ts
  tests/
    services/
      TestExecutionService.test.ts
      BugService.test.ts
      AttachmentService.test.ts
    routes/
      executions.test.ts
      bugs.test.ts
      attachments.test.ts

frontend/
  src/
    app/
      [locale]/
        projects/
          [id]/
            bugs/
              page.tsx
              loading.tsx
        bugs/
          [id]/
            page.tsx
            loading.tsx
    components/
      executions/
        ExecutionPanel.tsx
        ExecutionStatusBadge.tsx
        ExecutionHistory.tsx
        BulkExecutionToolbar.tsx
        TriggerCIButton.tsx
      bugs/
        BugTable.tsx
        BugFilters.tsx
        BugDetail.tsx
        BugForm.tsx
        BugStatusBadge.tsx
        BugPriorityBadge.tsx
        BugSeverityBadge.tsx
        LinkBugDialog.tsx
        CreateBugFromExecutionDialog.tsx
      attachments/
        AttachmentUploader.tsx
        AttachmentGallery.tsx
        AttachmentThumbnail.tsx
        VideoPlayer.tsx
    lib/
      api/
        executions.ts
        bugs.ts
        attachments.ts
        jobs.ts
    messages/
      pt-BR.json            (add execution/bug/attachment keys)
      en-US.json             (add execution/bug/attachment keys)
```

---

## Task 1: Execution Domain + Repository + Service

**Files:**
- Create: `backend/src/domain/entities/TestExecution.ts`
- Create: `backend/src/domain/repositories/ITestExecutionRepository.ts`
- Create: `backend/src/infrastructure/repositories/PrismaTestExecutionRepository.ts`
- Create: `backend/src/services/TestExecutionService.ts`
- Create: `backend/tests/services/TestExecutionService.test.ts`

**Dependencies:** Prisma schema already has `TestExecution` model. Requires `EnumValue` lookup for execution statuses.

- [ ] **Step 1: Create the TestExecution entity**

Create `backend/src/domain/entities/TestExecution.ts`:
- Define a `TestExecutionEntity` interface with fields matching the Prisma model: `id`, `testCaseId`, `testPlanId`, `statusId`, `executedById`, `executedAt`, `durationMs`, `notes`, `ciRunId`, `createdAt`.
- Include a `status` field (resolved EnumValue with `systemKey`, `label`, `color`).
- Include an `executedBy` field with `id`, `name`, `email`, `avatarUrl`.
- Export a `CreateExecutionInput` type: `{ testCaseId, testPlanId, statusId, executedById, durationMs?, notes?, ciRunId? }`.
- Export a `UpdateExecutionInput` type: `{ statusId?, durationMs?, notes? }`.
- Export a `BulkUpdateInput` type: `{ executionIds: string[], statusId: string, notes?: string }`.

- [ ] **Step 2: Create the ITestExecutionRepository interface**

Create `backend/src/domain/repositories/ITestExecutionRepository.ts`:
- `findByPlan(testPlanId: string, options: { page, limit, statusFilter?, caseFilter? }): Promise<{ data: TestExecutionEntity[], total: number }>`
- `findByCase(testCaseId: string, options: { page, limit }): Promise<{ data: TestExecutionEntity[], total: number }>`
- `findById(id: string): Promise<TestExecutionEntity | null>`
- `create(input: CreateExecutionInput): Promise<TestExecutionEntity>`
- `update(id: string, input: UpdateExecutionInput): Promise<TestExecutionEntity>`
- `bulkUpdateStatus(input: BulkUpdateInput): Promise<number>` (returns count updated)
- `getStatusAggregation(testPlanId: string): Promise<{ statusKey: string, statusLabel: string, color: string, count: number }[]>`

- [ ] **Step 3: Implement PrismaTestExecutionRepository**

Create `backend/src/infrastructure/repositories/PrismaTestExecutionRepository.ts`:
- Import `prisma` from `../../infrastructure/database/prisma.js`.
- Implement all methods from `ITestExecutionRepository`.
- In `findByPlan`: use `prisma.testExecution.findMany` with `where: { testPlanId }`, include `status`, `executedBy`, `testCase`. Support pagination with `skip`/`take`. Support optional `statusFilter` (filter by `status.systemKey`).
- In `findByCase`: similar query filtered by `testCaseId`, ordered by `executedAt desc`.
- In `create`: use `prisma.testExecution.create` with all fields, return with included relations.
- In `update`: use `prisma.testExecution.update`.
- In `bulkUpdateStatus`: use `prisma.testExecution.updateMany` with `where: { id: { in: executionIds } }`. Return `count`.
- In `getStatusAggregation`: use `prisma.testExecution.groupBy` on `statusId` with `_count`, then join with EnumValue to get labels/colors. Alternatively use raw query or two queries.

- [ ] **Step 4: Create TestExecutionService**

Create `backend/src/services/TestExecutionService.ts`:
- Constructor receives `ITestExecutionRepository` and a BullMQ `Queue` instance (for CI trigger).
- `runManual(input: CreateExecutionInput)`: Validate that `testCaseId` exists, `testPlanId` exists, and `statusId` is a valid `execution_status` enum value. Create execution record. Return the created execution.
- `getByPlan(testPlanId, options)`: Delegate to repository. Also call `getStatusAggregation` and return alongside results.
- `getByCase(testCaseId, options)`: Delegate to repository.
- `getById(id)`: Delegate to repository. Throw 404 if not found.
- `updateExecution(id, input, userId)`: Verify execution exists. Verify the user has permission (is executed_by or is admin/lead). Update and return.
- `bulkUpdateStatus(input, userId)`: Validate all execution IDs exist. Validate statusId. Call repository `bulkUpdateStatus`. Return count.
- `triggerCI(testCaseId, testPlanId, userId)`: Validate case and plan. Enqueue a `trigger_ci` job on BullMQ with payload `{ testCaseId, testPlanId, userId }`. Return the BullMQ `jobId`.
- Error handling: Throw typed errors (NotFoundError, ValidationError) that route handlers map to HTTP status codes.

- [ ] **Step 5: Write unit tests for TestExecutionService**

Create `backend/tests/services/TestExecutionService.test.ts`:
- Mock the repository and queue.
- Test `runManual` creates an execution and returns it.
- Test `runManual` throws when testCaseId does not exist.
- Test `bulkUpdateStatus` calls repository with correct arguments.
- Test `triggerCI` enqueues a job and returns jobId.
- Test `updateExecution` throws 404 for non-existent execution.
- Run with: `cd backend && npx vitest run tests/services/TestExecutionService.test.ts`

- [ ] **Step 6: Verify**

- All tests pass.
- Service handles validation (missing case, missing plan, invalid status).
- Repository correctly maps Prisma results to entity types.

---

## Task 2: Bug Domain + Repository + Service

**Files:**
- Create: `backend/src/domain/entities/Bug.ts`
- Create: `backend/src/domain/repositories/IBugRepository.ts`
- Create: `backend/src/infrastructure/repositories/PrismaBugRepository.ts`
- Create: `backend/src/services/BugService.ts`
- Create: `backend/tests/services/BugService.test.ts`

**Dependencies:** Prisma schema has `Bug`, `BugTestExecution` models. Requires `IBugTrackerAdapter` from `domain/interfaces/`. Requires `encrypt`/`decrypt` from `utils/crypto.ts` for integration credentials.

- [ ] **Step 1: Create the Bug entity**

Create `backend/src/domain/entities/Bug.ts`:
- Define `BugEntity` interface: `id`, `projectId`, `title`, `description`, `statusId`, `priorityId`, `severityId`, `sourceId`, `externalId`, `externalUrl`, `reportedById`, `assignedToId`, `createdAt`, `updatedAt`, `syncedAt`.
- Include resolved relation fields: `status` (EnumValue), `priority` (EnumValue), `severity` (EnumValue), `source` (EnumValue), `reportedBy` (User subset), `assignedTo` (User subset or null).
- Include optional `linkedExecutions: { executionId, testCaseTitle, status, executedAt }[]`.
- Export `CreateBugInput`: `{ projectId, title, description?, statusId, priorityId, severityId, sourceId, externalId?, externalUrl?, reportedById, assignedToId? }`.
- Export `UpdateBugInput`: `{ title?, description?, statusId?, priorityId?, severityId?, assignedToId? }`.
- Export `BugFilterOptions`: `{ status?, priority?, severity?, assignedTo?, source?, search?, page, limit }`.

- [ ] **Step 2: Create the IBugRepository interface**

Create `backend/src/domain/repositories/IBugRepository.ts`:
- `findByProject(projectId: string, filters: BugFilterOptions): Promise<{ data: BugEntity[], total: number }>`
- `findById(id: string): Promise<BugEntity | null>` (includes linked executions)
- `create(input: CreateBugInput): Promise<BugEntity>`
- `update(id: string, input: UpdateBugInput): Promise<BugEntity>`
- `delete(id: string): Promise<void>`
- `linkToExecution(bugId: string, executionId: string): Promise<void>`
- `unlinkFromExecution(bugId: string, executionId: string): Promise<void>`
- `getLinkedExecutions(bugId: string): Promise<{ executionId: string, testCaseId: string, testCaseTitle: string, status: string, executedAt: Date }[]>`
- `updateSyncedAt(id: string): Promise<void>`

- [ ] **Step 3: Implement PrismaBugRepository**

Create `backend/src/infrastructure/repositories/PrismaBugRepository.ts`:
- `findByProject`: Build dynamic `where` clause from filters. For `search`, use `OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }]`. For enum filters (status, priority, severity, source), filter by `status.systemKey` (join through EnumValue). For `assignedTo`, filter by `assignedToId`. Include `status`, `priority`, `severity`, `source`, `reportedBy`, `assignedTo` relations. Paginate with `skip`/`take`, order by `createdAt desc`.
- `findById`: Include all relations plus `bugs` (via `BugTestExecution`) with `execution` -> `testCase`, `status`.
- `create`: Use `prisma.bug.create`. Return with included relations.
- `update`: Use `prisma.bug.update`. Set `updatedAt` explicitly.
- `delete`: Use `prisma.bug.delete`. Cascade handles `BugTestExecution` rows.
- `linkToExecution`: Use `prisma.bugTestExecution.create` with composite key `{ bugId, executionId }`. Handle unique constraint error gracefully (already linked).
- `unlinkFromExecution`: Use `prisma.bugTestExecution.delete`.
- `getLinkedExecutions`: Query `prisma.bugTestExecution.findMany` with `where: { bugId }`, include `execution` with `testCase` and `status`.
- `updateSyncedAt`: Use `prisma.bug.update` to set `syncedAt: new Date()`.

- [ ] **Step 4: Create BugService**

Create `backend/src/services/BugService.ts`:
- Constructor receives `IBugRepository`, a BullMQ `Queue` for `sync_bugs`, and a reference to look up integration credentials (described below).
- `getByProject(projectId, filters)`: Delegate to repository.
- `getById(id)`: Delegate to repository. Throw 404 if not found.
- `createInternal(input: CreateBugInput)`: Validate required fields. Validate that `statusId`, `priorityId`, `severityId`, `sourceId` are valid enum values of their respective types. Create bug. Return.
- `createExternal(input: CreateBugInput, userId: string)`: Same validation as `createInternal`. Additionally:
  - Look up the `Integration` record for the project matching the bug's source type.
  - Look up the acting user's integration credentials: query `Integration` table for credentials (the `credential` field is encrypted). Decrypt using `decrypt()` from `utils/crypto.ts` with `config.ENCRYPTION_KEY`.
  - Resolve the correct `IBugTrackerAdapter` based on source (`github` -> GitHubBugTrackerAdapter, etc.).
  - Call `adapter.createBug()` with the decrypted credential. Get back `externalId` and `externalUrl`.
  - Create local bug with `externalId` and `externalUrl` populated.
  - Note: If external creation fails, do NOT create local bug. Throw error.
- `updateBug(id, input)`: Validate bug exists. Update and return.
- `deleteBug(id)`: Validate bug exists. Delete.
- `linkToExecution(bugId, executionId)`: Validate both exist. Create link.
- `syncFromExternal(bugId, userId)`: Validate bug exists and has `externalId`. Look up integration + credentials. Call `adapter.fetchBug()`. Update local fields (title, description, status mapping). Update `syncedAt`. Enqueue as BullMQ job for async processing. Return jobId.

- [ ] **Step 5: Write unit tests for BugService**

Create `backend/tests/services/BugService.test.ts`:
- Mock repository, queue, and bug tracker adapter.
- Test `createInternal` creates a bug successfully.
- Test `createInternal` throws on invalid enum value.
- Test `updateBug` throws 404 for non-existent bug.
- Test `deleteBug` calls repository delete.
- Test `linkToExecution` creates the link.
- Test `syncFromExternal` enqueues a sync job.
- Run with: `cd backend && npx vitest run tests/services/BugService.test.ts`

- [ ] **Step 6: Verify**

- All tests pass.
- Service properly validates enum values against the database.
- External bug creation flow works end-to-end with mocked adapter.

---

## Task 3: Attachment Service

**Files:**
- Create: `backend/src/domain/entities/Attachment.ts`
- Create: `backend/src/domain/repositories/IAttachmentRepository.ts`
- Create: `backend/src/infrastructure/repositories/PrismaAttachmentRepository.ts`
- Create: `backend/src/services/AttachmentService.ts`
- Create: `backend/tests/services/AttachmentService.test.ts`

**Dependencies:** `IFileStorageAdapter` already exists at `backend/src/domain/interfaces/IFileStorageAdapter.ts`. Storage factory at `backend/src/infrastructure/storage/storageFactory.ts`.

- [ ] **Step 1: Create the Attachment entity**

Create `backend/src/domain/entities/Attachment.ts`:
- Define `AttachmentEntity`: `id`, `projectId`, `entityType` (union: `'bug' | 'test_execution' | 'test_case'`), `entityId`, `fileName`, `fileType`, `fileSizeKb`, `storagePath`, `uploadedById`, `uploadedBy` (User subset: id, name, avatarUrl), `createdAt`.
- Export `CreateAttachmentInput`: `{ projectId, entityType, entityId, fileName, fileType, fileSizeKb, storagePath, uploadedById }`.
- Define allowed MIME types constant:
  ```
  ALLOWED_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm',
    'application/pdf',
    'text/plain', 'text/csv',
  ]
  ```
- Define `MAX_FILE_SIZE_KB = 50 * 1024` (50 MB).

- [ ] **Step 2: Create the IAttachmentRepository interface**

Create `backend/src/domain/repositories/IAttachmentRepository.ts`:
- `findByEntity(entityType: string, entityId: string): Promise<AttachmentEntity[]>`
- `findById(id: string): Promise<AttachmentEntity | null>`
- `create(input: CreateAttachmentInput): Promise<AttachmentEntity>`
- `delete(id: string): Promise<void>`
- `deleteByEntity(entityType: string, entityId: string): Promise<string[]>` (returns storagePaths for cleanup)

- [ ] **Step 3: Implement PrismaAttachmentRepository**

Create `backend/src/infrastructure/repositories/PrismaAttachmentRepository.ts`:
- `findByEntity`: Query with `where: { entityType, entityId }`, include `uploadedBy`, order by `createdAt desc`.
- `findById`: Query by id, include `uploadedBy`.
- `create`: Use `prisma.attachment.create`, return with relations.
- `delete`: Use `prisma.attachment.delete`.
- `deleteByEntity`: Find all attachments for entity, collect `storagePath` values, delete all, return paths.

- [ ] **Step 4: Create AttachmentService**

Create `backend/src/services/AttachmentService.ts`:
- Constructor receives `IAttachmentRepository` and `IFileStorageAdapter`.
- `upload(projectId, entityType, entityId, file: { buffer: Buffer, originalName: string, mimeType: string, sizeBytes: number }, uploadedById)`:
  - Validate `mimeType` is in `ALLOWED_MIME_TYPES`. Throw `ValidationError` if not.
  - Validate file size: `sizeBytes / 1024 <= MAX_FILE_SIZE_KB`. Throw `ValidationError` if too large.
  - Validate `entityType` is one of `bug`, `test_execution`, `test_case`.
  - Generate storage path: `{projectId}/{entityType}/{entityId}/{uuid}-{sanitizedFileName}`.
  - Call `storageAdapter.save(storagePath, buffer, mimeType)`.
  - Create DB record via repository.
  - Return the created `AttachmentEntity`.
- `getByEntity(entityType, entityId)`: Delegate to repository.
- `getFile(attachmentId, requestingUserId)`:
  - Look up attachment by id. Throw 404 if not found.
  - Verify the requesting user has access to the attachment's project (is a project member). Throw 403 if not.
  - Call `storageAdapter.getUrl(storagePath)`. For local storage, return the file path for streaming. For cloud, return the signed URL.
  - Return `{ attachment, url }`.
- `deleteAttachment(attachmentId, requestingUserId)`:
  - Look up attachment. Throw 404 if not found.
  - Verify the requesting user is the uploader OR has admin/lead role. Throw 403 otherwise.
  - Call `storageAdapter.delete(storagePath)`.
  - Delete DB record.
- `deleteAllForEntity(entityType, entityId)`:
  - Get all storage paths via `repository.deleteByEntity()`.
  - Delete each file from storage (use `Promise.allSettled` to handle partial failures gracefully).

- [ ] **Step 5: Write unit tests for AttachmentService**

Create `backend/tests/services/AttachmentService.test.ts`:
- Mock repository and storage adapter.
- Test `upload` succeeds with valid file.
- Test `upload` rejects invalid MIME type.
- Test `upload` rejects file exceeding size limit.
- Test `getFile` returns URL for valid attachment.
- Test `getFile` throws 404 for non-existent attachment.
- Test `deleteAttachment` removes from storage and DB.
- Test `deleteAllForEntity` removes all attachments and files.
- Run with: `cd backend && npx vitest run tests/services/AttachmentService.test.ts`

- [ ] **Step 6: Verify**

- All tests pass.
- File type validation works correctly.
- Storage adapter is called with correct path and MIME type.

---

## Task 4: BullMQ Worker Jobs

**Files:**
- Create: `backend/src/infrastructure/bullmq/queues.ts`
- Create: `backend/src/infrastructure/bullmq/workers/syncBugsWorker.ts`
- Create: `backend/src/infrastructure/bullmq/workers/triggerCIWorker.ts`
- Create: `backend/src/infrastructure/bullmq/jobStatusStore.ts`

**Dependencies:** Redis connection from `config.REDIS_URL`. `IBugTrackerAdapter`, `ICIAdapter` from domain interfaces. `BugService` and `TestExecutionService` for updating records.

- [ ] **Step 1: Create queue definitions**

Create `backend/src/infrastructure/bullmq/queues.ts`:
- Import `Queue` from `bullmq`.
- Import `config` for `REDIS_URL`.
- Parse Redis URL into `IORedis` connection options.
- Create and export two named queues:
  - `syncBugsQueue = new Queue('sync_bugs', { connection })` -- for syncing bugs from external trackers.
  - `triggerCIQueue = new Queue('trigger_ci', { connection })` -- for triggering CI runs.
- Export the connection options so workers can reuse them.

- [ ] **Step 2: Create job status store**

Create `backend/src/infrastructure/bullmq/jobStatusStore.ts`:
- Uses Redis directly (via `ioredis`) to store job status for polling.
- `setJobStatus(jobId: string, status: { state: string, result?: unknown, error?: string, progress?: number })`: Store as JSON in Redis key `job:status:{jobId}` with TTL of 1 hour.
- `getJobStatus(jobId: string)`: Get and parse from Redis. Return null if not found.
- Status states: `queued`, `processing`, `completed`, `failed`.
- This is what `GET /jobs/:jobId` reads from.

- [ ] **Step 3: Create syncBugsWorker**

Create `backend/src/infrastructure/bullmq/workers/syncBugsWorker.ts`:
- Import `Worker` from `bullmq`.
- Job payload: `{ bugId: string, userId: string }`.
- Worker logic:
  1. Update job status to `processing`.
  2. Look up the bug from DB (need `externalId`, `sourceId`, `projectId`).
  3. Look up the project's `Integration` record matching the bug's source.
  4. Decrypt the integration credential using `decrypt()` from `utils/crypto.ts`.
  5. Resolve the correct `IBugTrackerAdapter` (factory pattern based on source systemKey: `github`, `jira`, `gitlab`, `linear`).
  6. Call `adapter.fetchBug(externalId, credential)`.
  7. Map external status to local enum value (create a status mapping utility).
  8. Update local bug record with fetched data.
  9. Update `syncedAt` timestamp.
  10. Update job status to `completed` with result summary.
- Error handling: Catch errors, update job status to `failed` with error message. Log via `logger`.
- Configure: `concurrency: 3`, `attempts: 3`, `backoff: { type: 'exponential', delay: 5000 }`.

- [ ] **Step 4: Create triggerCIWorker**

Create `backend/src/infrastructure/bullmq/workers/triggerCIWorker.ts`:
- Import `Worker` from `bullmq`.
- Job payload: `{ testCaseId: string, testPlanId: string, userId: string }`.
- Worker logic:
  1. Update job status to `processing`.
  2. Look up the test case to get its CI configuration (from the test case's project integration or metadata).
  3. Resolve the `ICIAdapter` implementation.
  4. Call `adapter.triggerJob(config, params)` to start the CI run.
  5. Poll `adapter.getJobStatus(jobId)` at intervals (e.g., every 10 seconds, max 30 minutes) until status is `completed` or `failed`.
  6. Update job status progress during polling.
  7. When CI job completes:
     - If completed: Create a `TestExecution` record with status `pass`.
     - If failed: Create a `TestExecution` record with status `fail`.
     - Set `ciRunId` on the execution to the CI job ID/URL.
  8. Update job status to `completed` with the execution ID as result.
- Error handling: Set job status to `failed`. Log error.
- Configure: `concurrency: 2`, `attempts: 2`, `backoff: { type: 'exponential', delay: 10000 }`.

- [ ] **Step 5: Register workers on server startup**

Modify `backend/src/init.ts`:
- Import and start both workers after database initialization.
- Workers should only start if `REDIS_URL` is configured (it is required, so they always start).
- Log worker startup: `logger.info({ action: 'worker.started', queue: 'sync_bugs' })`.
- Handle graceful shutdown: on `SIGTERM`/`SIGINT`, call `worker.close()` for each worker.

- [ ] **Step 6: Verify**

- Workers initialize on server startup without errors.
- Job status store correctly writes and reads from Redis.
- A sync_bugs job can be enqueued and the worker picks it up (test with a mock adapter).
- A trigger_ci job can be enqueued and processed.
- Job status is trackable via `getJobStatus`.

---

## Task 5: Backend Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/executions.ts`
- Create: `backend/src/interfaces/http/routes/bugs.ts`
- Create: `backend/src/interfaces/http/routes/attachments.ts`
- Create: `backend/src/interfaces/http/routes/jobs.ts`
- Create: `backend/src/interfaces/http/schemas/executionSchemas.ts`
- Create: `backend/src/interfaces/http/schemas/bugSchemas.ts`
- Create: `backend/src/interfaces/http/schemas/attachmentSchemas.ts`
- Modify: `backend/src/app.ts` (register new route plugins)
- Create: `backend/tests/routes/executions.test.ts`
- Create: `backend/tests/routes/bugs.test.ts`
- Create: `backend/tests/routes/attachments.test.ts`

**Dependencies:** Services from Tasks 1-3. Permission guard from `plugins/permissionGuard.ts`. Auth middleware from `middleware/requireAuth.ts`. BullMQ queues from Task 4.

- [ ] **Step 1: Create Zod schemas for executions**

Create `backend/src/interfaces/http/schemas/executionSchemas.ts`:
- `createExecutionSchema`: body with `statusId` (uuid), `durationMs` (optional int >= 0), `notes` (optional string, max 5000 chars).
- `updateExecutionSchema`: body with optional `statusId`, `durationMs`, `notes`.
- `bulkExecutionSchema`: body with `executionIds` (array of uuid, min 1, max 100), `statusId` (uuid), `notes` (optional string).
- `executionParamsSchema`: params with `id` (uuid) for single execution.
- `planExecutionsQuerySchema`: querystring with `page` (int, default 1), `limit` (int, default 50, max 200), `status` (optional string), `caseId` (optional uuid).
- Convert Zod schemas to JSON Schema for Fastify using `zodToJsonSchema` or manual conversion for Swagger compatibility.

- [ ] **Step 2: Create Zod schemas for bugs**

Create `backend/src/interfaces/http/schemas/bugSchemas.ts`:
- `createBugSchema`: body with `title` (string, max 500), `description` (optional string, max 10000), `statusId` (uuid), `priorityId` (uuid), `severityId` (uuid), `sourceId` (uuid), `externalId` (optional string), `externalUrl` (optional url), `assignedToId` (optional uuid).
- `updateBugSchema`: body with all fields from create as optional.
- `bugFilterSchema`: querystring with `status` (optional string), `priority` (optional string), `severity` (optional string), `assignedTo` (optional uuid), `source` (optional string), `search` (optional string, max 200), `page` (int, default 1), `limit` (int, default 25, max 100).
- `linkBugExecutionSchema`: body with `executionId` (uuid).
- `bugParamsSchema`: params with `id` (uuid).
- `projectBugsParamsSchema`: params with `id` (uuid, the project ID).

- [ ] **Step 3: Create Zod schemas for attachments**

Create `backend/src/interfaces/http/schemas/attachmentSchemas.ts`:
- Upload is multipart, so the schema defines the metadata fields: `projectId` (uuid), `entityType` (enum: bug, test_execution, test_case), `entityId` (uuid).
- `attachmentParamsSchema`: params with `id` (uuid).
- Response schema for attachment metadata.

- [ ] **Step 4: Create execution routes**

Create `backend/src/interfaces/http/routes/executions.ts`:
- Export `async function executionRoutes(app: FastifyInstance)`.
- Register `requireAuth` for all routes in this plugin.
- **GET `/test-plans/:id/executions`**: List executions for a test plan. Uses `planExecutionsQuerySchema`. Permission: `execution:read`. Returns paginated list with status aggregation summary.
- **POST `/cases/:id/executions`**: Create manual execution. Uses `createExecutionSchema`. Permission: `execution:create`. Injects `executedById` from `request.user.userId`. Requires `testPlanId` in body or query. Returns 201 with created execution.
- **PATCH `/executions/:id`**: Update execution. Uses `updateExecutionSchema`. Permission: `execution:update`. Returns updated execution.
- **POST `/executions/bulk`**: Bulk status update. Uses `bulkExecutionSchema`. Permission: `execution:update`. Returns `{ updated: number }`.
- **POST `/cases/:id/trigger-ci`**: Trigger CI for a test case. Permission: `execution:create`. Requires `testPlanId` in body. Returns 202 with `{ jobId }`.
- All routes include Swagger `schema` block with `tags: ['Executions']`, `summary`, `description`, `params`, `querystring`/`body`, `response`.

- [ ] **Step 5: Create bug routes**

Create `backend/src/interfaces/http/routes/bugs.ts`:
- Export `async function bugRoutes(app: FastifyInstance)`.
- Register `requireAuth` for all routes.
- **GET `/projects/:id/bugs`**: List bugs for project. Uses `bugFilterSchema`. Permission: `bug:read`. Returns paginated list.
- **POST `/projects/:id/bugs`**: Create bug. Uses `createBugSchema`. Permission: `bug:create`. Injects `reportedById` from user. If source is not `internal`, trigger external creation. Returns 201.
- **GET `/bugs/:id`**: Get bug detail. Permission: `bug:read`. Returns bug with linked executions and attachments.
- **PATCH `/bugs/:id`**: Update bug. Uses `updateBugSchema`. Permission: `bug:update`. Returns updated bug.
- **DELETE `/bugs/:id`**: Delete bug. Permission: `bug:delete`. Returns 204. Also call `attachmentService.deleteAllForEntity('bug', id)` to clean up attachments.
- **POST `/bugs/:id/sync`**: Force sync from external. Permission: `bug:update`. Enqueues `sync_bugs` job. Returns 202 with `{ jobId }`.
- **POST `/executions/:id/bugs`**: Link bug to execution. Uses `linkBugExecutionSchema`. Permission: `bug:create`. Returns 201 with the link.
- All routes include Swagger `schema` block with `tags: ['Bugs']`.

- [ ] **Step 6: Create attachment routes**

Create `backend/src/interfaces/http/routes/attachments.ts`:
- Export `async function attachmentRoutes(app: FastifyInstance)`.
- Register `requireAuth` for all routes.
- Register `@fastify/multipart` plugin for this scope (if not already global).
- **POST `/attachments`**: Multipart upload. Accept file + metadata fields (`projectId`, `entityType`, `entityId`). Permission: `attachment:create`. Parse multipart with `request.file()`. Pass buffer, filename, mimetype, size to `attachmentService.upload()`. Returns 201 with attachment metadata.
- **GET `/attachments/:id/file`**: Serve file. Permission: `attachment:read`. For local storage: stream file using `reply.sendFile()` or `fs.createReadStream` piped to reply. Set correct `Content-Type` and `Content-Disposition` headers. For cloud storage: redirect to signed URL (302).
- **DELETE `/attachments/:id`**: Delete attachment. Permission: `attachment:delete`. Returns 204.
- Swagger `tags: ['Attachments']`.

- [ ] **Step 7: Create jobs route**

Create `backend/src/interfaces/http/routes/jobs.ts`:
- Export `async function jobRoutes(app: FastifyInstance)`.
- Register `requireAuth`.
- **GET `/jobs/:jobId`**: Get job status. Uses `jobStatusStore.getJobStatus()`. Returns `{ jobId, state, progress?, result?, error? }`. Return 404 if jobId not found in Redis.
- Swagger `tags: ['Jobs']`.

- [ ] **Step 8: Register all routes in app.ts**

Modify `backend/src/app.ts`:
- Import `executionRoutes`, `bugRoutes`, `attachmentRoutes`, `jobRoutes`.
- Register each with `prefix: '/api/v1'`:
  ```typescript
  await app.register(executionRoutes, { prefix: '/api/v1' })
  await app.register(bugRoutes, { prefix: '/api/v1' })
  await app.register(attachmentRoutes, { prefix: '/api/v1' })
  await app.register(jobRoutes, { prefix: '/api/v1' })
  ```
- Ensure `@fastify/multipart` is registered (install if not in `package.json`): `npm install @fastify/multipart`.

- [ ] **Step 9: Write route integration tests**

Create `backend/tests/routes/executions.test.ts`:
- Test GET `/api/v1/test-plans/:id/executions` returns paginated results.
- Test POST `/api/v1/cases/:id/executions` creates execution (authenticated).
- Test POST `/api/v1/executions/bulk` updates multiple executions.
- Test unauthenticated requests return 401.

Create `backend/tests/routes/bugs.test.ts`:
- Test GET `/api/v1/projects/:id/bugs` returns paginated, filtered results.
- Test POST `/api/v1/projects/:id/bugs` creates a bug.
- Test PATCH `/api/v1/bugs/:id` updates a bug.
- Test DELETE `/api/v1/bugs/:id` removes bug and its attachments.
- Test POST `/api/v1/executions/:id/bugs` links a bug.

Create `backend/tests/routes/attachments.test.ts`:
- Test POST `/api/v1/attachments` uploads a file (multipart).
- Test GET `/api/v1/attachments/:id/file` serves the file.
- Test DELETE `/api/v1/attachments/:id` removes file.
- Test upload rejects invalid MIME type with 400.
- Test upload rejects oversized file with 400.

- [ ] **Step 10: Verify**

- All routes appear in Swagger at `/docs`.
- Pagination works correctly (test with `?page=2&limit=10`).
- Filters work (test bugs by status, priority, search).
- Multipart upload works with `curl` or test framework.
- Permission guard blocks unauthorized users.

---

## Task 6: Frontend -- Test Execution View

**Files:**
- Create: `frontend/src/components/executions/ExecutionPanel.tsx`
- Create: `frontend/src/components/executions/ExecutionStatusBadge.tsx`
- Create: `frontend/src/components/executions/ExecutionHistory.tsx`
- Create: `frontend/src/components/executions/BulkExecutionToolbar.tsx`
- Create: `frontend/src/components/executions/TriggerCIButton.tsx`
- Create: `frontend/src/lib/api/executions.ts`
- Create: `frontend/src/lib/api/jobs.ts`
- Modify: `frontend/src/messages/en-US.json` (add execution keys)
- Modify: `frontend/src/messages/pt-BR.json` (add execution keys)

**Dependencies:** This component is displayed within the test plan detail page (from Plan 6). It does not own a standalone route. API client (`frontend/src/lib/api.ts`) must be extended.

**IMPORTANT:** Read `frontend/node_modules/next/dist/docs/` for Next.js 16 conventions before implementing any component.

- [ ] **Step 1: Create API client functions for executions**

Create `frontend/src/lib/api/executions.ts`:
- `getExecutionsByPlan(planId: string, params?: { page?, limit?, status?, caseId? })`: GET `/test-plans/{planId}/executions`.
- `createExecution(caseId: string, body: { testPlanId, statusId, durationMs?, notes? })`: POST `/cases/{caseId}/executions`.
- `updateExecution(id: string, body: { statusId?, durationMs?, notes? })`: PATCH `/executions/{id}`.
- `bulkUpdateExecutions(body: { executionIds: string[], statusId: string, notes?: string })`: POST `/executions/bulk`.
- `triggerCI(caseId: string, body: { testPlanId: string })`: POST `/cases/{caseId}/trigger-ci`. Returns `{ jobId }`.
- All functions use the typed fetch wrapper from `frontend/src/lib/api.ts`. Include auth token from cookie/context.

Create `frontend/src/lib/api/jobs.ts`:
- `getJobStatus(jobId: string)`: GET `/jobs/{jobId}`. Returns `{ jobId, state, progress?, result?, error? }`.
- `pollJobUntilDone(jobId: string, intervalMs?: number, maxAttempts?: number)`: Utility that polls `getJobStatus` until state is `completed` or `failed`. Returns final status. Default interval: 2000ms, max attempts: 90 (3 minutes).

- [ ] **Step 2: Create ExecutionStatusBadge component**

Create `frontend/src/components/executions/ExecutionStatusBadge.tsx`:
- Props: `status: { systemKey: string, label: string, color?: string }`.
- Render a shadcn/ui `Badge` component.
- Color mapping based on `systemKey`:
  - `pass` -> green (bg-green-100 text-green-800 / dark:bg-green-900 dark:text-green-200)
  - `fail` -> red
  - `blocked` -> yellow/amber
  - `skipped` -> gray
  - `not_run` -> slate/neutral
- If `color` is provided from the enum, use it as override.
- Use Lucide icons: `CheckCircle` for pass, `XCircle` for fail, `Ban` for blocked, `SkipForward` for skipped, `Circle` for not_run.

- [ ] **Step 3: Create ExecutionPanel component**

Create `frontend/src/components/executions/ExecutionPanel.tsx`:
- Props: `testCase: { id, title, type, priority, isAutomated }`, `testPlanId: string`, `currentExecution?: ExecutionEntity`, `onExecutionCreated: () => void`.
- Renders a card/panel for a single test case's execution within the plan view.
- Contains:
  - Test case title and metadata at the top.
  - Status selector: a row of buttons or a `Select` dropdown with all execution statuses (pass, fail, blocked, skipped). Clicking a status creates a new execution via API.
  - Notes textarea: optional notes field. Shows on expand or below status.
  - Duration input: optional numeric input for manual duration in milliseconds.
  - "Trigger CI" button (shown only if `isAutomated` is true). See TriggerCIButton component.
  - "Report Bug" button (shown when status is `fail`). Opens `CreateBugFromExecutionDialog`.
  - Current status displayed with `ExecutionStatusBadge`.
  - Expandable "History" section showing past executions for this case in this plan.
- Use `useTranslations('executions')` from next-intl for all labels.
- On status change: call `createExecution` API, then `onExecutionCreated` callback to refresh parent.

- [ ] **Step 4: Create BulkExecutionToolbar component**

Create `frontend/src/components/executions/BulkExecutionToolbar.tsx`:
- Props: `selectedIds: string[]`, `onBulkUpdate: () => void`, `onClearSelection: () => void`.
- Shown when 1+ executions are selected in the plan view.
- Contains: status dropdown (same options), "Apply" button, selection count label, "Clear" button.
- On apply: call `bulkUpdateExecutions` API with selected IDs and chosen status.
- Show loading state during API call.
- On success: call `onBulkUpdate` to refresh, show toast notification.

- [ ] **Step 5: Create ExecutionHistory component**

Create `frontend/src/components/executions/ExecutionHistory.tsx`:
- Props: `testCaseId: string`, `testPlanId: string`.
- Fetches execution history for the case (all executions in this plan for this case).
- Renders a vertical timeline or table showing: status badge, executed by (avatar + name), date/time, duration, notes excerpt.
- Sorted by `executedAt` descending (most recent first).
- Collapsible/expandable. Initially collapsed.

- [ ] **Step 6: Create TriggerCIButton component**

Create `frontend/src/components/executions/TriggerCIButton.tsx`:
- Props: `testCaseId: string`, `testPlanId: string`, `onComplete: (executionId: string) => void`.
- Button with Lucide `Play` icon and "Trigger CI" label.
- On click:
  1. Call `triggerCI` API. Get `jobId`.
  2. Switch to "Running..." state with a spinner/progress indicator.
  3. Poll job status using `pollJobUntilDone`.
  4. On completion: show success toast, call `onComplete` with the resulting execution ID.
  5. On failure: show error toast with the error message.
- Disabled while a CI job is already running for this case.

- [ ] **Step 7: Add i18n messages**

Add execution-related keys to both `frontend/src/messages/en-US.json` and `frontend/src/messages/pt-BR.json`:
- Under `"executions"` namespace: `status_pass`, `status_fail`, `status_blocked`, `status_skipped`, `status_not_run`, `trigger_ci`, `ci_running`, `ci_completed`, `ci_failed`, `notes_placeholder`, `duration_label`, `history_title`, `bulk_update`, `select_status`, `report_bug`, `no_executions`.

- [ ] **Step 8: Verify**

- ExecutionPanel renders correctly with all states.
- Status selector creates executions via API.
- Bulk toolbar appears on selection and updates multiple executions.
- CI trigger button shows progress and handles success/failure.
- History section loads and displays past executions.
- All text is translated (switch between en-US and pt-BR).
- Components work in both light and dark themes.
- Layout is responsive (mobile: stack vertically; desktop: side-by-side).

---

## Task 7: Frontend -- Bugs List Page

**Files:**
- Create: `frontend/src/app/[locale]/projects/[id]/bugs/page.tsx`
- Create: `frontend/src/app/[locale]/projects/[id]/bugs/loading.tsx`
- Create: `frontend/src/components/bugs/BugTable.tsx`
- Create: `frontend/src/components/bugs/BugFilters.tsx`
- Create: `frontend/src/components/bugs/BugStatusBadge.tsx`
- Create: `frontend/src/components/bugs/BugPriorityBadge.tsx`
- Create: `frontend/src/components/bugs/BugSeverityBadge.tsx`
- Create: `frontend/src/lib/api/bugs.ts`
- Modify: `frontend/src/messages/en-US.json` (add bug keys)
- Modify: `frontend/src/messages/pt-BR.json` (add bug keys)

**IMPORTANT:** Read `frontend/node_modules/next/dist/docs/` for Next.js 16 page conventions before implementing.

- [ ] **Step 1: Create API client functions for bugs**

Create `frontend/src/lib/api/bugs.ts`:
- `getBugsByProject(projectId: string, params?: BugFilterParams)`: GET `/projects/{projectId}/bugs`. `BugFilterParams`: `{ status?, priority?, severity?, assignedTo?, source?, search?, page?, limit? }`.
- `getBug(id: string)`: GET `/bugs/{id}`.
- `createBug(projectId: string, body: CreateBugBody)`: POST `/projects/{projectId}/bugs`.
- `updateBug(id: string, body: UpdateBugBody)`: PATCH `/bugs/{id}`.
- `deleteBug(id: string)`: DELETE `/bugs/{id}`.
- `syncBug(id: string)`: POST `/bugs/{id}/sync`. Returns `{ jobId }`.
- `linkBugToExecution(executionId: string, body: { bugId: string })`: POST `/executions/{executionId}/bugs`.

- [ ] **Step 2: Create badge components**

Create `frontend/src/components/bugs/BugStatusBadge.tsx`:
- Color mapping: `open` -> blue, `in_progress` -> yellow, `resolved` -> green, `closed` -> gray, `reopened` -> red.
- Icons: `CircleDot` for open, `Loader` for in_progress, `CheckCircle` for resolved, `XCircle` for closed, `RotateCcw` for reopened.

Create `frontend/src/components/bugs/BugPriorityBadge.tsx`:
- Color mapping: `low` -> gray, `medium` -> blue, `high` -> orange, `critical` -> red.
- Icons: Arrow icons (down, right, up, double-up) from Lucide.

Create `frontend/src/components/bugs/BugSeverityBadge.tsx`:
- Color mapping: `trivial` -> gray, `minor` -> blue, `major` -> orange, `critical` -> red, `blocker` -> dark red/purple.

All badges: accept `{ systemKey: string, label: string, color?: string }` and render shadcn `Badge` with icon + label.

- [ ] **Step 3: Create BugFilters component**

Create `frontend/src/components/bugs/BugFilters.tsx`:
- Props: `filters: BugFilterParams`, `onFilterChange: (filters: BugFilterParams) => void`, `enumValues: { statuses, priorities, severities, sources, users }`.
- Renders a row of filter controls:
  - Status: shadcn `Select` dropdown with all bug statuses. "All" option clears filter.
  - Priority: `Select` dropdown with bug priorities.
  - Severity: `Select` dropdown with bug severities.
  - Assigned To: `Select` or combobox/searchable select with project members.
  - Source: `Select` dropdown with bug sources (internal, jira, github, gitlab, linear). Show source icon next to label.
  - Search: `Input` with search icon (Lucide `Search`). Debounced (300ms) text input for title search.
- "Clear Filters" button resets all to defaults.
- Filters update URL search params for shareable/bookmarkable URLs.

- [ ] **Step 4: Create BugTable component**

Create `frontend/src/components/bugs/BugTable.tsx`:
- Props: `bugs: BugEntity[]`, `total: number`, `page: number`, `limit: number`, `onPageChange: (page) => void`.
- Renders a shadcn `Table` with columns:
  - Title (text, truncated, link to bug detail page).
  - Status (BugStatusBadge).
  - Priority (BugPriorityBadge).
  - Severity (BugSeverityBadge).
  - Assigned To (user avatar + name, or "Unassigned").
  - Source (icon for the tracker: Lucide `Github` for github, generic icons for others).
  - Created (relative date, e.g., "2 days ago").
- Clicking a row navigates to `/[locale]/bugs/[id]`.
- Pagination controls at the bottom: Previous/Next buttons, page indicator, page size selector.
- Empty state: "No bugs found" message with illustration.

- [ ] **Step 5: Create bugs list page**

Create `frontend/src/app/[locale]/projects/[id]/bugs/page.tsx`:
- Server component or client component depending on Next.js 16 patterns (check docs).
- Fetches initial bug list via API on the server side if possible, or client-side with loading state.
- Renders page header: "Bugs" title, project name breadcrumb, "New Bug" button (primary action).
- Renders `BugFilters` and `BugTable`.
- "New Bug" button opens the BugForm dialog/page (from Task 8).
- Pass URL search params to filters for server-side filtering.

Create `frontend/src/app/[locale]/projects/[id]/bugs/loading.tsx`:
- Skeleton loader matching the BugTable layout (skeleton rows, skeleton badges).

- [ ] **Step 6: Add i18n messages**

Add bug-related keys to both locale files under `"bugs"` namespace:
- `title`, `new_bug`, `no_bugs`, `status_open`, `status_in_progress`, `status_resolved`, `status_closed`, `status_reopened`, `priority_low`, `priority_medium`, `priority_high`, `priority_critical`, `severity_trivial`, `severity_minor`, `severity_major`, `severity_critical`, `severity_blocker`, `source_internal`, `source_jira`, `source_github`, `source_gitlab`, `source_linear`, `filter_status`, `filter_priority`, `filter_severity`, `filter_assigned`, `filter_source`, `search_placeholder`, `clear_filters`, `unassigned`, `delete_confirm`, `delete_success`.

- [ ] **Step 7: Verify**

- Page loads at `/en-US/projects/{id}/bugs` with correct data.
- Filters narrow down results correctly.
- Search works with debounce.
- Pagination navigates between pages.
- Badges display correct colors and icons.
- "New Bug" button is present and functional.
- Loading skeleton shows while data is fetching.
- Responsive layout: table scrolls horizontally on mobile, or switches to card layout.
- Dark/light theme works correctly.
- Both locales display correct translations.

---

## Task 8: Frontend -- Bug Detail + Create/Edit

**Files:**
- Create: `frontend/src/app/[locale]/bugs/[id]/page.tsx`
- Create: `frontend/src/app/[locale]/bugs/[id]/loading.tsx`
- Create: `frontend/src/components/bugs/BugDetail.tsx`
- Create: `frontend/src/components/bugs/BugForm.tsx`
- Create: `frontend/src/components/bugs/CreateBugFromExecutionDialog.tsx`
- Create: `frontend/src/components/bugs/LinkBugDialog.tsx`

**Dependencies:** API client from Task 7. Badge components from Task 7. Attachment components from Task 9 (can stub initially). Execution context from Task 6.

- [ ] **Step 1: Create BugDetail component**

Create `frontend/src/components/bugs/BugDetail.tsx`:
- Props: `bug: BugEntity` (full detail with linked executions).
- Layout: Two-column on desktop, single column on mobile.
- Left column (main content):
  - Title (large heading, editable inline or via edit button).
  - Description (rendered as text, or rich text if markdown). Edit button opens form.
  - Linked Executions section: table/list of linked test executions with case title, status badge, executed date, link to execution. "Link Execution" button.
  - Attachments section: `AttachmentGallery` component (Task 9).
- Right column (sidebar):
  - Status (BugStatusBadge + dropdown to change).
  - Priority (BugPriorityBadge + dropdown to change).
  - Severity (BugSeverityBadge + dropdown to change).
  - Assigned To (avatar + name, click to reassign via user search).
  - Source (icon + label). If external: show external link and "Sync" button.
  - Reported By (avatar + name, read-only).
  - Dates: Created, Updated, Last Synced.
- Sidebar field changes call `updateBug` API immediately (inline editing pattern).
- Show toast on successful update.
- Delete button (with confirmation dialog) in the header actions.

- [ ] **Step 2: Create BugForm component**

Create `frontend/src/components/bugs/BugForm.tsx`:
- Props: `projectId: string`, `initialData?: Partial<BugEntity>`, `onSubmit: (data) => void`, `onCancel: () => void`, `mode: 'create' | 'edit'`.
- Form fields:
  - Title: `Input`, required, max 500 chars.
  - Description: `Textarea`, optional, max 10000 chars. Consider using a simple markdown-capable textarea.
  - Status: `Select` dropdown with bug status options. Default to `open` on create.
  - Priority: `Select` dropdown with bug priority options. Default to `medium` on create.
  - Severity: `Select` dropdown with bug severity options. Default to `minor` on create.
  - Source: `Select` dropdown with bug source options. Default to `internal` on create.
  - Assigned To: Searchable `Combobox` (shadcn) with project members. Optional.
- Form validation using Zod (client-side, matching backend schemas).
- Submit button: "Create Bug" or "Save Changes" depending on mode.
- Cancel button.
- Loading state on submit.

- [ ] **Step 3: Create bug detail page**

Create `frontend/src/app/[locale]/bugs/[id]/page.tsx`:
- Fetch bug detail via `getBug(id)` API call.
- Render breadcrumbs: Project name > Bugs > Bug title.
- Render `BugDetail` component.
- Handle 404: show "Bug not found" page.

Create `frontend/src/app/[locale]/bugs/[id]/loading.tsx`:
- Skeleton matching BugDetail layout.

- [ ] **Step 4: Create CreateBugFromExecutionDialog component**

Create `frontend/src/components/bugs/CreateBugFromExecutionDialog.tsx`:
- Props: `executionId: string`, `testCaseTitle: string`, `testPlanTitle: string`, `projectId: string`, `isOpen: boolean`, `onClose: () => void`, `onCreated: (bugId: string) => void`.
- Uses shadcn `Dialog` component.
- Pre-fills:
  - Title: `"Bug: {testCaseTitle} - Failed"` (editable).
  - Description: `"Found during execution of test case '{testCaseTitle}' in plan '{testPlanTitle}'.\n\nSteps to reproduce:\n1. \n\nExpected result:\n\nActual result:\n"`.
  - Source: `internal` (default).
  - Status: `open`.
  - Priority: `medium`.
  - Severity: `major`.
- On submit:
  1. Create bug via `createBug` API.
  2. Link bug to execution via `linkBugToExecution` API.
  3. Call `onCreated` with new bug ID.
  4. Show success toast.
  5. Close dialog.

- [ ] **Step 5: Create external sync UI**

Within `BugDetail`, when the bug source is not `internal`:
- Show "External" badge with source icon (GitHub, Jira, etc.).
- Show "View in {source}" link to `externalUrl` (opens in new tab).
- Show "Sync" button with Lucide `RefreshCw` icon.
- On sync click:
  1. Call `syncBug(bugId)` API. Get `jobId`.
  2. Show spinner and "Syncing..." text.
  3. Poll job status using `pollJobUntilDone`.
  4. On complete: refresh bug data, show success toast.
  5. On failure: show error toast.
- Show "Last synced: {relative date}" next to sync button.

- [ ] **Step 6: Verify**

- Bug detail page loads at `/en-US/bugs/{id}`.
- All fields display correctly.
- Inline status/priority/severity changes work.
- Edit form opens, validates, and submits.
- CreateBugFromExecutionDialog pre-fills correctly and links to execution.
- External sync button works with progress indication.
- Delete confirmation works and redirects to bugs list.
- i18n, dark/light theme, responsive layout all working.

---

## Task 9: Frontend -- Attachments

**Files:**
- Create: `frontend/src/components/attachments/AttachmentUploader.tsx`
- Create: `frontend/src/components/attachments/AttachmentGallery.tsx`
- Create: `frontend/src/components/attachments/AttachmentThumbnail.tsx`
- Create: `frontend/src/components/attachments/VideoPlayer.tsx`
- Create: `frontend/src/lib/api/attachments.ts`
- Modify: `frontend/src/messages/en-US.json` (add attachment keys)
- Modify: `frontend/src/messages/pt-BR.json` (add attachment keys)

- [ ] **Step 1: Create API client for attachments**

Create `frontend/src/lib/api/attachments.ts`:
- `getAttachmentsByEntity(entityType: string, entityId: string)`: Fetch attachments list. Uses a query param approach or derive from the entity's API response.
- `uploadAttachment(projectId: string, entityType: string, entityId: string, file: File)`: POST `/attachments` as multipart `FormData`. Include `projectId`, `entityType`, `entityId`, and the file. Return attachment metadata.
- `getAttachmentUrl(id: string)`: Return the URL string for `/attachments/{id}/file` (with auth token as query param or rely on cookie).
- `deleteAttachment(id: string)`: DELETE `/attachments/{id}`.

- [ ] **Step 2: Create AttachmentUploader component**

Create `frontend/src/components/attachments/AttachmentUploader.tsx`:
- Props: `projectId: string`, `entityType: string`, `entityId: string`, `onUploaded: (attachment) => void`.
- Drag-and-drop zone using HTML5 drag events:
  - `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` handlers.
  - Visual feedback: dashed border, highlight on drag over.
  - Drop zone text: "Drag files here or click to upload".
- Also includes a hidden `<input type="file" multiple>` triggered by clicking the zone.
- Accept attribute: `image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,application/pdf,text/plain,text/csv`.
- On file selection/drop:
  - Validate file type (client-side check against allowed types).
  - Validate file size (max 50 MB).
  - Show upload progress indicator per file.
  - Call `uploadAttachment` for each file.
  - On success: call `onUploaded` with the new attachment.
  - On error: show error message inline.
- Support multiple file upload (queue uploads, show progress for each).
- Use Lucide `Upload` icon.

- [ ] **Step 3: Create AttachmentThumbnail component**

Create `frontend/src/components/attachments/AttachmentThumbnail.tsx`:
- Props: `attachment: AttachmentEntity`, `onDelete: (id) => void`.
- For images (`image/*`): Render `<img>` tag with the attachment URL as `src`. Show as thumbnail (fixed size, object-cover). Click opens full-size in a lightbox or new tab.
- For videos (`video/*`): Render a play icon overlay on a generic video thumbnail. Click opens `VideoPlayer`.
- For PDFs: Show PDF icon (Lucide `FileText`). Click opens in new tab.
- For other files: Show generic file icon (Lucide `File`). Click downloads.
- Overlay with file name (truncated) and file size.
- Delete button (Lucide `Trash2` icon) in top-right corner. Visible on hover. Confirmation before delete.
- Loading skeleton while thumbnail loads.

- [ ] **Step 4: Create VideoPlayer component**

Create `frontend/src/components/attachments/VideoPlayer.tsx`:
- Props: `url: string`, `fileName: string`, `isOpen: boolean`, `onClose: () => void`.
- Uses shadcn `Dialog` for modal presentation.
- Renders `<video>` element with `controls`, `src`, and `preload="metadata"`.
- Supports mp4 and webm.
- Close button to dismiss.
- Responsive: video scales to fit dialog width.

- [ ] **Step 5: Create AttachmentGallery component**

Create `frontend/src/components/attachments/AttachmentGallery.tsx`:
- Props: `projectId: string`, `entityType: string`, `entityId: string`, `canUpload: boolean`, `canDelete: boolean`.
- Fetches attachments for the entity on mount.
- Renders a grid of `AttachmentThumbnail` components (responsive grid: 2 cols mobile, 3-4 cols desktop).
- Includes `AttachmentUploader` at the top (or as a card in the grid) if `canUpload` is true.
- On upload complete: refetch and add to grid.
- On delete: remove from grid, refetch.
- Empty state: "No attachments" with upload prompt.
- Show total count and combined file size.

- [ ] **Step 6: Add i18n messages**

Add to both locale files under `"attachments"` namespace:
- `upload`, `drag_drop`, `uploading`, `upload_success`, `upload_error`, `delete_confirm`, `delete_success`, `no_attachments`, `file_too_large`, `invalid_file_type`, `total_files`, `total_size`.

- [ ] **Step 7: Verify**

- Drag-and-drop upload works in all major browsers.
- File picker upload works.
- Image thumbnails render correctly.
- Video player opens and plays video.
- PDF and other files open/download correctly.
- Delete with confirmation works.
- Upload rejects invalid file types and oversized files (client-side).
- Gallery renders responsively.
- Dark/light theme compatibility.
- i18n translations display correctly.

---

## Task 10: Frontend -- Bug-Execution Linking

**Files:**
- Create: `frontend/src/components/bugs/LinkBugDialog.tsx`
- Modify: `frontend/src/components/executions/ExecutionPanel.tsx` (add "Link Bug" and "Report Bug" buttons)
- Modify: `frontend/src/components/bugs/BugDetail.tsx` (add "Linked Executions" section)

**Dependencies:** API clients from Tasks 6 and 7. `CreateBugFromExecutionDialog` from Task 8.

- [ ] **Step 1: Create LinkBugDialog component**

Create `frontend/src/components/bugs/LinkBugDialog.tsx`:
- Props: `executionId: string`, `projectId: string`, `isOpen: boolean`, `onClose: () => void`, `onLinked: (bugId: string) => void`.
- Uses shadcn `Dialog`.
- Contains a searchable list of existing bugs for the project:
  - Search input at top (filters bugs by title as user types, debounced).
  - List of bugs below: title, status badge, priority badge. Scrollable, max ~5-6 visible.
  - Click a bug to select it. Selected bug is highlighted.
  - "Link" button at bottom to confirm.
- On link:
  1. Call `linkBugToExecution(executionId, { bugId })` API.
  2. Show success toast.
  3. Call `onLinked(bugId)`.
  4. Close dialog.
- Also include a "Create New Bug" button that opens `CreateBugFromExecutionDialog` instead.

- [ ] **Step 2: Add linking buttons to ExecutionPanel**

Modify `frontend/src/components/executions/ExecutionPanel.tsx`:
- Add a "Report Bug" button (Lucide `Bug` icon) that appears when execution status is `fail`. Opens `CreateBugFromExecutionDialog`.
- Add a "Link Bug" button (Lucide `Link` icon) that opens `LinkBugDialog`. Always visible in the execution panel actions.
- Show linked bugs count badge on the panel if there are linked bugs.
- Show a small list of linked bug titles below the execution (collapsible).

- [ ] **Step 3: Add linked executions section to BugDetail**

Modify `frontend/src/components/bugs/BugDetail.tsx`:
- In the main content area, add a "Linked Executions" section (below description, above attachments).
- Render a table/list:
  - Columns: Test Case Title (link to case), Execution Status (badge), Executed By (avatar), Executed At (relative date).
  - "Unlink" action per row (with confirmation).
- "Link Execution" button opens a reverse search dialog (search executions to link). Reuse a pattern similar to `LinkBugDialog` but for executions.
- If no linked executions: show "No linked executions" empty state.

- [ ] **Step 4: Add i18n messages**

Add to locale files:
- Under `"bugs"`: `link_execution`, `linked_executions`, `unlink_execution`, `no_linked_executions`, `link_bug`, `report_bug`, `search_bugs`, `create_new_bug`.
- Under `"executions"`: `linked_bugs`, `link_bug`, `report_bug`.

- [ ] **Step 5: Verify**

- From execution panel: "Link Bug" opens dialog, search works, linking works.
- From execution panel: "Report Bug" on failed execution opens create dialog with pre-filled data, creates bug and links it.
- From bug detail: "Linked Executions" section shows linked test results.
- From bug detail: Can unlink an execution.
- Bidirectional: linking from either side shows up on both views.
- No duplicate links (API handles gracefully, UI prevents re-linking).

---

## Task 11: Verification

**Goal:** End-to-end verification that all features work together correctly.

- [ ] **Step 1: Manual execution flow**

1. Navigate to a test plan detail page.
2. For a test case, set status to "Pass" via the execution panel.
3. Verify the execution is created and status badge updates to green.
4. Add notes and duration to the execution.
5. Verify the execution appears in the case's history.
6. Use bulk selection: select 3 cases, set status to "Fail".
7. Verify all 3 update correctly.
8. Verify the plan's status aggregation summary updates (e.g., "3 fail, 1 pass").

- [ ] **Step 2: CI trigger flow**

1. For an automated test case, click "Trigger CI".
2. Verify a job is enqueued (check BullMQ/Redis).
3. Verify the button shows "Running..." with progress.
4. Verify `GET /jobs/:jobId` returns the job status.
5. When the CI job completes (or use mock), verify an execution record is created automatically.
6. Verify the UI updates to show the new execution.

- [ ] **Step 3: Bug CRUD flow**

1. Navigate to `/en-US/projects/{id}/bugs`.
2. Click "New Bug", fill form, submit. Verify bug appears in list.
3. Apply filters: filter by status "open", verify results narrow down.
4. Search by title, verify results match.
5. Click a bug to open detail page.
6. Edit title and description, verify changes persist.
7. Change status/priority/severity via sidebar, verify instant update.
8. Delete a bug, verify it disappears from list and redirects.

- [ ] **Step 4: Attachment flow**

1. On a bug detail page, drag-and-drop an image file.
2. Verify upload progress shows, then thumbnail appears.
3. Click thumbnail to view full-size image.
4. Upload a video file. Verify video player works.
5. Upload a PDF. Verify it opens in new tab on click.
6. Delete an attachment. Verify confirmation dialog, then removal.
7. Verify attachments also work on test execution detail.

- [ ] **Step 5: Bug-execution linking flow**

1. On a failed execution, click "Report Bug".
2. Verify dialog pre-fills title and description.
3. Create the bug. Verify it is created AND linked to the execution.
4. Navigate to the bug detail page. Verify the execution appears in "Linked Executions".
5. From execution panel, click "Link Bug". Search for an existing bug. Link it.
6. Verify the link appears on both the execution and the bug detail.
7. Unlink from bug detail. Verify it is removed.

- [ ] **Step 6: External bug sync flow**

1. Create a bug with source = "github" (requires integration configured on the project).
2. Verify the system attempts to create the bug on GitHub (via adapter).
3. On bug detail, click "Sync". Verify job is enqueued and progress indicator shows.
4. Verify local bug data updates after sync completes.
5. Verify "Last synced" timestamp updates.

- [ ] **Step 7: Cross-cutting concerns**

1. Switch locale from en-US to pt-BR. Verify all labels/text translate correctly.
2. Toggle dark/light theme. Verify all components render correctly in both.
3. Test on mobile viewport (375px): verify responsive layout works.
4. Test on tablet viewport (768px): verify intermediate layout.
5. Test with unauthorized user: verify 401/403 responses are handled gracefully.
6. Test pagination edge cases: empty list, single page, last page.
7. Verify Swagger docs at `/docs` show all new endpoints with correct schemas.

---

## Key Patterns and Conventions

**Backend service instantiation:** Services are instantiated inside route plugin functions (see `authRoutes` in `backend/src/interfaces/http/routes/auth.ts` for the pattern). Repositories are created in the route plugin and injected into services.

**Permission guard usage:** Apply as `preHandler` on each route:
```typescript
{ preHandler: [requireAuth, permissionGuard('execution', 'create')] }
```

**Error handling:** Throw typed errors from services. Map in route handlers:
- `NotFoundError` -> 404
- `ValidationError` -> 400
- `ForbiddenError` -> 403

**Prisma imports:** Use `import { prisma } from '../../infrastructure/database/prisma.js'` (note the `.js` extension for ESM).

**Frontend API calls:** Use the typed fetch wrapper from `frontend/src/lib/api.ts`. Pass auth token from cookies or auth context.

**i18n:** Use `useTranslations('namespace')` hook from `next-intl` in client components. For server components, check Next.js 16 docs for the correct pattern.

**shadcn/ui components:** Use existing installed components. If a new component is needed (e.g., Combobox, Dialog), install via `npx shadcn@latest add <component>`.

**BullMQ connection:** Reuse Redis connection config from `config.REDIS_URL`. Parse URL into host/port/password for ioredis.

**File storage path convention:** `{projectId}/{entityType}/{entityId}/{uuid}-{sanitizedFileName}` ensures uniqueness and organization.
