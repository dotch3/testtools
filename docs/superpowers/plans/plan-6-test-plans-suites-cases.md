# Plan 6 — Test Plans + Suites + Cases (CRUD, Nestable Tree, CSV/Excel Import)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full CRUD for Test Plans, Test Suites (nestable tree with drag-reorder), and Test Cases (with JSONB steps). Include CSV/Excel import for bulk test case creation. Frontend includes plan list, plan detail with suite tree + case panel, case editor with step builder, and import wizard.

**Architecture:** Clean architecture — domain entities and repository interfaces in `domain/`, service layer in `services/`, Prisma repository implementations in `infrastructure/repositories/`, Fastify route handlers in `interfaces/http/routes/`. Frontend uses Next.js 16 App Router with `[locale]` segment, shadcn/ui components, and next-intl for i18n.

**RBAC:** admin + lead can create/edit/delete test plans and import test cases. admin + lead + tester can create/edit/delete test cases and suites. All authenticated users can read.

**IMPORTANT:** Next.js 16 has breaking changes. Before writing any frontend code, read the relevant docs in `frontend/node_modules/next/dist/docs/` and follow AGENTS.md instructions.

---

## File Map

```
backend/
  src/
    domain/
      entities/
        TestPlan.ts
        TestSuite.ts
        TestCase.ts
      interfaces/
        ITestPlanRepository.ts
        ITestSuiteRepository.ts
        ITestCaseRepository.ts
    services/
      TestPlanService.ts
      TestSuiteService.ts
      TestCaseService.ts
      ImportService.ts
    infrastructure/
      repositories/
        PrismaTestPlanRepository.ts
        PrismaTestSuiteRepository.ts
        PrismaTestCaseRepository.ts
    interfaces/
      http/
        routes/
          testPlans.ts
          testSuites.ts
          testCases.ts
        schemas/
          testPlanSchemas.ts
          testSuiteSchemas.ts
          testCaseSchemas.ts
  tests/
    services/
      TestPlanService.test.ts
      TestSuiteService.test.ts
      TestCaseService.test.ts
      ImportService.test.ts
    routes/
      testPlans.test.ts
      testSuites.test.ts
      testCases.test.ts

frontend/
  src/
    app/[locale]/
      projects/[id]/
        test-plans/
          page.tsx               <- test plans list
      test-plans/[id]/
        page.tsx                 <- test plan detail (suite tree + cases)
    components/
      test-plans/
        TestPlanCard.tsx
        TestPlanForm.tsx
        StatusBadge.tsx
        StatusTransitionButton.tsx
      test-suites/
        SuiteTree.tsx
        SuiteTreeNode.tsx
        SuiteForm.tsx
      test-cases/
        CaseTable.tsx
        CaseDetail.tsx
        CaseForm.tsx
        StepEditor.tsx
        PriorityBadge.tsx
        TypeBadge.tsx
      import/
        ImportDialog.tsx
        ImportPreview.tsx
        ColumnMapper.tsx
    lib/
      api/
        testPlans.ts
        testSuites.ts
        testCases.ts
    messages/
      en-US.json               <- add testPlans, testSuites, testCases sections
      pt-BR.json               <- add testPlans, testSuites, testCases sections
```

---

## Task 1: Domain Entities + Repository Interfaces

**Files:**
- Create: `backend/src/domain/entities/TestPlan.ts`
- Create: `backend/src/domain/entities/TestSuite.ts`
- Create: `backend/src/domain/entities/TestCase.ts`
- Create: `backend/src/domain/interfaces/ITestPlanRepository.ts`
- Create: `backend/src/domain/interfaces/ITestSuiteRepository.ts`
- Create: `backend/src/domain/interfaces/ITestCaseRepository.ts`

### Steps

- [ ] **Step 1: Create TestPlan entity**

  File: `backend/src/domain/entities/TestPlan.ts`

  Define a TypeScript interface (not a class) representing the domain entity:
  ```typescript
  export interface TestPlan {
    id: string
    projectId: string
    name: string
    description: string | null
    statusId: string
    createdById: string
    startDate: Date | null
    endDate: Date | null
    createdAt: Date
    updatedAt: Date
  }

  export interface TestPlanWithRelations extends TestPlan {
    status: { id: string; value: string; label: string; color: string | null }
    createdBy: { id: string; name: string | null; email: string }
    _count?: { suites: number; cases: number }
  }

  export interface CreateTestPlanInput {
    projectId: string
    name: string
    description?: string
    statusId: string
    createdById: string
    startDate?: Date
    endDate?: Date
  }

  export interface UpdateTestPlanInput {
    name?: string
    description?: string
    statusId?: string
    startDate?: Date | null
    endDate?: Date | null
  }
  ```

- [ ] **Step 2: Create TestSuite entity**

  File: `backend/src/domain/entities/TestSuite.ts`

  Define interfaces:
  ```typescript
  export interface TestSuite {
    id: string
    testPlanId: string
    parentSuiteId: string | null
    name: string
    description: string | null
    orderIndex: number
    createdById: string
    createdAt: Date
    updatedAt: Date
  }

  export interface TestSuiteTreeNode extends TestSuite {
    children: TestSuiteTreeNode[]
    _count?: { cases: number }
  }

  export interface CreateTestSuiteInput {
    testPlanId: string
    parentSuiteId?: string
    name: string
    description?: string
    orderIndex?: number
    createdById: string
  }

  export interface UpdateTestSuiteInput {
    name?: string
    description?: string
    parentSuiteId?: string | null
    orderIndex?: number
  }
  ```

- [ ] **Step 3: Create TestCase entity**

  File: `backend/src/domain/entities/TestCase.ts`

  Define interfaces including the JSONB steps type:
  ```typescript
  export interface TestStep {
    order: number
    action: string
    expectedResult: string
  }

  export interface TestCase {
    id: string
    suiteId: string
    title: string
    description: string | null
    preconditions: string | null
    steps: TestStep[]
    priorityId: string
    typeId: string
    automationScriptRef: string | null
    createdById: string
    createdAt: Date
    updatedAt: Date
  }

  export interface TestCaseWithRelations extends TestCase {
    priority: { id: string; value: string; label: string; color: string | null }
    type: { id: string; value: string; label: string; color: string | null }
    createdBy: { id: string; name: string | null; email: string }
  }

  export interface CreateTestCaseInput {
    suiteId: string
    title: string
    description?: string
    preconditions?: string
    steps?: TestStep[]
    priorityId: string
    typeId: string
    automationScriptRef?: string
    createdById: string
  }

  export interface UpdateTestCaseInput {
    title?: string
    description?: string
    preconditions?: string
    steps?: TestStep[]
    priorityId?: string
    typeId?: string
    automationScriptRef?: string | null
    suiteId?: string
  }
  ```

