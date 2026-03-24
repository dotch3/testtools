# Plan 10 -- Reports + Dashboards

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement reporting and dashboard capabilities -- project dashboard with aggregated stats, execution trend charts, coverage reports with per-suite breakdown, and async PDF/CSV/Excel export via BullMQ.

**Architecture:** Backend follows clean architecture (service -> Prisma queries). Frontend uses recharts for charting, shadcn/ui for layout, next-intl for i18n, and Intl APIs for locale-aware formatting. Export jobs are async (BullMQ worker) with polling via `/jobs/:jobId`.

**Tech Stack:** Fastify 5, Prisma 6, PostgreSQL 16, Redis 7, BullMQ, Next.js 16.2, TypeScript 5, recharts, pdfkit, exceljs, shadcn/ui, Tailwind CSS 4, next-intl, Lucide React

**Chart library decision:** Use **recharts** (v2). Rationale: built on React primitives, renders SVG (SSR-friendly, accessible), composable API, strong TypeScript support, active maintenance, works with Next.js App Router without `window` hacks. chart.js requires a canvas ref and is harder to theme with CSS variables.

**IMPORTANT:** Next.js 16 has breaking changes. Before writing any frontend code, read the relevant guide in `frontend/node_modules/next/dist/docs/` and heed deprecation notices (see `frontend/AGENTS.md`).

---

## File Map

```
backend/
  src/
    services/
      ReportService.ts              <- NEW: dashboard, trend, coverage queries
    infrastructure/
      queue/
        bullmq.ts                   <- NEW: shared BullMQ connection + queue factory
        ExportWorker.ts             <- NEW: BullMQ worker for report export jobs
        ExportJobStore.ts           <- NEW: in-memory or Redis job status store
    interfaces/
      http/
        routes/
          reports.ts                <- NEW: report API routes (dashboard, trend, coverage, export)
          jobs.ts                   <- NEW: GET /jobs/:jobId polling endpoint
    domain/
      interfaces/
        IReportService.ts           <- NEW: interface for ReportService
    config.ts                       <- MODIFY: add EXPORT_TTL_HOURS env var
  package.json                      <- MODIFY: add pdfkit, exceljs deps
  tests/
    services/
      ReportService.test.ts         <- NEW: unit tests
    routes/
      reports.test.ts               <- NEW: route integration tests

frontend/
  package.json                      <- MODIFY: add recharts
  src/
    lib/
      api.ts                        <- MODIFY: add report API functions
      formatters.ts                 <- NEW: locale-aware number/date formatting helpers
    components/
      charts/
        ChartWrapper.tsx            <- NEW: recharts wrapper with theme colors
        StatusDonutChart.tsx         <- NEW: execution status donut
        BarChartCard.tsx            <- NEW: reusable bar chart card
        TrendAreaChart.tsx          <- NEW: stacked area chart for trends
        CoverageProgressBar.tsx     <- NEW: progress bar component
      reports/
        StatCard.tsx                <- NEW: single stat card (number + label + icon)
        StatCardGrid.tsx            <- NEW: grid of stat cards
        RecentActivityFeed.tsx      <- NEW: recent executions + bugs list
        ExportDialog.tsx            <- NEW: format selector + progress
        DateRangePicker.tsx         <- NEW: from/to date picker
        GranularityToggle.tsx       <- NEW: daily/weekly toggle
        CoverageSuiteTable.tsx      <- NEW: per-suite breakdown table
    app/
      [locale]/
        projects/
          [id]/
            dashboard/
              page.tsx              <- NEW: project dashboard page
        test-plans/
          [id]/
            reports/
              trend/
                page.tsx            <- NEW: execution trend page
              coverage/
                page.tsx            <- NEW: coverage report page
    messages/
      pt-BR.json                    <- MODIFY: add reports namespace
      en-US.json                    <- MODIFY: add reports namespace
```

---

## Task 1: ReportService (Backend)

**Files:**
- Create: `backend/src/domain/interfaces/IReportService.ts`
- Create: `backend/src/services/ReportService.ts`
- Create: `backend/tests/services/ReportService.test.ts`

### Types and Interface

- [ ] **Step 1: Define report data types and service interface**

Create `backend/src/domain/interfaces/IReportService.ts` with these types:

```typescript
// backend/src/domain/interfaces/IReportService.ts

export interface DashboardData {
  totalPlans: number
  plansByStatus: { statusLabel: string; statusColor: string | null; count: number }[]
  totalCases: number
  casesByPriority: { priorityLabel: string; priorityColor: string | null; count: number }[]
  casesByType: { typeLabel: string; typeColor: string | null; count: number }[]
  executionSummary: {
    total: number
    passed: number
    failed: number
    blocked: number
    skipped: number
    passRate: number   // 0-100 percentage
  }
  openBugsByPriority: { priorityLabel: string; priorityColor: string | null; count: number }[]
  openBugsBySeverity: { severityLabel: string; severityColor: string | null; count: number }[]
  recentExecutions: {
    id: string
    testCaseTitle: string
    statusLabel: string
    statusColor: string | null
    executedByName: string | null
    executedAt: string  // ISO date
  }[]
  recentBugs: {
    id: string
    title: string
    statusLabel: string
    priorityLabel: string
    severityLabel: string
    reportedByName: string | null
    createdAt: string  // ISO date
  }[]
}

export interface TrendDataPoint {
  date: string          // ISO date (day) or ISO week start
  passed: number
  failed: number
  blocked: number
  skipped: number
  total: number
}

export interface TrendData {
  granularity: 'daily' | 'weekly'
  from: string
  to: string
  points: TrendDataPoint[]
  summary: {
    totalExecutions: number
    overallPassRate: number
  }
}

export interface CoverageSuite {
  suiteId: string
  suiteName: string
  totalCases: number
  passed: number
  failed: number
  notRun: number
  percentComplete: number  // 0-100
}

export interface CoverageData {
  totalCases: number
  executed: number
  passed: number
  failed: number
  notRun: number
  percentComplete: number
  suites: CoverageSuite[]
}

export interface IReportService {
  getDashboard(projectId: string): Promise<DashboardData>
  getExecutionTrend(planId: string, from: Date, to: Date, granularity: 'daily' | 'weekly'): Promise<TrendData>
  getCoverage(planId: string): Promise<CoverageData>
}
```

