# Plan 7 — Executions + Bugs (Manual Execution, CI Trigger, Bug Tracking)

**Goal:** Test execution tracking and bug management — run test cases manually, trigger from CI, track bugs with severity/priority, link bugs to execution failures.

---

## File Map

```
backend/src/
  services/ExecutionService.ts, BugService.ts
  interfaces/http/routes/executions.ts, bugs.ts, webhooks.ts

frontend/src/
  app/[locale]/(app)/
    executions/page.tsx, executions/[id]/page.tsx
    bugs/page.tsx, bugs/[id]/page.tsx
  components/executions/
    ExecutionList.tsx, ExecutionDetail.tsx, RunExecution.tsx
  components/bugs/
    BugList.tsx, BugDetail.tsx, CreateBugDialog.tsx
```

---

## Task 1: Execution Service

**Files:**
- Create: `backend/src/services/ExecutionService.ts`

- [ ] **Execute test cases**

  - Create execution from test plan
  - Start/pause/complete execution
  - Update step results (passed/failed/blocked/skipped)
  - Link bugs to failed steps
  - Calculate pass rate

---

## Task 2: Bug Service

**Files:**
- Create: `backend/src/services/BugService.ts`

- [ ] **Bug CRUD with linking**

  - Create bug with severity, priority, status
  - Link to execution step
  - Get linked executions
  - Update bug status

---

## Task 3: API Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/executions.ts`
- Create: `backend/src/interfaces/http/routes/bugs.ts`
- Create: `backend/src/interfaces/http/routes/webhooks.ts`

- [ ] **Execution endpoints**

  - `GET/POST /executions`
  - `GET/POST /executions/:id/start`, `/:id/complete`
  - `PATCH /executions/:id/steps/:stepId`
  - `POST /executions/:id/bugs` (link bug)

- [ ] **Bug endpoints**

  - `GET/POST /bugs`
  - `GET/PATCH/DELETE /bugs/:id`
  - `POST/DELETE /bugs/:id/links/:stepId`

- [ ] **Webhook endpoints**

  - `POST /webhooks/github`
  - `POST /webhooks/jenkins`

---

## Task 4: Frontend Execution UI

**Files:**
- Create: `frontend/src/components/executions/ExecutionList.tsx`, `ExecutionDetail.tsx`

- [ ] **Execution list and detail**

  - List with status, progress bar, dates
  - Detail with step-by-step results
  - Mark steps as passed/failed
  - Link bug button on failed steps

---

## Task 5: Frontend Bug UI

**Files:**
- Create: `frontend/src/components/bugs/BugList.tsx`, `BugDetail.tsx`

- [ ] **Bug list and detail**

  - List with severity badges, status
  - Detail with linked test cases
  - Create bug from execution

---

## Verification

- [ ] Can create and run execution
- [ ] Can mark test steps as passed/failed
- [ ] Can create bugs from failed steps
- [ ] CI webhook creates execution