- [ ] **Step 4: Create ITestPlanRepository interface**

  File: `backend/src/domain/interfaces/ITestPlanRepository.ts`

  ```typescript
  export interface ITestPlanRepository {
    findById(id: string): Promise<TestPlanWithRelations | null>
    findByProjectId(projectId: string, options: { status?: string; page: number; limit: number }): Promise<{ data: TestPlanWithRelations[]; total: number }>
    create(input: CreateTestPlanInput): Promise<TestPlan>
    update(id: string, input: UpdateTestPlanInput): Promise<TestPlan>
    delete(id: string): Promise<void>
  }
  ```

  Import types from `../entities/TestPlan.ts`.

- [ ] **Step 5: Create ITestSuiteRepository interface**

  File: `backend/src/domain/interfaces/ITestSuiteRepository.ts`

  ```typescript
  export interface ITestSuiteRepository {
    findById(id: string): Promise<TestSuite | null>
    findByTestPlanId(testPlanId: string): Promise<TestSuiteTreeNode[]>
    create(input: CreateTestSuiteInput): Promise<TestSuite>
    update(id: string, input: UpdateTestSuiteInput): Promise<TestSuite>
    delete(id: string): Promise<void>
    reorder(suiteIds: { id: string; orderIndex: number }[]): Promise<void>
    getMaxOrderIndex(testPlanId: string, parentSuiteId: string | null): Promise<number>
  }
  ```

- [ ] **Step 6: Create ITestCaseRepository interface**

  File: `backend/src/domain/interfaces/ITestCaseRepository.ts`

  ```typescript
  export interface ITestCaseRepository {
    findById(id: string): Promise<TestCaseWithRelations | null>
    findBySuiteId(suiteId: string, options: { page: number; limit: number; priorityId?: string; typeId?: string; search?: string }): Promise<{ data: TestCaseWithRelations[]; total: number }>
    create(input: CreateTestCaseInput): Promise<TestCase>
    createMany(inputs: CreateTestCaseInput[]): Promise<number>
    update(id: string, input: UpdateTestCaseInput): Promise<TestCase>
    delete(id: string): Promise<void>
    duplicate(id: string, createdById: string): Promise<TestCase>
    countByTestPlanId(testPlanId: string): Promise<number>
  }
  ```

### Verification
- All entity interfaces match the Prisma schema field names and types exactly.
- Repository interfaces cover all operations needed by the service layer.
- No Prisma imports in domain layer (clean architecture boundary).

---

## Task 2: Prisma Repository Implementations

**Files:**
- Create: `backend/src/infrastructure/repositories/PrismaTestPlanRepository.ts`
- Create: `backend/src/infrastructure/repositories/PrismaTestSuiteRepository.ts`
- Create: `backend/src/infrastructure/repositories/PrismaTestCaseRepository.ts`

### Steps

- [ ] **Step 1: Create PrismaTestPlanRepository**

  File: `backend/src/infrastructure/repositories/PrismaTestPlanRepository.ts`

  - Import `prisma` from `../database/prisma.js` (follow existing pattern from `AuthService.ts`).
  - Implement `ITestPlanRepository`.
  - `findById`: use `prisma.testPlan.findUnique` with `include: { status: true, createdBy: { select: { id, name, email } } }`. Also include `_count: { select: { suites: true } }` and a raw count of all cases across all suites.
  - `findByProjectId`: use `prisma.testPlan.findMany` with `where`, `skip`, `take`, `orderBy: { createdAt: 'desc' }`. Include status relation. Use `prisma.testPlan.count` for total.
  - `create`: use `prisma.testPlan.create`.
  - `update`: use `prisma.testPlan.update`.
  - `delete`: use `prisma.testPlan.delete` (cascade will handle suites/cases via schema).

- [ ] **Step 2: Create PrismaTestSuiteRepository**

  File: `backend/src/infrastructure/repositories/PrismaTestSuiteRepository.ts`

  - `findByTestPlanId`: fetch all suites for the test plan in one query (flat list with `orderBy: orderIndex`), then build the tree in-memory by matching `parentSuiteId`. Return root nodes with nested `children`. Include `_count: { select: { cases: true } }`.
  - `reorder`: use `prisma.$transaction` with multiple `prisma.testSuite.update` calls to update `orderIndex` for each suite in the array.
  - `getMaxOrderIndex`: use `prisma.testSuite.aggregate` with `_max: { orderIndex: true }` filtered by `testPlanId` and `parentSuiteId`.
  - `create`: auto-set `orderIndex` to `getMaxOrderIndex() + 1` if not provided.
  - `delete`: cascade is handled by Prisma schema. Before deleting, check if suite has children and either block or recursively delete (cascade handles it).

- [ ] **Step 3: Create PrismaTestCaseRepository**

  File: `backend/src/infrastructure/repositories/PrismaTestCaseRepository.ts`

  - `findBySuiteId`: paginate with `skip`/`take`, filter by `priorityId`, `typeId`, and `title` (case-insensitive contains for search). Include `priority`, `type`, `createdBy` relations.
  - `createMany`: use `prisma.testCase.createMany` for bulk import. Note: `createMany` does not support relations, so ensure `priorityId` and `typeId` are resolved before calling.
  - `duplicate`: fetch original by id, create new with same fields but new id, append " (copy)" to title.
  - `countByTestPlanId`: use a raw query or join through suites: `prisma.testCase.count({ where: { suite: { testPlanId } } })`.

### Verification
- Each repository method correctly translates domain types to/from Prisma types.
- Tree building in `PrismaTestSuiteRepository.findByTestPlanId` handles multiple nesting levels.
- Pagination returns both `data` and `total`.

---

## Task 3: Services

**Files:**
- Create: `backend/src/services/TestPlanService.ts`
- Create: `backend/src/services/TestSuiteService.ts`
- Create: `backend/src/services/TestCaseService.ts`
- Create: `backend/src/services/ImportService.ts`

### Steps

- [ ] **Step 1: Create TestPlanService**

  File: `backend/src/services/TestPlanService.ts`

  - Constructor takes `ITestPlanRepository`.
  - `create(input)`: look up the "draft" status EnumValue by querying `prisma.enumValue.findFirst({ where: { enumType: { name: 'test_plan_status' }, systemKey: 'draft' } })`. Set `statusId` to draft. Call `repository.create()`.
  - `update(id, input)`: call `repository.update()`.
  - `transitionStatus(id, targetSystemKey)`: enforce allowed transitions:
    - `draft` -> `active`
    - `active` -> `completed`
    - `completed` -> `archived`
    - `archived` -> `active` (reopen)
    Fetch current plan, resolve current status systemKey, validate transition, resolve target statusId, update.
  - `getById(id)`: call `repository.findById()`, throw 404 if not found.
  - `listByProject(projectId, options)`: call `repository.findByProjectId()`.
  - `delete(id)`: call `repository.delete()`.