### Service Implementation

- [ ] **Step 2: Implement `ReportService.getDashboard`**

Create `backend/src/services/ReportService.ts`. The `getDashboard` method must run optimized Prisma queries:

1. **Total plans by status:** `prisma.testPlan.groupBy({ by: ['statusId'], where: { projectId }, _count: true })` then join with EnumValue for labels/colors.
2. **Total cases by priority:** Join TestCase -> TestSuite -> TestPlan (where projectId), group by priorityId. Use `prisma.testCase.groupBy(...)` with a nested where filter.
3. **Total cases by type:** Same pattern, group by typeId.
4. **Execution summary:** Query all TestExecution records for the project (through TestPlan). Group by status systemKey (passed/failed/blocked/skipped). Calculate passRate as `(passed / total) * 100`. Use `prisma.testExecution.groupBy({ by: ['statusId'], where: { testPlan: { projectId } }, _count: true })`.
5. **Open bugs by priority:** `prisma.bug.groupBy({ by: ['priorityId'], where: { projectId, status: { systemKey: { notIn: ['closed', 'resolved'] } } }, _count: true })`. Join with EnumValue for labels.
6. **Open bugs by severity:** Same pattern, group by severityId.
7. **Recent executions (last 10):** `prisma.testExecution.findMany({ where: { testPlan: { projectId } }, orderBy: { executedAt: 'desc' }, take: 10, include: { testCase: { select: { title: true } }, status: { select: { label: true, color: true } }, executedBy: { select: { name: true } } } })`.
8. **Recent bugs (last 10):** `prisma.bug.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' }, take: 10, include: { status, priority, severity, reportedBy } })`.

Key patterns:
- All queries scoped to the given projectId.
- Use `Promise.all` to run independent queries in parallel for performance.
- Map EnumValue fields to `{ label, color }` in the response.
- Return percentages rounded to 2 decimal places.

- [ ] **Step 3: Implement `ReportService.getExecutionTrend`**

The method receives `planId`, `from`, `to`, `granularity`.

1. Query raw SQL via `prisma.$queryRaw` for date-based grouping (Prisma groupBy does not support date truncation):

```sql
SELECT
  DATE_TRUNC($1, te."executedAt") AS bucket,
  ev."systemKey" AS status,
  COUNT(*)::int AS count
FROM test_executions te
JOIN enum_values ev ON ev.id = te."statusId"
WHERE te."testPlanId" = $2
  AND te."executedAt" >= $3
  AND te."executedAt" <= $4
GROUP BY bucket, ev."systemKey"
ORDER BY bucket ASC
```

Where `$1` is `'day'` or `'week'` based on granularity.

2. Transform raw results into `TrendDataPoint[]`: for each bucket date, fill in 0 for missing statuses (passed, failed, blocked, skipped).
3. Calculate summary: sum all counts, compute overall pass rate.

- [ ] **Step 4: Implement `ReportService.getCoverage`**

1. Fetch all suites for the plan: `prisma.testSuite.findMany({ where: { testPlanId: planId }, include: { cases: { select: { id: true } } } })`.
2. For each case in the plan, find its latest execution: use a subquery or `prisma.testExecution.findMany({ where: { testPlanId: planId }, distinct: ['testCaseId'], orderBy: { executedAt: 'desc' }, include: { status: true } })`.
3. Build a map of `testCaseId -> latestStatus`.
4. For each suite, count passed/failed/notRun by checking its cases against the map. Cases with no execution are "notRun".
5. Calculate per-suite `percentComplete = ((passed + failed) / totalCases) * 100` (or just `(passed / totalCases) * 100` -- use executed/total).
6. Roll up to totals.

Optimization: run the "latest execution per case" query as a single raw SQL with `DISTINCT ON`:

```sql
SELECT DISTINCT ON (te."testCaseId")
  te."testCaseId",
  ev."systemKey" AS status
FROM test_executions te
JOIN enum_values ev ON ev.id = te."statusId"
WHERE te."testPlanId" = $1
ORDER BY te."testCaseId", te."executedAt" DESC
```

- [ ] **Step 5: Write unit tests**

Create `backend/tests/services/ReportService.test.ts`. Test with mocked Prisma client (use `vitest.mock`):

1. `getDashboard` returns correct structure with aggregated data.
2. `getExecutionTrend` fills in zero-count dates for missing buckets.
3. `getCoverage` correctly identifies notRun cases (no execution) and calculates percentages.
4. Edge cases: empty project (no plans, no cases), plan with no executions.

```bash
cd backend && npx vitest run tests/services/ReportService.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/domain/interfaces/IReportService.ts backend/src/services/ReportService.ts backend/tests/services/ReportService.test.ts
git commit -m "feat(backend): add ReportService with dashboard, trend, and coverage queries"
```

---

## Task 2: Export Service (Backend)

**Files:**
- Modify: `backend/package.json` (add pdfkit, @types/pdfkit, exceljs)
- Modify: `backend/src/config.ts` (add EXPORT_TTL_HOURS)
- Create: `backend/src/infrastructure/queue/bullmq.ts`
- Create: `backend/src/infrastructure/queue/ExportWorker.ts`
- Create: `backend/src/infrastructure/queue/ExportJobStore.ts`
- Modify: `backend/src/services/ReportService.ts` (add exportReport method)

### Dependencies and Config

- [ ] **Step 1: Install export dependencies**

