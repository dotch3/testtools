# Plan 10 — Reports + Dashboards

**Goal:** Reporting and dashboard capabilities — project dashboard with stats, execution trends, coverage reports, and async PDF/CSV/Excel export.

---

## File Map

```
backend/src/
  services/DashboardService.ts, ReportService.ts, ExportService.ts
  interfaces/http/routes/reports.ts, exports.ts

frontend/src/
  app/[locale]/(app)/
    reports/dashboard/page.tsx
    reports/coverage/page.tsx
  components/reports/
    DashboardCards.tsx, TrendChart.tsx, CoverageTable.tsx
    ExportButton.tsx
```

---

## Task 1: Dashboard Service

**Files:**
- Create: `backend/src/services/DashboardService.ts`

- [ ] **Aggregated stats**

  ```typescript
  async getProjectStats(projectId): Promise<{
    totalTestCases: number
    totalExecutions: number
    passRate: number
    bugsBySeverity: Record<string, number>
    executionsByDay: { date: string; passed: number; failed: number }[]
  }>
  ```

---

## Task 2: Report Service

**Files:**
- Create: `backend/src/services/ReportService.ts`

- [ ] **Coverage and trends**

  - Test case coverage by suite
  - Pass rate trends over time
  - Bug density reports

---

## Task 3: Export Service

**Files:**
- Create: `backend/src/services/ExportService.ts`
- Create: `backend/src/worker.ts` exports worker

- [ ] **Async export jobs**

  - Queue export job (BullMQ)
  - Generate PDF/CSV/Excel
  - Store in /data/exports
  - Return download URL

---

## Task 4: API Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/reports.ts`
- Create: `backend/src/interfaces/http/routes/exports.ts`

- [ ] **Report endpoints**

  - `GET /reports/dashboard` — aggregated stats
  - `GET /reports/trends` — execution trends
  - `GET /reports/coverage` — suite coverage

- [ ] **Export endpoints**

  - `POST /exports` — queue export job
  - `GET /exports/:jobId` — check status
  - `GET /exports/:jobId/download` — download file

---

## Task 5: Dashboard Frontend

**Files:**
- Create: `frontend/src/app/[locale]/(app)/reports/dashboard/page.tsx`
- Create: `frontend/src/components/reports/DashboardCards.tsx`
- Create: `frontend/src/components/reports/TrendChart.tsx`

- [ ] **Dashboard with charts**

  Using recharts:
  - Stat cards (total cases, executions, pass rate, bugs)
  - Line chart for execution trends
  - Bar chart for bugs by severity

---

## Task 6: Coverage Report

**Files:**
- Create: `frontend/src/app/[locale]/(app)/reports/coverage/page.tsx`
- Create: `frontend/src/components/reports/CoverageTable.tsx`

- [ ] **Suite coverage table**

  - Suite name, case count, execution count, pass rate
  - Expandable rows for child suites

---

## Task 7: Export UI

**Files:**
- Create: `frontend/src/components/reports/ExportButton.tsx`

- [ ] **Export dialog**

  - Select format (PDF, CSV, Excel)
  - Select scope (all, filtered)
  - Show progress for async export

---

## Verification

- [ ] Dashboard shows aggregated stats
- [ ] Trend charts render correctly
- [ ] Coverage table shows suite breakdown
- [ ] Export generates downloadable file