- [ ] **Step 2: Create TestSuiteService**

  File: `backend/src/services/TestSuiteService.ts`

  - Constructor takes `ITestSuiteRepository`.
  - `create(input)`: call `repository.create()`.
  - `update(id, input)`: call `repository.update()`.
  - `delete(id)`: call `repository.delete()`.
  - `getTreeByTestPlan(testPlanId)`: call `repository.findByTestPlanId()`.
  - `reorder(items: { id: string; orderIndex: number }[])`: call `repository.reorder()`.
  - `moveSuite(suiteId, newParentSuiteId)`: validate that the new parent is not a descendant of the suite being moved (prevent circular nesting). Update `parentSuiteId` via `repository.update()`.

- [ ] **Step 3: Create TestCaseService**

  File: `backend/src/services/TestCaseService.ts`

  - Constructor takes `ITestCaseRepository`.
  - `create(input)`: validate that `steps` array has sequential `order` values. Call `repository.create()`.
  - `update(id, input)`: re-number `steps` order values if provided. Call `repository.update()`.
  - `delete(id)`: call `repository.delete()`.
  - `getById(id)`: call `repository.findById()`, throw 404 if not found.
  - `listBySuite(suiteId, options)`: call `repository.findBySuiteId()`.
  - `duplicate(id, userId)`: call `repository.duplicate()`.
  - `bulkCreate(inputs)`: call `repository.createMany()`.

- [ ] **Step 4: Create ImportService**

  File: `backend/src/services/ImportService.ts`

  - Install dependency: `npm install xlsx` in backend (for both CSV and XLSX parsing).
  - `parseFile(buffer: Buffer, mimeType: string)`: detect CSV vs XLSX by mime type. Use `xlsx` library to parse into array of row objects. Return `{ headers: string[], rows: Record<string, string>[] }`.
  - `validateAndMap(rows, columnMapping, suiteId, createdById)`: take the parsed rows and a column mapping object (e.g., `{ title: 'Test Name', priority: 'Priority', ... }`). For each row:
    - Extract mapped fields.
    - Validate required fields: `title` is required.
    - Resolve `priorityId` from enum value label (case-insensitive lookup against `enum_values` where `enumType.name = 'test_priority'`).
    - Resolve `typeId` from enum value label (case-insensitive lookup against `enum_values` where `enumType.name = 'test_type'`).
    - If priority/type not found, use defaults (the EnumValue with `isDefault: true`).
    - Parse steps if provided (expect format: "Step 1: action | expected; Step 2: action | expected" or similar).
    - Collect errors per row.
  - Return `{ valid: CreateTestCaseInput[], errors: { row: number; message: string }[] }`.
  - `import(buffer, mimeType, columnMapping, suiteId, createdById)`: orchestrate parse -> validate -> bulkCreate. Return `{ created: number; failed: number; errors: ... }`.

### Verification
- Status transitions are enforced (e.g., cannot go from draft to completed directly).
- Move suite prevents circular references.
- Import handles both CSV and XLSX files.
- Import gracefully reports per-row errors without aborting the entire batch.

---

## Task 4: Backend Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/testPlans.ts`
- Create: `backend/src/interfaces/http/routes/testSuites.ts`
- Create: `backend/src/interfaces/http/routes/testCases.ts`
- Create: `backend/src/interfaces/http/schemas/testPlanSchemas.ts`
- Create: `backend/src/interfaces/http/schemas/testSuiteSchemas.ts`
- Create: `backend/src/interfaces/http/schemas/testCaseSchemas.ts`
- Modify: `backend/src/app.ts` (register new routes)

### Steps

- [ ] **Step 1: Create Zod validation schemas for test plans**

  File: `backend/src/interfaces/http/schemas/testPlanSchemas.ts`

  Define schemas using JSON Schema format (matching existing pattern in `admin/users.ts`):
  - `createTestPlanBodySchema`: `{ name: string (required, minLength 1, maxLength 255), description?: string, startDate?: string (date format), endDate?: string (date format) }`
  - `updateTestPlanBodySchema`: all fields optional
  - `testPlanParamsSchema`: `{ id: string (uuid) }`
  - `projectParamsSchema`: `{ id: string (uuid) }`
  - `listTestPlansQuerySchema`: `{ status?: string, page?: number (default 1), limit?: number (default 20, max 100) }`
  - `transitionBodySchema`: `{ status: string (enum: active, completed, archived) }`

  **Pattern note:** The existing codebase uses inline JSON Schema objects in the route `schema` property (see `admin/users.ts`). Follow the same approach but extract schemas to separate files for reuse.

- [ ] **Step 2: Create Zod validation schemas for test suites**

  File: `backend/src/interfaces/http/schemas/testSuiteSchemas.ts`

  - `createTestSuiteBodySchema`: `{ name: string (required), description?: string, parentSuiteId?: string (uuid) }`
  - `updateTestSuiteBodySchema`: `{ name?: string, description?: string, parentSuiteId?: string | null }`
  - `reorderBodySchema`: `{ items: [{ id: string, orderIndex: number }] }`
  - `suiteParamsSchema`: `{ id: string (uuid) }`

- [ ] **Step 3: Create Zod validation schemas for test cases**

  File: `backend/src/interfaces/http/schemas/testCaseSchemas.ts`

  - `createTestCaseBodySchema`: `{ title: string (required), description?: string, preconditions?: string, steps?: [{ order: number, action: string, expectedResult: string }], priorityId: string (required), typeId: string (required), automationScriptRef?: string }`
  - `updateTestCaseBodySchema`: all fields optional
  - `caseParamsSchema`: `{ id: string (uuid) }`
  - `listCasesQuerySchema`: `{ page?: number, limit?: number, priorityId?: string, typeId?: string, search?: string }`