```bash
cd backend && npm install pdfkit exceljs && npm install -D @types/pdfkit
```

- [ ] **Step 2: Add EXPORT_TTL_HOURS to config**

In `backend/src/config.ts`, add to the `configSchema`:

```typescript
EXPORT_TTL_HOURS: z.coerce.number().int().min(1).default(24),
```

### BullMQ Queue Setup

- [ ] **Step 3: Create shared BullMQ connection and queue factory**

Create `backend/src/infrastructure/queue/bullmq.ts`:

```typescript
import { Queue, Worker, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'
import { config } from '../../config.js'

let connection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null })
  }
  return connection
}

export function createQueue(name: string): Queue {
  return new Queue(name, { connection: getRedisConnection() })
}

export const EXPORT_QUEUE_NAME = 'report-export'
```

Key: BullMQ requires `maxRetriesPerRequest: null` on the Redis connection.

- [ ] **Step 4: Create ExportJobStore**

Create `backend/src/infrastructure/queue/ExportJobStore.ts`:

- Use Redis hash to store job status: `{ jobId, status: 'pending'|'processing'|'completed'|'failed', downloadUrl?: string, error?: string, createdAt }`.
- Methods: `setStatus(jobId, data)`, `getStatus(jobId)`.
- Set TTL on Redis key equal to `EXPORT_TTL_HOURS` (auto-cleanup).

```typescript
import { getRedisConnection } from './bullmq.js'
import { config } from '../../config.js'

export interface ExportJobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  format: 'pdf' | 'csv' | 'excel'
  downloadUrl?: string
  error?: string
  createdAt: string
}

export class ExportJobStore {
  private keyPrefix = 'export-job:'

  async setStatus(jobId: string, data: Partial<ExportJobStatus>): Promise<void> {
    const redis = getRedisConnection()
    const key = `${this.keyPrefix}${jobId}`
    await redis.hset(key, data as Record<string, string>)
    await redis.expire(key, config.EXPORT_TTL_HOURS * 3600)
  }

  async getStatus(jobId: string): Promise<ExportJobStatus | null> {
    const redis = getRedisConnection()
    const data = await redis.hgetall(`${this.keyPrefix}${jobId}`)
    if (!data || !data.status) return null
    return data as unknown as ExportJobStatus
  }
}
```

### Export Worker

- [ ] **Step 5: Create ExportWorker**

Create `backend/src/infrastructure/queue/ExportWorker.ts`:

1. Create a BullMQ `Worker` listening on `EXPORT_QUEUE_NAME`.
2. Job data shape: `{ planId: string, format: 'pdf' | 'csv' | 'excel', jobId: string, actorId: string }`.
3. Worker handler:
   - Set job status to `'processing'` via ExportJobStore.
   - Instantiate ReportService, fetch dashboard + coverage + trend data for the plan's project.
   - Branch by format:
     - **CSV:** Generate CSV string with coverage data (suite, total, passed, failed, notRun, %). Use simple string concatenation or a lightweight helper. Save as `.csv`.
     - **Excel:** Use `exceljs` Workbook. Create sheets: "Summary" (execution stats), "Coverage" (per-suite table), "Trend" (date, passed, failed, blocked, skipped). Save as `.xlsx`.
     - **PDF:** Use `pdfkit`. Write title, summary stats table, coverage table. No charts in PDF (keeps it simple). Save as `.pdf`.
   - Save generated file buffer via `IFileStorageAdapter.save()` to path `exports/{jobId}.{ext}`.
   - Get download URL via `IFileStorageAdapter.getUrl()`.
   - Update job status to `'completed'` with `downloadUrl`.
   - On error: update job status to `'failed'` with error message. Log error.

4. Concurrency: set worker concurrency to 2 (configurable).

Key patterns:
- Import storage adapter via `storageFactory` (already exists in infrastructure/storage).
- The worker should be started from `backend/src/index.ts` (or a separate worker entry point).
- Wrap the entire handler in try/catch to guarantee status update on failure.

- [ ] **Step 6: Add exportReport method to ReportService**

Add to `backend/src/services/ReportService.ts`:

```typescript
async exportReport(planId: string, format: 'pdf' | 'csv' | 'excel', actorId: string): Promise<string> {
  const jobId = randomUUID()
  const queue = createQueue(EXPORT_QUEUE_NAME)
  await queue.add('export', { planId, format, jobId, actorId })

  const store = new ExportJobStore()
  await store.setStatus(jobId, {
    jobId,
    status: 'pending',
    format,
    createdAt: new Date().toISOString(),
  })

  return jobId
}
```

- [ ] **Step 7: Start export worker from server entry point**

Modify `backend/src/index.ts`: after the Fastify server starts, import and call a function that initializes the ExportWorker. The worker should log on startup. Ensure graceful shutdown: on `SIGTERM`/`SIGINT`, close the worker before the server.

- [ ] **Step 8: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/config.ts \
  backend/src/infrastructure/queue/ backend/src/services/ReportService.ts backend/src/index.ts
