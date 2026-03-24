# Plan 6 — Test Plans + Suites + Cases (CRUD, Tree, Import)

**Goal:** Implement test plan, suite, and case management — hierarchical tree structure, CRUD operations, and CSV/Excel import.

---

## File Map

```
backend/src/
  domain/entities/TestPlan.ts, TestSuite.ts, TestCase.ts
  services/TestPlanService.ts, TestSuiteService.ts, TestCaseService.ts
  interfaces/http/routes/testPlans.ts, testSuites.ts, testCases.ts

frontend/src/
  app/[locale]/(app)/
    test-plans/page.tsx
    test-plans/[id]/page.tsx
    test-cases/[id]/page.tsx
  components/test-plans/
    TestPlanList.tsx, TestPlanDetail.tsx, TestPlanForm.tsx
  components/test-suites/
    SuiteTree.tsx, SuiteCard.tsx
  components/test-cases/
    TestCaseList.tsx, TestCaseDetail.tsx, TestCaseForm.tsx
```

---

## Task 1: Hierarchical Suite Service

**Files:**
- Create: `backend/src/services/TestSuiteService.ts`

- [ ] **Recursive tree structure**

  - Create suite with optional parent_id
  - Get tree (all suites with children nested)
  - Move suite (change parent)
  - Delete suite (cascade or prevent if has children/cases)

---

## Task 2: Test Plan Service

**Files:**
- Create: `backend/src/services/TestPlanService.ts`

- [ ] **CRUD with status workflow**

  - Create plan linked to project
  - Statuses: draft, active, archived
  - Add/remove suites to plan
  - Clone plan

---

## Task 3: Test Case Service

**Files:**
- Create: `backend/src/services/TestCaseService.ts`

- [ ] **Full CRUD with versioning**

  - Create case with steps
  - Update creates new version
  - Get case with latest version
  - Get case at specific version
  - Import from CSV/Excel

---

## Task 4: API Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/testPlans.ts`
- Create: `backend/src/interfaces/http/routes/testSuites.ts`
- Create: `backend/src/interfaces/http/routes/testCases.ts`

- [ ] **All CRUD endpoints with Zod validation**

---

## Task 5: Suite Tree Component

**Files:**
- Create: `frontend/src/components/test-suites/SuiteTree.tsx`

- [ ] **Collapsible tree**

  - Recursive tree rendering
  - Expand/collapse nodes
  - Drag-and-drop reordering (optional)
  - Context menu: Add child, Edit, Delete

---

## Task 6: Test Case Components

**Files:**
- Create: `frontend/src/components/test-cases/TestCaseList.tsx`, `TestCaseDetail.tsx`

- [ ] **List with filters and detail view**

  - Filter by priority, type, status
  - Sort by name, priority, created date
  - Detail shows steps, preconditions, attachments

---

## Task 7: Import Feature

**Files:**
- Create: `backend/src/interfaces/http/routes/import.ts`

- [ ] **CSV/Excel import**

  - Parse uploaded file
  - Validate data
  - Return validation errors or import
  - Support test cases with steps

---

## Verification

- [ ] Can create hierarchical suite tree
- [ ] Can create/edit test plans
- [ ] Can create/edit test cases with steps
- [ ] Can import test cases from CSV
- [ ] Frontend displays tree and case list/detail