- [ ] **Step 4: Create test plan routes**

  File: `backend/src/interfaces/http/routes/testPlans.ts`

  Export `async function testPlanRoutes(app: FastifyInstance)`.

  Instantiate service: create `PrismaTestPlanRepository`, pass to `TestPlanService`.

  Routes (follow existing pattern from `admin/users.ts` for structure):

  ```
  GET /projects/:id/test-plans
    preHandler: [requireAuth()]
    schema: { tags: ['Test Plans'], summary, querystring, params }
    handler: call testPlanService.listByProject(id, { status, page, limit })
    return: { data: [...], total, page, limit }

  POST /projects/:id/test-plans
    preHandler: [requireAuth(), permissionGuard('test_plan', 'create')]
    schema: { tags: ['Test Plans'], summary, body, params }
    handler: call testPlanService.create({ ...body, projectId: id, createdById: request.user.userId })
    return: 201

  GET /test-plans/:id
    preHandler: [requireAuth()]
    handler: call testPlanService.getById(id)

  PATCH /test-plans/:id
    preHandler: [requireAuth(), permissionGuard('test_plan', 'update')]
    handler: call testPlanService.update(id, body)

  PATCH /test-plans/:id/status
    preHandler: [requireAuth(), permissionGuard('test_plan', 'update')]
    body: { status: 'active' | 'completed' | 'archived' }
    handler: call testPlanService.transitionStatus(id, body.status)

  DELETE /test-plans/:id
    preHandler: [requireAuth(), permissionGuard('test_plan', 'delete')]
    handler: call testPlanService.delete(id)
  ```

- [ ] **Step 5: Create test suite routes**

  File: `backend/src/interfaces/http/routes/testSuites.ts`

  Export `async function testSuiteRoutes(app: FastifyInstance)`.

  ```
  GET /test-plans/:id/suites
    preHandler: [requireAuth()]
    handler: return full suite tree for the test plan

  POST /test-plans/:id/suites
    preHandler: [requireAuth(), permissionGuard('test_suite', 'create')]
    handler: create suite, auto-set testPlanId from params, createdById from user

  PATCH /suites/:id
    preHandler: [requireAuth(), permissionGuard('test_suite', 'update')]
    handler: update suite name, description, or parentSuiteId

  DELETE /suites/:id
    preHandler: [requireAuth(), permissionGuard('test_suite', 'delete')]
    handler: delete suite (cascade deletes children and cases)

  POST /test-plans/:id/suites/reorder
    preHandler: [requireAuth(), permissionGuard('test_suite', 'update')]
    body: { items: [{ id, orderIndex }] }
    handler: call testSuiteService.reorder(items)
  ```

- [ ] **Step 6: Create test case routes**

  File: `backend/src/interfaces/http/routes/testCases.ts`

  Export `async function testCaseRoutes(app: FastifyInstance)`.

  ```
  GET /suites/:id/cases
    preHandler: [requireAuth()]
    query: { page, limit, priorityId, typeId, search }
    handler: return paginated cases for suite

  POST /suites/:id/cases
    preHandler: [requireAuth(), permissionGuard('test_case', 'create')]
    handler: create case, set suiteId from params, createdById from user

  GET /cases/:id
    preHandler: [requireAuth()]
    handler: return case with relations

  PATCH /cases/:id
    preHandler: [requireAuth(), permissionGuard('test_case', 'update')]
    handler: update case

  DELETE /cases/:id
    preHandler: [requireAuth(), permissionGuard('test_case', 'delete')]
    handler: delete case

  POST /cases/:id/duplicate
    preHandler: [requireAuth(), permissionGuard('test_case', 'create')]
    handler: call testCaseService.duplicate(id, request.user.userId)

  POST /cases/import
    preHandler: [requireAuth(), permissionGuard('test_case', 'import')]
    content-type: multipart/form-data
    fields: file (binary), suiteId (string), columnMapping (JSON string)
    handler:
      - Register @fastify/multipart if not already registered
      - Parse uploaded file from request
      - Call importService.import(buffer, mimeType, columnMapping, suiteId, userId)
      - Return { created, failed, errors }
  ```

- [ ] **Step 7: Register routes in app.ts**

  Modify: `backend/src/app.ts`

  Add imports:
  ```typescript
  import { testPlanRoutes } from './interfaces/http/routes/testPlans.js'
  import { testSuiteRoutes } from './interfaces/http/routes/testSuites.js'
  import { testCaseRoutes } from './interfaces/http/routes/testCases.js'
  ```

  Register with prefix:
  ```typescript
  await app.register(testPlanRoutes, { prefix: '/api/v1' })
  await app.register(testSuiteRoutes, { prefix: '/api/v1' })
  await app.register(testCaseRoutes, { prefix: '/api/v1' })
  ```

- [ ] **Step 8: Install @fastify/multipart**

  ```bash
  cd backend && npm install @fastify/multipart xlsx
  ```

  Register multipart plugin in `app.ts` (before routes):
  ```typescript
  import multipart from '@fastify/multipart'
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB max
  ```

- [ ] **Step 9: Add Swagger tags for new route groups**

  Modify: `backend/src/interfaces/http/plugins/swagger.ts`

  Add tags: `Test Plans`, `Test Suites`, `Test Cases` to the swagger config tags array.

### Verification
- All endpoints return proper HTTP status codes (200, 201, 400, 401, 403, 404).
- Pagination returns `{ data, total, page, limit }` format.
- Import endpoint accepts multipart/form-data and returns results summary.
- Swagger docs show all endpoints with correct request/response schemas.
- Permission guards match RBAC requirements (admin+lead for plans, admin+lead+tester for cases).

---

## Task 5: Frontend — i18n Messages

**Files:**
- Modify: `frontend/src/messages/en-US.json`
- Modify: `frontend/src/messages/pt-BR.json`

### Steps

- [ ] **Step 1: Add test plan i18n keys to en-US.json**

  Add the following sections to `en-US.json`:
  ```json
  "testPlans": {
    "title": "Test Plans",
    "newPlan": "New Test Plan",
    "name": "Name",
    "description": "Description",
    "status": "Status",
    "startDate": "Start Date",
    "endDate": "End Date",
    "createdBy": "Created By",
    "casesCount": "Cases",
    "suitesCount": "Suites",
    "completion": "Completion",
    "filterByStatus": "Filter by status",
    "allStatuses": "All statuses",
    "confirmDelete": "Are you sure you want to delete this test plan? All suites and cases will be permanently removed.",
    "statusDraft": "Draft",
    "statusActive": "Active",
    "statusCompleted": "Completed",
    "statusArchived": "Archived",
    "activate": "Activate",
    "complete": "Complete",
    "archive": "Archive",
    "reopen": "Reopen",
    "noPlanFound": "No test plans found",
    "createFirst": "Create your first test plan to get started"
  },
  "testSuites": {
    "title": "Test Suites",
    "newSuite": "New Suite",
    "newChildSuite": "New Child Suite",
    "name": "Name",
    "description": "Description",
    "rename": "Rename",
    "moveTo": "Move to...",
    "confirmDelete": "Are you sure you want to delete this suite? All child suites and cases will be permanently removed.",
    "noSuites": "No suites yet",
    "addFirst": "Add a suite to organize your test cases"
  },
  "testCases": {
    "title": "Test Cases",
    "newCase": "New Test Case",
    "titleField": "Title",
    "description": "Description",
    "preconditions": "Preconditions",
    "steps": "Steps",
    "stepAction": "Action",
    "stepExpected": "Expected Result",
    "addStep": "Add Step",
    "removeStep": "Remove Step",
    "priority": "Priority",
    "type": "Type",
    "automationRef": "Automation Script Reference",
    "duplicate": "Duplicate",
    "confirmDelete": "Are you sure you want to delete this test case?",
    "noCases": "No test cases in this suite",
    "selectSuite": "Select a suite to view test cases",
    "stepsCount": "steps",
    "import": "Import",
    "importTitle": "Import Test Cases",
    "importUpload": "Upload File",
    "importSelectFile": "Select a CSV or XLSX file",
    "importPreview": "Preview",
    "importMapping": "Column Mapping",
    "importMapColumn": "Map to field",
    "importSkipColumn": "Skip this column",
    "importConfirm": "Import",
    "importResults": "Import Results",
    "importCreated": "created",
    "importFailed": "failed",
    "importErrors": "Errors"
  }
  ```