git commit -m "feat(backend): add BullMQ export worker with PDF, CSV, and Excel generation"
```

---

## Task 3: Report API Routes (Backend)

**Files:**
- Create: `backend/src/interfaces/http/routes/reports.ts`
- Create: `backend/src/interfaces/http/routes/jobs.ts`
- Modify: `backend/src/app.ts` (register new routes)
- Create: `backend/tests/routes/reports.test.ts`

### Report Routes

- [ ] **Step 1: Create report routes file**

Create `backend/src/interfaces/http/routes/reports.ts` with the following endpoints:

**GET `/projects/:id/reports/dashboard`**
- Auth required (JWT via onRequest hook -- already global).
- Schema: params `{ id: string (uuid) }`.
- Handler: call `reportService.getDashboard(id)`, return 200 with DashboardData.
- Swagger tags: `['Reports']`.

**GET `/test-plans/:id/reports/trend`**
- Auth required.
- Schema: params `{ id: string (uuid) }`, querystring `{ from: string (YYYY-MM-DD), to: string (YYYY-MM-DD), granularity: 'daily' | 'weekly' }`.
- Validate: `from` < `to`, range max 365 days, `from` is valid ISO date.
- Handler: call `reportService.getExecutionTrend(id, from, to, granularity)`, return 200.

**GET `/test-plans/:id/reports/coverage`**
- Auth required.
- Schema: params `{ id: string (uuid) }`.
- Handler: call `reportService.getCoverage(id)`, return 200.

**POST `/test-plans/:id/reports/export`**
- Auth required.
- Schema: params `{ id: string (uuid) }`, body `{ format: 'pdf' | 'csv' | 'excel' }`.
- Handler: call `reportService.exportReport(id, format, request.user.userId)`, return 202 with `{ jobId }`.

Use Zod for request validation. Convert Zod schemas to JSON Schema for Swagger using `zodToJsonSchema` or manually define Fastify JSON schemas (follow the pattern used in existing routes like `auth.ts`).

- [ ] **Step 2: Create job status polling route**

Create `backend/src/interfaces/http/routes/jobs.ts`:

**GET `/jobs/:jobId`**
- Auth required.
- Schema: params `{ jobId: string (uuid) }`.
- Handler: call `exportJobStore.getStatus(jobId)`.
- If not found: return 404 `{ error: 'Job not found' }`.
- Return 200 with `ExportJobStatus` object.
- Swagger tags: `['Jobs']`.

- [ ] **Step 3: Register routes in app.ts**

In `backend/src/app.ts`:

```typescript
import { reportRoutes } from './interfaces/http/routes/reports.js'
import { jobRoutes } from './interfaces/http/routes/jobs.js'

// Inside buildApp(), after existing route registrations:
await app.register(reportRoutes, { prefix: '/api/v1' })
await app.register(jobRoutes, { prefix: '/api/v1' })
```

- [ ] **Step 4: Write route integration tests**

Create `backend/tests/routes/reports.test.ts`:

1. Test `GET /api/v1/projects/:id/reports/dashboard` returns 200 with expected shape.
2. Test `GET /api/v1/test-plans/:id/reports/trend` with valid query params returns 200.
3. Test `GET /api/v1/test-plans/:id/reports/trend` with missing `from`/`to` returns 400.
4. Test `GET /api/v1/test-plans/:id/reports/coverage` returns 200.
5. Test `POST /api/v1/test-plans/:id/reports/export` with `{ format: 'csv' }` returns 202 with jobId.
6. Test `POST /api/v1/test-plans/:id/reports/export` with invalid format returns 400.
7. Test `GET /api/v1/jobs/:jobId` with nonexistent jobId returns 404.
8. All tests require valid JWT in Authorization header.

```bash
cd backend && npx vitest run tests/routes/reports.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/interfaces/http/routes/reports.ts backend/src/interfaces/http/routes/jobs.ts \
  backend/src/app.ts backend/tests/routes/reports.test.ts