- [ ] **Step 2: Add test plan i18n keys to pt-BR.json**

  Add equivalent Portuguese translations for all keys above. Key translations:
  - Test Plans -> Planos de Teste
  - Test Suites -> Suites de Teste
  - Test Cases -> Casos de Teste
  - Draft -> Rascunho, Active -> Ativo, Completed -> Concluido, Archived -> Arquivado
  - Priority -> Prioridade, Type -> Tipo
  - Steps -> Passos, Action -> Acao, Expected Result -> Resultado Esperado
  - Import -> Importar, Upload File -> Enviar Arquivo
  - etc.

### Verification
- Both locale files have identical key structures.
- No missing translations in either file.

---

## Task 6: Frontend — API Client Functions

**Files:**
- Create: `frontend/src/lib/api/testPlans.ts`
- Create: `frontend/src/lib/api/testSuites.ts`
- Create: `frontend/src/lib/api/testCases.ts`

### Steps

- [ ] **Step 1: Check if a base API client/fetch wrapper already exists**

  Look in `frontend/src/lib/` for any existing fetch utility or API client. If one exists, use it. If not, create a minimal `frontend/src/lib/api/client.ts` with:
  ```typescript
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

  export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `API error: ${res.status}`)
    }
    return res.json()
  }
  ```

- [ ] **Step 2: Create test plans API functions**

  File: `frontend/src/lib/api/testPlans.ts`

  Functions:
  - `listTestPlans(projectId, params?)` -> GET `/projects/${projectId}/test-plans`
  - `getTestPlan(id)` -> GET `/test-plans/${id}`
  - `createTestPlan(projectId, data)` -> POST `/projects/${projectId}/test-plans`
  - `updateTestPlan(id, data)` -> PATCH `/test-plans/${id}`
  - `transitionTestPlanStatus(id, status)` -> PATCH `/test-plans/${id}/status`
  - `deleteTestPlan(id)` -> DELETE `/test-plans/${id}`

- [ ] **Step 3: Create test suites API functions**

  File: `frontend/src/lib/api/testSuites.ts`

  Functions:
  - `getSuiteTree(testPlanId)` -> GET `/test-plans/${testPlanId}/suites`
  - `createSuite(testPlanId, data)` -> POST `/test-plans/${testPlanId}/suites`
  - `updateSuite(suiteId, data)` -> PATCH `/suites/${suiteId}`
  - `deleteSuite(suiteId)` -> DELETE `/suites/${suiteId}`
  - `reorderSuites(testPlanId, items)` -> POST `/test-plans/${testPlanId}/suites/reorder`

- [ ] **Step 4: Create test cases API functions**

  File: `frontend/src/lib/api/testCases.ts`

  Functions:
  - `listCases(suiteId, params?)` -> GET `/suites/${suiteId}/cases`
  - `getCase(id)` -> GET `/cases/${id}`
  - `createCase(suiteId, data)` -> POST `/suites/${suiteId}/cases`
  - `updateCase(id, data)` -> PATCH `/cases/${id}`
  - `deleteCase(id)` -> DELETE `/cases/${id}`
  - `duplicateCase(id)` -> POST `/cases/${id}/duplicate`
  - `importCases(file, suiteId, columnMapping)` -> POST `/cases/import` (multipart/form-data, use FormData instead of JSON)

### Verification
- All functions use the shared fetch wrapper with auth headers.
- Import function uses FormData (not JSON) for file upload.
- TypeScript types match backend response shapes.

---

## Task 7: Frontend — Test Plans List Page

**Files:**
- Create: `frontend/src/app/[locale]/projects/[id]/test-plans/page.tsx`
- Create: `frontend/src/components/test-plans/TestPlanCard.tsx`
- Create: `frontend/src/components/test-plans/TestPlanForm.tsx`
- Create: `frontend/src/components/test-plans/StatusBadge.tsx`

**IMPORTANT:** Before creating any page, read `frontend/node_modules/next/dist/docs/` for Next.js 16 breaking changes. Pay attention to how `params` are handled in page components (they may be async in Next.js 16).

### Steps

- [ ] **Step 1: Read Next.js 16 docs for page component API**

  Read relevant docs in `frontend/node_modules/next/dist/docs/` to understand:
  - How `params` and `searchParams` are passed to page components in Next.js 16
  - Any changes to layouts, metadata, or routing conventions
  - Dynamic route segment handling

- [ ] **Step 2: Create StatusBadge component**

  File: `frontend/src/components/test-plans/StatusBadge.tsx`

  - Accept props: `status: string` (the systemKey: draft, active, completed, archived) and optional `color: string`.
  - Use shadcn/ui `Badge` component.
  - Color mapping:
    - draft: `bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300`
    - active: `bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`
    - completed: `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`
    - archived: `bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`
  - If `color` from the EnumValue is provided, use it as override.
  - Use `useTranslations('testPlans')` for label text.

- [ ] **Step 3: Create TestPlanForm dialog**

  File: `frontend/src/components/test-plans/TestPlanForm.tsx`

  - Props: `projectId: string`, `plan?: TestPlan` (for edit mode), `onSuccess: () => void`, `open: boolean`, `onOpenChange: (open: boolean) => void`.
  - Use shadcn/ui `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`.
  - Fields:
    - Name: `Input` (required)
    - Description: `Textarea` (optional)
    - Start Date: date picker (shadcn/ui `Calendar` + `Popover`)
    - End Date: date picker
  - Submit: call `createTestPlan()` or `updateTestPlan()` depending on mode.
  - On success: call `onSuccess()`, close dialog.
  - i18n: use `useTranslations('testPlans')`.

- [ ] **Step 4: Create TestPlanCard component**

  File: `frontend/src/components/test-plans/TestPlanCard.tsx`

  - Props: `plan: TestPlanWithRelations`.
  - Use shadcn/ui `Card`, `CardHeader`, `CardContent`.
  - Display:
    - Plan name as card title
    - StatusBadge
    - Date range (startDate - endDate) formatted with locale
    - Cases count
    - Created by name/email
  - Click: navigate to `/[locale]/test-plans/[plan.id]`.
  - Use Lucide icons: `Calendar`, `FileText`, `User`.

- [ ] **Step 5: Create Test Plans list page**

  File: `frontend/src/app/[locale]/projects/[id]/test-plans/page.tsx`

  - Follow Next.js 16 conventions for params (check docs from Step 1).
  - Page header: "Test Plans" title + "New Test Plan" button (conditionally shown based on user role — admin/lead only).
  - Status filter: shadcn/ui `Select` with options: All, Draft, Active, Completed, Archived.
  - Fetch test plans using `listTestPlans(projectId, { status, page })`.
  - Render grid of `TestPlanCard` components (responsive: 1 col mobile, 2 col tablet, 3 col desktop).
  - Empty state: illustration/icon + "No test plans found" + "Create your first test plan" message.
  - Pagination: shadcn/ui pagination component at bottom.
  - TestPlanForm dialog triggered by "New Test Plan" button.
  - i18n: use `useTranslations('testPlans')`.

  **Client vs Server component decision:** The page should be a client component (`'use client'`) since it has interactive state (filter, dialog, pagination). Alternatively, use server component for initial data fetch and client components for interactive parts. Follow whichever pattern Next.js 16 docs recommend.

### Verification
- Page renders at `/en-US/projects/{id}/test-plans` and `/pt-BR/projects/{id}/test-plans`.
- Status filter works and updates the list.
- Create dialog opens, submits, and refreshes the list.
- Cards are clickable and navigate to detail page.
- Responsive layout works on mobile/tablet/desktop.
- Dark mode renders correctly.

---

## Task 8: Frontend — Test Plan Detail + Suite Tree

**Files:**
- Create: `frontend/src/app/[locale]/test-plans/[id]/page.tsx`
- Create: `frontend/src/components/test-plans/StatusTransitionButton.tsx`
- Create: `frontend/src/components/test-suites/SuiteTree.tsx`
- Create: `frontend/src/components/test-suites/SuiteTreeNode.tsx`
- Create: `frontend/src/components/test-suites/SuiteForm.tsx`

### Steps

- [ ] **Step 1: Create StatusTransitionButton component**

  File: `frontend/src/components/test-plans/StatusTransitionButton.tsx`

  - Props: `currentStatus: string` (systemKey), `testPlanId: string`, `onTransition: () => void`.
  - Show the appropriate next action based on current status:
    - draft: show "Activate" button (blue)
    - active: show "Complete" button (green)
    - completed: show "Archive" button (yellow)
    - archived: show "Reopen" button (blue, variant outline)
  - On click: call `transitionTestPlanStatus(testPlanId, targetStatus)`, then call `onTransition()`.
  - Use shadcn/ui `Button` with appropriate variant.
  - Add confirmation dialog for "Archive" action.

- [ ] **Step 2: Create SuiteForm dialog**

  File: `frontend/src/components/test-suites/SuiteForm.tsx`

  - Props: `testPlanId: string`, `parentSuiteId?: string`, `suite?: TestSuite` (edit mode), `open: boolean`, `onOpenChange`, `onSuccess`.
  - Fields: Name (Input, required), Description (Textarea, optional).
  - Submit: `createSuite()` or `updateSuite()`.
  - Use shadcn/ui Dialog.

- [ ] **Step 3: Create SuiteTreeNode component**

  File: `frontend/src/components/test-suites/SuiteTreeNode.tsx`

  - Props: `node: TestSuiteTreeNode`, `selectedSuiteId: string | null`, `onSelect: (id: string) => void`, `onAddChild`, `onRename`, `onDelete`, `depth: number`.
  - Render as a collapsible tree item:
    - Indent based on depth (use `pl-{depth * 4}`).
    - Folder icon (Lucide `Folder` or `FolderOpen` when expanded).
    - Suite name as clickable text.
    - Case count badge.
    - Expand/collapse chevron if has children (Lucide `ChevronRight` / `ChevronDown`).
    - Context menu (shadcn/ui `DropdownMenu`) on right-click or via "..." button:
      - Add Child Suite
      - Rename
      - Delete
  - Highlight selected suite with different background color.
  - Recursively render children.
  - Use shadcn/ui `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`.

- [ ] **Step 4: Create SuiteTree component**

  File: `frontend/src/components/test-suites/SuiteTree.tsx`

  - Props: `testPlanId: string`, `selectedSuiteId: string | null`, `onSelectSuite: (id: string) => void`.
  - Fetch suite tree using `getSuiteTree(testPlanId)`.
  - Render header: "Suites" label + "Add Suite" button (Lucide `Plus` icon).
  - Render `SuiteTreeNode` for each root node.
  - Handle add/rename/delete actions:
    - Add: open SuiteForm dialog.
    - Add Child: open SuiteForm with parentSuiteId.
    - Rename: open SuiteForm in edit mode.
    - Delete: confirmation dialog, then call `deleteSuite()`.
  - Drag-to-reorder (optional but recommended):
    - Use `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop.
    - On drop: call `reorderSuites()` with updated order indices.
    - Install: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` in frontend.
  - Empty state: "No suites yet" message + "Add a suite" prompt.

- [ ] **Step 5: Create Test Plan Detail page**

  File: `frontend/src/app/[locale]/test-plans/[id]/page.tsx`

  - Follow Next.js 16 params convention.
  - Layout: two-panel design.
    - Left panel (w-1/3 or w-80, resizable border): SuiteTree.
    - Right panel (flex-1): CaseTable for selected suite (built in Task 9).
  - Page header:
    - Back button (navigate to project test plans list).
    - Plan name (editable inline or via edit button).
    - StatusBadge + StatusTransitionButton.
    - Date range display.
    - Edit button: opens TestPlanForm in edit mode.
    - Delete button: confirmation dialog, then delete and navigate back.
  - State management:
    - `selectedSuiteId` in React state.
    - When a suite is selected, right panel shows cases for that suite.
    - When no suite selected, show "Select a suite to view test cases" placeholder.
  - Responsive: on mobile, show suite tree and case list as tabs or stacked.
  - i18n: use `useTranslations`.

### Verification
- Two-panel layout renders correctly.
- Suite tree is navigable and collapsible.
- Selecting a suite updates the right panel.
- Status transitions work and update the badge.
- Add/rename/delete suite operations work and refresh the tree.
- Drag-reorder updates order indices (if implemented).
- Back navigation returns to project test plans list.
- Dark/light theme works.