git commit -m "feat(backend): add report and job status API routes"
```

---

## Task 4: Chart Library Setup (Frontend)

**Files:**
- Modify: `frontend/package.json` (add recharts)
- Create: `frontend/src/components/charts/ChartWrapper.tsx`
- Create: `frontend/src/components/charts/StatusDonutChart.tsx`
- Create: `frontend/src/components/charts/BarChartCard.tsx`
- Create: `frontend/src/components/charts/TrendAreaChart.tsx`
- Create: `frontend/src/components/charts/CoverageProgressBar.tsx`
- Create: `frontend/src/lib/formatters.ts`

### Install and Configure

- [ ] **Step 1: Install recharts**

```bash
cd frontend && npm install recharts
```

Note: recharts v2 is compatible with React 19. Verify no peer dependency conflicts after install.

- [ ] **Step 2: Create locale-aware formatting helpers**

Create `frontend/src/lib/formatters.ts`:

```typescript
// Locale-aware number and date formatting using Intl APIs.

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatPercent(value: number, locale: string, decimals = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

export function formatDate(date: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
```

- [ ] **Step 3: Create ChartWrapper component**

Create `frontend/src/components/charts/ChartWrapper.tsx`:

- A container component that provides consistent sizing, padding, and theme-aware colors.
- Use `'use client'` directive (recharts requires browser APIs).
- Read theme from `next-themes` `useTheme()` hook.
- Define a color palette as CSS variables or a JS object that switches based on theme:

```typescript
'use client'

import { useTheme } from 'next-themes'
import { ResponsiveContainer } from 'recharts'

// Status colors (consistent across charts)
export const STATUS_COLORS = {
  passed: { light: '#16a34a', dark: '#4ade80' },
  failed: { light: '#dc2626', dark: '#f87171' },
  blocked: { light: '#d97706', dark: '#fbbf24' },
  skipped: { light: '#6b7280', dark: '#9ca3af' },
  notRun: { light: '#a3a3a3', dark: '#525252' },
}

export function useChartColors() {
  const { resolvedTheme } = useTheme()
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light'
  return {
    passed: STATUS_COLORS.passed[mode],
    failed: STATUS_COLORS.failed[mode],
    blocked: STATUS_COLORS.blocked[mode],
    skipped: STATUS_COLORS.skipped[mode],
    notRun: STATUS_COLORS.notRun[mode],
    grid: mode === 'dark' ? '#374151' : '#e5e7eb',
    text: mode === 'dark' ? '#d1d5db' : '#374151',
    background: mode === 'dark' ? '#111827' : '#ffffff',
  }
}

interface ChartWrapperProps {
  children: React.ReactNode
  height?: number
  title?: string
}

export function ChartWrapper({ children, height = 300, title }: ChartWrapperProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      {title && (
        <h3 className="mb-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Create StatusDonutChart**

Create `frontend/src/components/charts/StatusDonutChart.tsx`:

- `'use client'` component.
- Props: `data: { name: string; value: number; color: string }[]`, optional `innerLabel` (e.g., pass rate %).
- Uses recharts `PieChart` + `Pie` with `innerRadius` and `outerRadius` for donut shape.
- Custom center label using recharts `text` or a positioned `div`.
- Tooltip shows count and percentage.
- Wraps in `ChartWrapper`.

- [ ] **Step 5: Create BarChartCard**

Create `frontend/src/components/charts/BarChartCard.tsx`:

- `'use client'` component.
- Props: `data: { name: string; value: number; color?: string }[]`, `title: string`, `layout?: 'vertical' | 'horizontal'`.
- Uses recharts `BarChart` + `Bar` + `XAxis` + `YAxis` + `Tooltip`.
- Each bar can have its own color (via `Cell` component) or a single color.
- Grid lines use theme-aware colors from `useChartColors()`.

- [ ] **Step 6: Create TrendAreaChart**

Create `frontend/src/components/charts/TrendAreaChart.tsx`:

- `'use client'` component.
- Props: `data: TrendDataPoint[]`, `granularity: 'daily' | 'weekly'`, `locale: string`.
- Uses recharts `AreaChart` with stacked `Area` components for each status (passed, failed, blocked, skipped).
- X-axis: formatted dates (locale-aware via `formatDate`).
- Y-axis: integer counts.
- Tooltip: shows all statuses for the hovered date.
- Legend at bottom.

- [ ] **Step 7: Create CoverageProgressBar**

Create `frontend/src/components/charts/CoverageProgressBar.tsx`:

- Simple non-recharts component (div-based progress bar).
- Props: `percent: number`, `label?: string`, `size?: 'sm' | 'md' | 'lg'`.
- Color: green for > 80%, yellow for 50-80%, red for < 50%.
- Shows percentage text inside or beside the bar.
- Tailwind-only, no chart library needed.

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/formatters.ts \
  frontend/src/components/charts/
git commit -m "feat(frontend): add recharts setup with theme-aware chart components"
```

---

## Task 5: Frontend -- Project Dashboard Page

**Files:**
- Create: `frontend/src/components/reports/StatCard.tsx`
- Create: `frontend/src/components/reports/StatCardGrid.tsx`
- Create: `frontend/src/components/reports/RecentActivityFeed.tsx`
- Create: `frontend/src/app/[locale]/projects/[id]/dashboard/page.tsx`
- Modify: `frontend/src/lib/api.ts` (add getDashboard function)
- Modify: `frontend/src/messages/pt-BR.json` (add reports.dashboard namespace)
- Modify: `frontend/src/messages/en-US.json` (add reports.dashboard namespace)

### API Client

- [ ] **Step 1: Add report API functions to api.ts**

Add to `frontend/src/lib/api.ts`:

```typescript
export async function getDashboard(projectId: string): Promise<DashboardData> {
  return apiFetch(`/projects/${projectId}/reports/dashboard`)
}

export async function getExecutionTrend(
  planId: string,
  from: string,
  to: string,
  granularity: 'daily' | 'weekly'
): Promise<TrendData> {
  const params = new URLSearchParams({ from, to, granularity })
  return apiFetch(`/test-plans/${planId}/reports/trend?${params}`)
}

export async function getCoverage(planId: string): Promise<CoverageData> {
  return apiFetch(`/test-plans/${planId}/reports/coverage`)
}

export async function exportReport(
  planId: string,
  format: 'pdf' | 'csv' | 'excel'
): Promise<{ jobId: string }> {
  return apiFetch(`/test-plans/${planId}/reports/export`, {
    method: 'POST',
    body: JSON.stringify({ format }),
  })
}

export async function getJobStatus(jobId: string): Promise<ExportJobStatus> {
  return apiFetch(`/jobs/${jobId}`)
}
```

Also add the TypeScript types (`DashboardData`, `TrendData`, `CoverageData`, `ExportJobStatus`) matching the backend interfaces. Place these in `frontend/src/lib/api.ts` or a separate `frontend/src/lib/types/reports.ts` file.

### i18n Messages

- [ ] **Step 2: Add report translation strings**

Add a `reports` namespace to both locale files. Example keys:

```json
{
  "reports": {
    "dashboard": {
      "title": "Project Dashboard",
      "totalPlans": "Total Plans",
      "totalCases": "Total Cases",
      "passRate": "Pass Rate",
      "openBugs": "Open Bugs",
      "executionStatus": "Execution Status",
      "bugsByPriority": "Bugs by Priority",
      "bugsBySeverity": "Bugs by Severity",
      "recentExecutions": "Recent Executions",
      "recentBugs": "Recent Bugs",
      "noData": "No data available"
    },
    "trend": {
      "title": "Execution Trend",
      "dateRange": "Date Range",
      "from": "From",
      "to": "To",
      "granularity": "Granularity",
      "daily": "Daily",
      "weekly": "Weekly",
      "totalExecutions": "Total Executions",
      "passRateTrend": "Pass Rate Trend"
    },
    "coverage": {
      "title": "Coverage Report",
      "overallProgress": "Overall Progress",
      "suite": "Suite",
      "totalCases": "Total Cases",
      "passed": "Passed",
      "failed": "Failed",
      "notRun": "Not Run",
      "complete": "Complete"
    },
    "export": {
      "title": "Export Report",
      "selectFormat": "Select Format",
      "pdf": "PDF",
      "csv": "CSV",
      "excel": "Excel",
      "exporting": "Generating report...",
      "download": "Download",
      "failed": "Export failed"
    }
  }
}
```

Provide equivalent pt-BR translations in `pt-BR.json`.

### Components

- [ ] **Step 3: Create StatCard component**

Create `frontend/src/components/reports/StatCard.tsx`:

- `'use client'` component.
- Props: `title: string`, `value: string | number`, `icon: LucideIcon`, `subtitle?: string`, `trend?: 'up' | 'down' | 'neutral'`.
- Layout: icon top-left, large value center, title below, optional subtitle.
- Use Lucide React icons (e.g., `FileText`, `Bug`, `CheckCircle`, `BarChart3`).
- Card styling: `rounded-lg border bg-white dark:bg-zinc-950 p-6`.

- [ ] **Step 4: Create StatCardGrid component**

Create `frontend/src/components/reports/StatCardGrid.tsx`:

- Simple grid wrapper: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
- Accepts `children` (StatCard instances).

- [ ] **Step 5: Create RecentActivityFeed component**

Create `frontend/src/components/reports/RecentActivityFeed.tsx`:

- `'use client'` component.
- Props: `executions: DashboardData['recentExecutions']`, `bugs: DashboardData['recentBugs']`, `locale: string`.
- Two-column layout on desktop, stacked on mobile.
- Left column: "Recent Executions" -- list items showing test case title, status badge (colored), executor name, relative time.
- Right column: "Recent Bugs" -- list items showing bug title, priority/severity badges, reporter name, relative time.
- Use `formatDateTime` from formatters.ts for dates.

### Dashboard Page

- [ ] **Step 6: Create dashboard page**

Create `frontend/src/app/[locale]/projects/[id]/dashboard/page.tsx`:

**IMPORTANT:** Before writing this file, read Next.js 16 docs in `frontend/node_modules/next/dist/docs/` to check for breaking changes in dynamic route params, data fetching, and page component signatures.

Page structure:
1. This is a client component (`'use client'`) since it contains interactive charts.
2. Read `projectId` from route params and `locale` from params (follow Next.js 16 conventions).
3. Use `useEffect` + `useState` to fetch dashboard data via `getDashboard(projectId)`.
4. Use `useTranslations('reports.dashboard')` from next-intl for labels.
5. Show loading skeletons (pulsing gray boxes) while data is loading.
6. Layout (top to bottom):
   - **Page title:** "Project Dashboard"
   - **StatCardGrid:** 4 cards -- Total Plans, Total Cases, Pass Rate %, Open Bugs count.
   - **Charts row (2 columns on desktop):**
     - Left: StatusDonutChart showing execution summary (pass/fail/blocked/skipped).
     - Right: BarChartCard showing open bugs by priority.
   - **Second charts row:**
     - Left: BarChartCard showing bugs by severity.
     - Right: BarChartCard showing cases by priority (or cases by type -- pick one).
   - **RecentActivityFeed:** latest executions + bugs.
7. Format all numbers with `formatNumber(value, locale)` and percentages with `formatPercent(value, locale)`.

- [ ] **Step 7: Add loading skeletons**

Inside the dashboard page, create a `DashboardSkeleton` component (can be inline or separate file):
- 4 skeleton stat cards (gray pulsing rectangles).
- 2 skeleton chart areas.
- Skeleton list items for activity feed.
- Use Tailwind `animate-pulse` on `bg-zinc-200 dark:bg-zinc-800` divs.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/reports/ frontend/src/app/[locale]/projects/[id]/dashboard/ \
  frontend/src/lib/api.ts frontend/src/messages/
git commit -m "feat(frontend): add project dashboard page with stat cards and charts"
```

---

## Task 6: Frontend -- Execution Trend Page

**Files:**
- Create: `frontend/src/components/reports/DateRangePicker.tsx`
- Create: `frontend/src/components/reports/GranularityToggle.tsx`
- Create: `frontend/src/app/[locale]/test-plans/[id]/reports/trend/page.tsx`

### Components

- [ ] **Step 1: Create DateRangePicker component**

Create `frontend/src/components/reports/DateRangePicker.tsx`:

- `'use client'` component.
- Props: `from: string`, `to: string`, `onChange: (from: string, to: string) => void`, `locale: string`.
- Two native `<input type="date" />` fields (or use a shadcn/ui date picker if available).
- Validate: `from` must be before `to`, range must not exceed 365 days.
- Show validation error inline if constraints violated.
- Default range: last 30 days.

- [ ] **Step 2: Create GranularityToggle component**

Create `frontend/src/components/reports/GranularityToggle.tsx`:

- `'use client'` component.
- Props: `value: 'daily' | 'weekly'`, `onChange: (value: 'daily' | 'weekly') => void`.
- Two toggle buttons styled like a segmented control.
- Active button has filled background, inactive has outline.
- Use i18n labels from `reports.trend.daily` / `reports.trend.weekly`.

### Trend Page

- [ ] **Step 3: Create execution trend page**

Create `frontend/src/app/[locale]/test-plans/[id]/reports/trend/page.tsx`:

**IMPORTANT:** Read Next.js 16 docs for dynamic route params before writing.

Page structure:
1. `'use client'` component.
2. State: `from` (default: 30 days ago), `to` (default: today), `granularity` (default: 'daily'), `data: TrendData | null`, `loading: boolean`.
3. Fetch data on mount and whenever from/to/granularity changes (use `useEffect` with dependencies).
4. Layout:
   - **Page title:** "Execution Trend"
   - **Controls row:** DateRangePicker + GranularityToggle side by side.
   - **Summary stat cards (2):** Total Executions, Overall Pass Rate. Use StatCard components.
   - **TrendAreaChart:** full width, stacked area chart showing trend data.
5. Loading state: show skeleton chart while fetching.
6. Empty state: if no data points, show a message "No executions found in this date range."
7. All numbers formatted with locale.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/reports/DateRangePicker.tsx \
  frontend/src/components/reports/GranularityToggle.tsx \
  frontend/src/app/[locale]/test-plans/[id]/reports/trend/
git commit -m "feat(frontend): add execution trend page with date range and area chart"
```

---

## Task 7: Frontend -- Coverage Report Page

**Files:**
- Create: `frontend/src/components/reports/CoverageSuiteTable.tsx`
- Create: `frontend/src/app/[locale]/test-plans/[id]/reports/coverage/page.tsx`

### Components

- [ ] **Step 1: Create CoverageSuiteTable component**

Create `frontend/src/components/reports/CoverageSuiteTable.tsx`:

- `'use client'` component.
- Props: `suites: CoverageSuite[]`, `locale: string`, `onSuiteClick?: (suiteId: string) => void`.
- Render an HTML `<table>` with columns: Suite Name, Total Cases, Passed, Failed, Not Run, % Complete.
- Each row shows a mini CoverageProgressBar in the "% Complete" column.
- Passed/Failed/Not Run cells have colored text (green/red/gray).
- Sortable by clicking column headers (client-side sort). Default sort: by suite name.
- On small screens: add `overflow-x-auto` wrapper so the table scrolls horizontally.
- If `onSuiteClick` is provided, suite name is a clickable link.
- Footer row: totals across all suites.

- [ ] **Step 2: Create coverage report page**

Create `frontend/src/app/[locale]/test-plans/[id]/reports/coverage/page.tsx`:

**IMPORTANT:** Read Next.js 16 docs for dynamic route params before writing.

Page structure:
1. `'use client'` component.
2. Fetch coverage data via `getCoverage(planId)` on mount.
3. Layout:
   - **Page title:** "Coverage Report"
   - **Overall progress section:**
     - Large CoverageProgressBar showing overall `percentComplete`.
     - Summary stats row: Total Cases, Passed, Failed, Not Run (as StatCards or inline).
   - **Visual breakdown:**
     - StatusDonutChart showing passed/failed/notRun distribution.
     - OR a horizontal stacked bar chart (one bar per suite, stacked by status).
     - Choose the donut for simplicity.
   - **Per-suite breakdown table:** CoverageSuiteTable with all suites.
4. Loading skeleton while data loads.
5. Locale-aware formatting for all numbers and percentages.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reports/CoverageSuiteTable.tsx \
  frontend/src/app/[locale]/test-plans/[id]/reports/coverage/
git commit -m "feat(frontend): add coverage report page with suite breakdown table"
```

---

## Task 8: Frontend -- Export Report

**Files:**
- Create: `frontend/src/components/reports/ExportDialog.tsx`

### Export Dialog

- [ ] **Step 1: Create ExportDialog component**

Create `frontend/src/components/reports/ExportDialog.tsx`:

- `'use client'` component.
- Props: `planId: string`, `trigger: React.ReactNode` (button that opens the dialog).
- State: `open: boolean`, `format: 'pdf' | 'csv' | 'excel'`, `jobId: string | null`, `status: ExportJobStatus | null`, `polling: boolean`.
- UI:
  1. **Trigger:** renders the trigger prop (e.g., a button with Download icon from Lucide).
  2. **Dialog/Modal:** when open, shows:
     - Title: "Export Report"
     - Three radio/button options: PDF, CSV, Excel. Each with a description and icon (FileText, Table, Sheet from Lucide).
     - "Generate" button.
  3. **On generate click:**
     - Call `exportReport(planId, format)` to get `jobId`.
     - Start polling: call `getJobStatus(jobId)` every 2 seconds.
     - Show a spinner/progress indicator with "Generating report..." text.
  4. **On completed:**
     - Show "Download" button/link pointing to `status.downloadUrl`.
     - Optionally auto-trigger download via `window.open(downloadUrl)` or an anchor click.
  5. **On failed:**
     - Show error message from `status.error`.
     - Show "Retry" button.
  6. **Cleanup:** clear polling interval on unmount or dialog close.

- Use a simple dialog implementation: a fixed overlay with a centered card. Or use the HTML `<dialog>` element. Do not add a heavy dialog library -- keep deps minimal. If shadcn/ui `Dialog` is already set up, use that.

- [ ] **Step 2: Add ExportDialog to dashboard, trend, and coverage pages**

In each of the three report pages, add an ExportDialog in the top-right corner of the page header:

```tsx
<ExportDialog
  planId={planId}
  trigger={
    <button className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <Download className="h-4 w-4" />
      {t('export.title')}
    </button>
  }
/>
```

Note: The dashboard page is project-level, not plan-level. Either:
- Option A: Do not show export on dashboard (export is plan-level only). Show it only on trend and coverage pages.
- Option B: If dashboard should support export, let the user select a plan first, then export.

Recommended: **Option A** -- export only on trend and coverage pages (they already have a planId).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/reports/ExportDialog.tsx \
  frontend/src/app/[locale]/test-plans/[id]/reports/
git commit -m "feat(frontend): add export dialog with format selection and job polling"
```

---

## Task 9: Frontend -- Responsive + Theme

**Files:**
- Modify: all chart and report components created in Tasks 4-8

This task is about reviewing and hardening the responsive and theme behavior of all components created above. It can be done as a pass over existing code.

### Responsive Layout

- [ ] **Step 1: Verify chart responsiveness**

Ensure all chart components use `<ResponsiveContainer width="100%" height={...}>` from recharts. This makes charts resize automatically with their parent container. Test by resizing the browser window.

- [ ] **Step 2: Verify stat card grid stacking**

Confirm `StatCardGrid` uses `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`. On mobile (< 640px), cards should stack into a single column.

- [ ] **Step 3: Verify table horizontal scroll**

Confirm `CoverageSuiteTable` wraps the table in `<div className="overflow-x-auto">` so it scrolls horizontally on small screens instead of breaking the layout.

- [ ] **Step 4: Verify controls layout**

On the trend page, ensure DateRangePicker and GranularityToggle stack vertically on mobile:
```
flex flex-col sm:flex-row gap-4
```

### Theme Adaptation

- [ ] **Step 5: Verify chart colors in dark mode**

All chart components must use colors from `useChartColors()`. Toggle between dark and light themes and verify:
- Chart backgrounds are transparent or match the card background.
- Grid lines are visible but not harsh in both themes.
- Status colors are distinguishable in both themes.
- Tooltip backgrounds contrast with chart background.

- [ ] **Step 6: Verify text contrast**

All text (axis labels, legends, tooltips, stat card values) must be readable in both themes. Use `text-zinc-900 dark:text-zinc-100` for primary text, `text-zinc-600 dark:text-zinc-400` for secondary text.

- [ ] **Step 7: Commit (if changes were needed)**

```bash
git add frontend/src/components/charts/ frontend/src/components/reports/ \
  frontend/src/app/[locale]/
git commit -m "fix(frontend): improve responsive layout and dark theme for report components"
```

---

## Task 10: Verification

This task validates the complete implementation end-to-end.

### Backend Verification

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && npx vitest run
```

All tests must pass, including the new `ReportService.test.ts` and `reports.test.ts`.

- [ ] **Step 2: Verify Swagger documentation**

Start the backend server and visit `/docs`. Confirm:
- `GET /projects/:id/reports/dashboard` is listed under Reports tag with correct response schema.
- `GET /test-plans/:id/reports/trend` shows `from`, `to`, `granularity` query params.
- `GET /test-plans/:id/reports/coverage` is listed with correct response schema.
- `POST /test-plans/:id/reports/export` shows request body with `format` enum.
- `GET /jobs/:jobId` is listed under Jobs tag.

- [ ] **Step 3: Test dashboard endpoint manually**

Using curl or the Swagger UI, call `GET /api/v1/projects/{projectId}/reports/dashboard` with a valid JWT. Verify the response contains:
- `totalPlans`, `totalCases` as numbers.
- `executionSummary` with `passRate` between 0-100.
- `openBugsByPriority` and `openBugsBySeverity` as arrays with `count` fields.
- `recentExecutions` and `recentBugs` as arrays (up to 10 items each).

- [ ] **Step 4: Test trend endpoint**

Call `GET /api/v1/test-plans/{planId}/reports/trend?from=2026-01-01&to=2026-03-24&granularity=daily`. Verify:
- Response contains `points` array with `date`, `passed`, `failed`, `blocked`, `skipped` fields.
- `summary.totalExecutions` and `summary.overallPassRate` are present.
- Dates in `points` are sorted ascending.

- [ ] **Step 5: Test coverage endpoint**

Call `GET /api/v1/test-plans/{planId}/reports/coverage`. Verify:
- Response contains `totalCases`, `passed`, `failed`, `notRun`, `percentComplete`.
- `suites` array has per-suite breakdown with correct counts.
- `percentComplete` values are between 0-100.

- [ ] **Step 6: Test export flow**

1. Call `POST /api/v1/test-plans/{planId}/reports/export` with `{ "format": "csv" }`.
2. Verify response is 202 with `{ "jobId": "..." }`.
3. Poll `GET /api/v1/jobs/{jobId}` until status is `"completed"`.
4. Verify `downloadUrl` is present and the file is downloadable.
5. Repeat for `"pdf"` and `"excel"` formats.
6. Verify CSV file has correct headers and data rows.
7. Verify Excel file opens and has multiple sheets (Summary, Coverage, Trend).
8. Verify PDF file opens and contains report title and data tables.

### Frontend Verification

- [ ] **Step 7: Verify dashboard page renders**

Navigate to `/pt-BR/projects/{id}/dashboard`. Verify:
- Stat cards show correct numbers (matching API response).
- Donut chart shows execution status distribution.
- Bar charts show bugs by priority and severity.
- Recent activity feed shows latest executions and bugs.
- Loading skeletons appear briefly before data loads.

- [ ] **Step 8: Verify locale formatting**

Switch between `pt-BR` and `en-US` locales:
- In pt-BR: numbers use dot as thousands separator, comma as decimal (e.g., "1.234,5%").
- In en-US: numbers use comma as thousands separator, period as decimal (e.g., "1,234.5%").
- Dates format according to locale (e.g., "24 de mar. de 2026" vs "Mar 24, 2026").
- All UI labels are translated.

- [ ] **Step 9: Verify trend page**

Navigate to `/pt-BR/test-plans/{id}/reports/trend`. Verify:
- Date range picker defaults to last 30 days.
- Changing date range re-fetches and re-renders the chart.
- Toggling daily/weekly changes the chart granularity.
- Stacked area chart shows colors for each status.
- Summary stats update with the data.
- Empty state message appears if no data in range.

- [ ] **Step 10: Verify coverage page**

Navigate to `/pt-BR/test-plans/{id}/reports/coverage`. Verify:
- Overall progress bar shows correct percentage.
- Suite table lists all suites with correct counts.
- Column sorting works (click headers).
- Mini progress bars in table match percentage values.

- [ ] **Step 11: Verify export from frontend**

On the trend or coverage page:
1. Click the export button.
2. Select "CSV" format and click "Generate".
3. Verify spinner/progress indicator appears.
4. Verify download link appears when complete.
5. Click download and verify the file is valid.
6. Repeat for PDF and Excel.
7. Test error case: disconnect Redis, attempt export, verify error message appears.

- [ ] **Step 12: Verify dark/light theme**

Toggle between dark and light themes on each page:
- All chart colors adapt (no invisible elements).
- Card borders and backgrounds change.
- Text remains readable.
- No flash of wrong theme on page load.

- [ ] **Step 13: Verify responsive layout**

Test each page at mobile viewport (375px width):
- Stat cards stack to single column.
- Charts resize to fit screen width.
- Coverage table scrolls horizontally.
- Controls stack vertically.
- No horizontal page overflow.

- [ ] **Step 14: Final commit (if fixes needed)**

```bash
git add .
git commit -m "fix: address verification issues in reports and dashboards"
```