---

## Task 9: Frontend — Test Case List + Detail

**Files:**
- Create: `frontend/src/components/test-cases/CaseTable.tsx`
- Create: `frontend/src/components/test-cases/CaseDetail.tsx`
- Create: `frontend/src/components/test-cases/PriorityBadge.tsx`
- Create: `frontend/src/components/test-cases/TypeBadge.tsx`

### Steps

- [ ] **Step 1: Create PriorityBadge component**

  File: `frontend/src/components/test-cases/PriorityBadge.tsx`

  - Props: `priority: { value: string; label: string; color: string | null }`.
  - Color mapping:
    - low: gray
    - medium: blue
    - high: orange
    - critical: red
  - Use shadcn/ui `Badge`.

- [ ] **Step 2: Create TypeBadge component**

  File: `frontend/src/components/test-cases/TypeBadge.tsx`

  - Props: `type: { value: string; label: string; color: string | null }`.
  - Color mapping:
    - manual: gray
    - automated: purple
    - exploratory: teal
    - regression: indigo
  - Use shadcn/ui `Badge` with `variant="outline"`.

- [ ] **Step 3: Create CaseTable component**

  File: `frontend/src/components/test-cases/CaseTable.tsx`

  - Props: `suiteId: string`, `onSelectCase: (id: string) => void`.
  - Fetch cases using `listCases(suiteId, { page, limit, priorityId, typeId, search })`.
  - Filter bar:
    - Search input (debounced, 300ms) for title search.
    - Priority filter: `Select` dropdown populated from enum values.
    - Type filter: `Select` dropdown populated from enum values.
  - Action buttons:
    - "New Test Case" button.
    - "Import" button.
  - Table (shadcn/ui `Table`):
    - Columns: Title, Priority (PriorityBadge), Type (TypeBadge), Steps count, Created date.
    - Row click: call `onSelectCase(case.id)`.
    - Row actions dropdown: Edit, Duplicate, Delete.
  - Pagination at bottom.
  - Empty state: "No test cases in this suite".

- [ ] **Step 4: Create CaseDetail side panel**

  File: `frontend/src/components/test-cases/CaseDetail.tsx`

  - Props: `caseId: string`, `onClose: () => void`, `onUpdate: () => void`.
  - Fetch case data using `getCase(caseId)`.
  - Display as a slide-over panel (shadcn/ui `Sheet`) or expandable right panel:
    - Title (large text)
    - PriorityBadge + TypeBadge
    - Description section
    - Preconditions section (if present)
    - Steps table:
      - Header: #, Action, Expected Result
      - Rows: numbered steps from the `steps` JSONB array
    - Automation script ref (if present, as a link)
    - Metadata: created by, created at, updated at
  - Action buttons: Edit (opens CaseForm), Duplicate, Delete.
  - Use shadcn/ui `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`.

- [ ] **Step 5: Wire CaseTable and CaseDetail into the Test Plan Detail page**

  Modify: `frontend/src/app/[locale]/test-plans/[id]/page.tsx`

  - Add `selectedCaseId` state.
  - When `selectedSuiteId` is set, render `CaseTable` in right panel with `onSelectCase` setting `selectedCaseId`.
  - When `selectedCaseId` is set, open `CaseDetail` as a Sheet overlay.
  - On case update/delete in detail, refresh the CaseTable.

### Verification
- Cases load when a suite is selected.
- Filters (search, priority, type) work correctly.
- Clicking a case opens the detail panel.
- Steps display correctly in the detail view.
- Duplicate creates a copy and refreshes the list.
- Delete removes the case and refreshes the list.
- Pagination works.

---

## Task 10: Frontend — Create/Edit Test Case Form

**Files:**
- Create: `frontend/src/components/test-cases/CaseForm.tsx`
- Create: `frontend/src/components/test-cases/StepEditor.tsx`

### Steps

- [ ] **Step 1: Create StepEditor component**

  File: `frontend/src/components/test-cases/StepEditor.tsx`

  - Props: `steps: TestStep[]`, `onChange: (steps: TestStep[]) => void`.
  - Render a dynamic list of step rows. Each row:
    - Order number (auto-calculated, display only).
    - Action: `Textarea` (2-3 rows).
    - Expected Result: `Textarea` (2-3 rows).
    - Remove button: Lucide `Trash2` icon button.
  - "Add Step" button at the bottom (Lucide `Plus` icon + text).
  - Drag-to-reorder steps:
    - Use `@dnd-kit/sortable` (same library as suite tree).
    - On reorder: recalculate `order` values (1-based sequential).
  - When a step is removed, recalculate order values.
  - Minimum: at least 0 steps (steps are optional on a test case).

- [ ] **Step 2: Create CaseForm dialog**

  File: `frontend/src/components/test-cases/CaseForm.tsx`

  - Props: `suiteId: string`, `testCase?: TestCaseWithRelations` (edit mode), `open: boolean`, `onOpenChange`, `onSuccess`.
  - Use shadcn/ui `Dialog` (large size for the form).
  - Fields:
    - Title: `Input` (required).
    - Description: `Textarea`.
    - Preconditions: `Textarea`.
    - Priority: `Select` dropdown. Populate options by fetching enum values where `enumType.name = 'test_priority'`. Note: need an API endpoint or pass as props.
    - Type: `Select` dropdown. Populate options by fetching enum values where `enumType.name = 'test_type'`.
    - Steps: `StepEditor` component.
    - Automation Script Ref: `Input` (type URL, optional).
  - Submit: call `createCase()` or `updateCase()`.
  - Validation: title is required. Show inline error messages.
  - On success: close dialog, call `onSuccess()`.
  - Consider fetching enum values once at the page level and passing down, to avoid redundant API calls.

  **Note on enum values:** The backend needs an endpoint to fetch enum values by type name, or the frontend can use a generic endpoint like `GET /api/v1/enum-values?type=test_priority`. If this endpoint does not exist yet, add it to the backend as part of this task:
  ```
  GET /api/v1/enum-values?type=test_priority
  ```
  This returns the EnumValue records for the given EnumType name.

- [ ] **Step 3: Wire CaseForm into CaseTable and CaseDetail**

  Modify: `frontend/src/components/test-cases/CaseTable.tsx`
  - "New Test Case" button opens CaseForm with `suiteId`.
  - Row action "Edit" opens CaseForm with existing case data.

  Modify: `frontend/src/components/test-cases/CaseDetail.tsx`
  - "Edit" button opens CaseForm with existing case data.

### Verification
- Form opens in create mode (empty) and edit mode (pre-filled).
- Priority and type dropdowns load enum values correctly.
- Steps can be added, removed, and reordered.
- Form submits and creates/updates the test case.
- Validation prevents submission without title.
- Dialog closes on success and list refreshes.

---

## Task 11: Frontend — CSV/Excel Import

**Files:**
- Create: `frontend/src/components/import/ImportDialog.tsx`
- Create: `frontend/src/components/import/ImportPreview.tsx`
- Create: `frontend/src/components/import/ColumnMapper.tsx`

### Steps

- [ ] **Step 1: Install xlsx library for client-side preview**

  ```bash
  cd frontend && npm install xlsx
  ```

  This allows parsing the file client-side for preview before uploading.

- [ ] **Step 2: Create ColumnMapper component**

  File: `frontend/src/components/import/ColumnMapper.tsx`

  - Props: `headers: string[]` (from parsed file), `onChange: (mapping: Record<string, string>) => void`.
  - For each file column header, render a row:
    - Left: file column name (read-only).
    - Right: `Select` dropdown with options:
      - Skip this column
      - Title
      - Description
      - Preconditions
      - Priority
      - Type
      - Steps (action)
      - Steps (expected result)
      - Automation Script Ref
  - Auto-detect mapping based on header names (case-insensitive fuzzy match):
    - "title", "test name", "name" -> Title
    - "description", "desc" -> Description
    - "preconditions", "pre-conditions", "prerequisites" -> Preconditions
    - "priority" -> Priority
    - "type", "test type" -> Type
    - "steps", "action", "test steps" -> Steps (action)
    - "expected", "expected result" -> Steps (expected result)
  - Validate: at least "Title" must be mapped.

- [ ] **Step 3: Create ImportPreview component**

  File: `frontend/src/components/import/ImportPreview.tsx`

  - Props: `rows: Record<string, string>[]`, `headers: string[]`, `mapping: Record<string, string>`.
  - Display a preview table of the first 10 rows.
  - Highlight mapped columns.
  - Show total row count: "Showing 10 of {total} rows".

- [ ] **Step 4: Create ImportDialog component**

  File: `frontend/src/components/import/ImportDialog.tsx`

  - Props: `suiteId: string`, `open: boolean`, `onOpenChange`, `onSuccess`.
  - Multi-step wizard:
    1. **Upload**: File picker accepting `.csv`, `.xlsx`, `.xls`. On file select, parse client-side using `xlsx` library. Show file name and row count.
    2. **Map Columns**: Render `ColumnMapper` with parsed headers. Show `ImportPreview` below.
    3. **Confirm**: Show summary: "{N} test cases will be imported into suite {suiteName}". "Import" button.
    4. **Results**: Show results after import: "X created, Y failed". If errors, show error table (row number + error message). "Close" button.
  - Navigation: Back/Next buttons between steps.
  - On "Import" click in step 3:
    - Call `importCases(file, suiteId, columnMapping)`.
    - Show loading spinner during upload.
    - On complete, move to step 4 (results).
  - Use shadcn/ui `Dialog` (large), `Button`, `Table`.

- [ ] **Step 5: Wire ImportDialog into CaseTable**

  Modify: `frontend/src/components/test-cases/CaseTable.tsx`

  - "Import" button opens `ImportDialog` with current `suiteId`.
  - On import success, refresh the case list.
  - Only show "Import" button for admin/lead roles.

### Verification
- File picker accepts CSV and XLSX files.
- Client-side parsing displays correct preview.
- Column mapping auto-detects common header names.
- Import sends file to backend and receives results.
- Error rows are displayed with meaningful messages.
- Success refreshes the case list.
- Import button only visible to admin/lead users.

---

## Task 12: Verification (End-to-End)

### Steps

- [ ] **Step 1: Verify backend CRUD**
  - Create a test plan via POST `/projects/:id/test-plans` -> 201
  - List test plans via GET `/projects/:id/test-plans` -> returns array with the created plan
  - Get test plan via GET `/test-plans/:id` -> returns plan with status relation
  - Update test plan via PATCH `/test-plans/:id` -> 200
  - Transition status: PATCH `/test-plans/:id/status` with `{ status: 'active' }` -> 200
  - Delete test plan via DELETE `/test-plans/:id` -> 200

- [ ] **Step 2: Verify suite nesting**
  - Create root suite via POST `/test-plans/:id/suites` with no parentSuiteId -> 201
  - Create child suite via POST `/test-plans/:id/suites` with parentSuiteId -> 201
  - Create grandchild suite -> 201
  - GET `/test-plans/:id/suites` -> returns tree with correct nesting (3 levels)
  - Move suite: PATCH `/suites/:id` with new parentSuiteId -> tree updates correctly

- [ ] **Step 3: Verify test cases with steps**
  - Create case via POST `/suites/:id/cases` with steps array -> 201
  - GET `/cases/:id` -> returns case with steps as JSONB array
  - Update steps via PATCH `/cases/:id` -> steps update correctly
  - Duplicate case via POST `/cases/:id/duplicate` -> new case created with "(copy)" suffix

- [ ] **Step 4: Verify CSV import**
  - Prepare a CSV file with columns: Title, Description, Priority, Type
  - POST `/cases/import` with multipart form data -> returns `{ created: N, failed: 0 }`
  - Verify created cases exist in the target suite
  - Test with invalid rows (missing title) -> returns errors for those rows

- [ ] **Step 5: Verify RBAC**
  - As tester role: can create cases (200) but cannot create test plans (403)
  - As lead role: can create test plans (201) and import (200)
  - As admin role: can do everything
  - Unauthenticated: all endpoints return 401

- [ ] **Step 6: Verify frontend pages**
  - Navigate to `/en-US/projects/{id}/test-plans` -> list renders
  - Navigate to `/pt-BR/projects/{id}/test-plans` -> list renders in Portuguese
  - Create a test plan -> card appears in list
  - Click card -> navigates to detail page
  - Suite tree renders and is interactive
  - Select suite -> cases load in right panel
  - Create/edit/delete cases works
  - Import wizard completes successfully
  - Dark mode: all components render correctly
  - Mobile: layout is responsive (stacked panels)

- [ ] **Step 7: Verify Swagger docs**
  - Open `/docs` in browser
  - All new endpoints appear under Test Plans, Test Suites, Test Cases tags
  - Request/response schemas are correct
  - Try endpoints from Swagger UI

### Verification Criteria
- All CRUD operations return correct HTTP status codes.
- Suite tree supports at least 3 levels of nesting.
- Drag-reorder persists order changes.
- CSV and XLSX import both work.
- RBAC permissions are enforced on every endpoint.
- i18n works for both en-US and pt-BR.
- Dark mode and light mode render correctly.
- Responsive layout works on mobile viewports.
