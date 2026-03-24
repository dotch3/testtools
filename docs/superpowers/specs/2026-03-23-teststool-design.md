# teststool — System Design Specification
**Version:** 1.3 (added SYSTEM_SETTINGS, USER_INTEGRATION_CREDENTIALS, user locale, shadcn/ui)
**Date:** 2026-03-23
**Status:** Approved

---

## 1. Overview

teststool is a single-tenant test management system for software quality teams. It supports the full QA lifecycle: planning, execution (manual and automated), bug tracking with bidirectional sync to external trackers, reporting, and CI/CD integration.

### Core Hierarchy

```
Project
  └── Test Plan
        └── Test Suite (nestable)
              └── Test Case
                    └── Test Execution
```

### Key Capabilities

- Manual and automated test execution
- Bidirectional bug sync: Jira, GitHub Issues, GitLab, Linear (extensible)
- CI/CD trigger: Jenkins, GitHub Actions (extensible)
- OAuth2 login (Google, GitHub, Microsoft) + local email/password fallback
- Configurable RBAC: roles and permissions managed from the UI
- Admin-managed enums (all dropdowns stored in DB)
- Admin-managed custom fields on any entity
- File attachments (images, videos) stored locally on filesystem
- Full reporting: dashboards, trends, coverage, PDF/CSV/Excel export + import
- i18n: en-US seed default, admin-configurable system default, user-overridable locale
- Locale-aware formatting (decimals, dates) via Intl API
- Dark mode default (system), configurable per user
- Component library: shadcn/ui (Radix UI + Tailwind CSS)

---

## 2. Architecture — Option C: Modular Monolith + Worker Queue

### Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 22 + TypeScript + Fastify |
| Frontend | Next.js 16.2 + TypeScript + Tailwind CSS + shadcn/ui |
| ORM | Prisma (DATABASE_URL for migrations, DATABASE_POOL_URL for runtime queries) |
| Database | PostgreSQL 16 — local Docker, Supabase, Neon, RDS, or any PostgreSQL host |
| Cache + Queue | Redis 7 + BullMQ — local Docker, Upstash, or Redis Cloud |
| Auth | JWT + OAuth2 (passport.js) + bcrypt (local) |
| File Storage | Local FS / Supabase Storage / S3 — via `IFileStorageAdapter` |
| API Docs | Swagger/OpenAPI (fastify-swagger) |
| Logging | Winston (backend) + frontend error reporter |
| Themes | next-themes + Tailwind darkMode: class |
| Icons | Lucide React |
| i18n | next-intl (frontend) + Accept-Language (backend errors) |

### Container Architecture

```
[Browser]
    |
    v
[Frontend: Next.js 16.2] :3000
    |
    v (API calls)
[Backend: Fastify] :3001
    |         |
    v         v
[PostgreSQL] [Redis]
              |
              v
         [Worker: BullMQ]
              |
    +---------+---------+
    v         v         v
[Jira]  [GitHub]  [Jenkins]  (external integrations)

[Backup cron container] → pg_dump → /data/backups/
```

---

## 3. Entity-Relationship Model

### Full Table List (24 tables)

```
USERS
  id                    UUID PK
  email                 VARCHAR(255) UNIQUE NOT NULL
  name                  VARCHAR(255)
  avatar_url            TEXT
  role_id               UUID FK → ROLES
  password_hash         TEXT nullable
  email_verified        BOOLEAN DEFAULT false
  last_login_at         TIMESTAMP
  failed_login_count    INT DEFAULT 0
  locked_until          TIMESTAMP nullable
  theme_preference      VARCHAR(10) nullable  -- dark | light | system
  locale                VARCHAR(10) nullable  -- pt-BR | en-US — null = inherits system default
  force_password_change BOOLEAN DEFAULT false
  created_at            TIMESTAMP
  updated_at            TIMESTAMP

OAUTH_ACCOUNTS
  id                UUID PK
  user_id           UUID FK → USERS
  provider          VARCHAR(50)   -- github | google | microsoft
  provider_user_id  VARCHAR(255)
  access_token      TEXT          -- encrypted at-rest with ENCRYPTION_KEY
  refresh_token     TEXT nullable -- encrypted at-rest with ENCRYPTION_KEY
  scopes            TEXT          -- space-separated OAuth scopes
  expires_at        TIMESTAMP nullable
  created_at        TIMESTAMP
  updated_at        TIMESTAMP

ROLES
  id          UUID PK
  name        VARCHAR(100) UNIQUE
  label       VARCHAR(255)
  color       VARCHAR(7)   -- hex color for UI badges
  is_system   BOOLEAN DEFAULT false  -- admin|lead|tester|viewer cannot be deleted
  created_at  TIMESTAMP
  updated_at  TIMESTAMP

PERMISSIONS
  id          UUID PK
  resource    VARCHAR(100)  -- project|test_plan|test_suite|test_case|execution|bug|
                            --   user|report|integration|custom_field|enum|role|attachment
  action      VARCHAR(100)  -- create|read|update|delete|execute|export|import|
                            --   manage_members|manage_settings
  label       VARCHAR(255)
  description TEXT
  created_at  TIMESTAMP

ROLE_PERMISSIONS
  role_id        UUID FK → ROLES
  permission_id  UUID FK → PERMISSIONS
  PRIMARY KEY (role_id, permission_id)

PROJECTS
  id           UUID PK
  name         VARCHAR(255) NOT NULL
  slug         VARCHAR(100) UNIQUE NOT NULL
  description  TEXT
  created_by   UUID FK → USERS
  created_at   TIMESTAMP
  updated_at   TIMESTAMP
  archived_at  TIMESTAMP nullable

PROJECT_MEMBERS
  id          UUID PK
  project_id  UUID FK → PROJECTS
  user_id     UUID FK → USERS
  role_id     UUID FK → ROLES
  joined_at   TIMESTAMP

TEST_PLANS
  id           UUID PK
  project_id   UUID FK → PROJECTS
  name         VARCHAR(255)
  description  TEXT
  status_id    UUID FK → ENUM_VALUES  -- references test_plan_status enum type
  created_by   UUID FK → USERS
  start_date   DATE nullable
  end_date     DATE nullable
  created_at   TIMESTAMP
  updated_at   TIMESTAMP

TEST_SUITES
  id               UUID PK
  test_plan_id     UUID FK → TEST_PLANS
  parent_suite_id  UUID FK → TEST_SUITES nullable  -- self-referential for nesting
  name             VARCHAR(255)
  description      TEXT
  order_index      INT DEFAULT 0
  created_by       UUID FK → USERS
  created_at       TIMESTAMP
  updated_at       TIMESTAMP

TEST_CASES
  id                    UUID PK
  suite_id              UUID FK → TEST_SUITES
  title                 VARCHAR(500)
  description           TEXT
  preconditions         TEXT
  steps                 JSONB  -- [{order, action, expected_result}]
  priority_id           UUID FK → ENUM_VALUES
  type_id               UUID FK → ENUM_VALUES
  automation_script_ref TEXT nullable  -- URL or path to external script
  created_by            UUID FK → USERS
  created_at            TIMESTAMP
  updated_at            TIMESTAMP

TEST_EXECUTIONS
  id            UUID PK
  test_case_id  UUID FK → TEST_CASES
  test_plan_id  UUID FK → TEST_PLANS
  status_id     UUID FK → ENUM_VALUES
  executed_by   UUID FK → USERS
  executed_at   TIMESTAMP
  duration_ms   INT nullable
  notes         TEXT
  ci_run_id     VARCHAR(255) nullable  -- reference to external CI job
  created_at    TIMESTAMP

BUGS
  id           UUID PK
  project_id   UUID FK → PROJECTS
  title        VARCHAR(500)
  description  TEXT
  status_id    UUID FK → ENUM_VALUES
  priority_id  UUID FK → ENUM_VALUES
  severity_id  UUID FK → ENUM_VALUES
  source_id    UUID FK → ENUM_VALUES  -- references bug_source enum type
  external_id  VARCHAR(255) nullable
  external_url TEXT nullable
  reported_by  UUID FK → USERS
  assigned_to  UUID FK → USERS nullable
  created_at   TIMESTAMP
  updated_at   TIMESTAMP
  synced_at    TIMESTAMP nullable

BUG_TEST_EXECUTIONS
  bug_id        UUID FK → BUGS
  execution_id  UUID FK → TEST_EXECUTIONS
  PRIMARY KEY (bug_id, execution_id)

INTEGRATIONS
  id          UUID PK
  project_id  UUID FK → PROJECTS
  type_id     UUID FK → ENUM_VALUES  -- references integration_type enum
  config      JSONB   -- {base_url, project_key, repo, ...} — no credentials here
  active      BOOLEAN DEFAULT true
  created_by  UUID FK → USERS
  created_at  TIMESTAMP
  updated_at  TIMESTAMP
  -- NOTE: credentials are per-user, not per-project (see USER_INTEGRATION_CREDENTIALS)

USER_INTEGRATION_CREDENTIALS
  id                   UUID PK
  user_id              UUID FK → USERS
  integration_type_id  UUID FK → ENUM_VALUES  -- jira | github | gitlab | jenkins | github_actions
  credential           TEXT    -- API token / PAT, encrypted at-rest with ENCRYPTION_KEY
  username             VARCHAR(255) nullable
  created_at           TIMESTAMP
  updated_at           TIMESTAMP
  UNIQUE (user_id, integration_type_id)

CUSTOM_FIELD_DEFINITIONS
  id           UUID PK
  project_id   UUID FK → PROJECTS nullable  -- null = global (all projects)
  entity_type  VARCHAR(50)  -- bug|test_case|test_execution|test_plan
  name         VARCHAR(100)
  label        VARCHAR(255)
  field_type_id UUID FK → ENUM_VALUES  -- references field_type enum
  options      JSONB nullable  -- ["Option A", "Option B"] for select types
  required     BOOLEAN DEFAULT false
  default_value TEXT nullable
  order_index  INT DEFAULT 0
  created_by   UUID FK → USERS
  created_at   TIMESTAMP
  updated_at   TIMESTAMP

CUSTOM_FIELD_VALUES
  id                    UUID PK
  field_definition_id   UUID FK → CUSTOM_FIELD_DEFINITIONS
  entity_id             UUID
  entity_type           VARCHAR(50)
  value_text            TEXT nullable
  value_number          NUMERIC nullable
  value_date            DATE nullable
  value_json            JSONB nullable  -- for multi_select, user references
  created_at            TIMESTAMP
  updated_at            TIMESTAMP

-- Note: test_plan is intentionally excluded from ATTACHMENTS (out of scope for v1).
-- Custom field values, attachments, and audit log rows for deleted entities
-- are cleaned up at the application service layer (cascade delete in service methods),
-- not at the DB level, because entity_id is a polymorphic UUID without an FK constraint.
ATTACHMENTS
  id           UUID PK
  project_id   UUID FK → PROJECTS
  entity_type  VARCHAR(50)   -- bug|test_execution|test_case
  entity_id    UUID
  file_name    VARCHAR(500)
  file_type    VARCHAR(100)  -- MIME type: image/png, video/mp4, etc.
  file_size_kb INT
  storage_path TEXT          -- relative path: /projects/{id}/bugs/{id}/file.png
  uploaded_by  UUID FK → USERS
  created_at   TIMESTAMP

ENUM_TYPES
  id           UUID PK
  name         VARCHAR(100) UNIQUE  -- execution_status, bug_priority, field_type, etc.
  entity_type  VARCHAR(50) nullable
  is_system    BOOLEAN DEFAULT false
  created_at   TIMESTAMP

ENUM_VALUES
  id           UUID PK
  enum_type_id UUID FK → ENUM_TYPES
  system_key   VARCHAR(100) nullable  -- immutable internal key used by code
  value        VARCHAR(255)           -- exported/displayed key
  label        VARCHAR(255)
  color        VARCHAR(7) nullable    -- hex
  icon         VARCHAR(100) nullable  -- Lucide icon name
  order_index  INT DEFAULT 0
  is_default   BOOLEAN DEFAULT false
  is_system    BOOLEAN DEFAULT false  -- cannot be deleted
  created_at   TIMESTAMP
  updated_at   TIMESTAMP

AUDIT_LOGS
  id           UUID PK
  user_id      UUID FK → USERS nullable
  action       VARCHAR(100)
  entity_type  VARCHAR(100)
  entity_id    UUID nullable
  payload      JSONB
  ip_address   INET
  created_at   TIMESTAMP

REFRESH_TOKENS
  id          UUID PK
  user_id     UUID FK → USERS
  token_hash  VARCHAR(255) UNIQUE  -- bcrypt hash of the issued refresh token
  expires_at  TIMESTAMP
  revoked_at  TIMESTAMP nullable   -- set on logout or rotation
  created_at  TIMESTAMP

PASSWORD_RESET_TOKENS
  id          UUID PK
  user_id     UUID FK → USERS
  token_hash  VARCHAR(255) UNIQUE  -- SHA-256 hash of the emailed token
  expires_at  TIMESTAMP            -- 1 hour TTL
  used_at     TIMESTAMP nullable
  created_at  TIMESTAMP

SYSTEM_SETTINGS
  key          VARCHAR(100) PK
  value        TEXT
  updated_by   UUID FK → USERS nullable
  updated_at   TIMESTAMP
  -- Seed: default_locale=en-US, default_theme=system
```

### Enum Types — Seed Data

| Enum Type | System Keys |
|---|---|
| `test_plan_status` | draft, active, completed, archived |
| `execution_status` | not_run, pass, fail, blocked, skipped |
| `bug_status` | open, in_progress, resolved, closed, reopened |
| `bug_priority` | low, medium, high, critical |
| `bug_severity` | trivial, minor, major, critical, blocker |
| `test_priority` | low, medium, high, critical |
| `test_type` | manual, automated, exploratory, regression |
| `bug_source` | internal, jira, github, gitlab, linear |
| `field_type` | text, number, date, select, multi_select, user, boolean, url |
| `integration_type` | jira, github, gitlab, jenkins, github_actions |

---

## 4. Object Model (Clean Architecture)

### Layer Structure

```
src/
  domain/           Pure entities, interfaces, value objects — no external deps
  application/      Use cases / Services — orchestrate domain, call interfaces
  infrastructure/   Prisma repositories, integration adapters, BullMQ,
                    file storage adapters (local/supabase/s3), mailer
  interfaces/       Fastify controllers, route schemas
```

**Note on test case scoping:** Test cases are plan-scoped in v1 (belong to a suite, which belongs to a plan). Cross-plan reuse is not supported. To run the same test in a different plan, duplicate the case. A future version may introduce a reusable case library with a `TEST_PLAN_CASES` join table.

**Note on async job status:** All three async job types (`sync_bugs`, `trigger_ci`, `generate_report`) are tracked via the unified job status endpoint `GET /jobs/:jobId`. Clients poll this endpoint. No WebSocket is implemented in v1.

### Domain Entities (TypeScript)

```typescript
// Domain entities hold business rules only — no DB or HTTP concerns

class Project       { id, name, slug, members: ProjectMember[], archivedAt? }
class TestPlan      { id, projectId, name, statusId, suites: TestSuite[] }
class TestSuite     { id, planId, parentId?, name, cases: TestCase[], children: TestSuite[] }
class TestCase      { id, suiteId, title, steps: TestStep[], typeId, priorityId }
class TestExecution { id, caseId, planId, statusId, notes, ciRunId? }
class Bug           { id, projectId, title, statusId, sourceId, externalId? }
class User          { id, email, roleId, themePreference?, oauthAccounts: OAuthAccount[] }
class Attachment    { id, entityType, entityId, storagePath, fileType }
class CustomFieldDef{ id, entityType, name, fieldTypeId, options? }
class EnumValue     { id, enumTypeId, systemKey?, value, label, color? }
class Role          { id, name, label, permissions: Permission[] }
```

### Application Services

```typescript
class ProjectService {
  createProject(dto, actor: User): Promise<Project>
  archiveProject(id, actor): Promise<void>
  addMember(projectId, userId, roleId, actor): Promise<void>
  removeMember(projectId, userId, actor): Promise<void>
}

class TestExecutionService {
  runManual(caseId, planId, statusId, notes, actor): Promise<TestExecution>
  triggerCI(caseId, integrationId, actor): Promise<void>       // → WorkerQueue
  bulkUpdateStatus(executionIds, statusId, actor): Promise<void>
}

class BugService {
  createInternal(dto, actor): Promise<Bug>
  syncFromExternal(integrationId, actor): Promise<void>         // → WorkerQueue
  updateBug(bugId, changes, actor): Promise<Bug>                // syncs external if linked
  closeBug(bugId, actor): Promise<Bug>
  linkToExecution(bugId, executionId): Promise<void>
}

class ReportService {
  getDashboard(projectId): Promise<DashboardData>
  getExecutionTrend(planId, dateRange): Promise<TrendData>
  getCoverage(planId): Promise<CoverageData>
  exportReport(planId, format, actor): Promise<void>            // → WorkerQueue
  importTestCases(file, suiteId, actor): Promise<ImportResult>
}

class CustomFieldService {
  defineField(dto, actor): Promise<CustomFieldDef>              // admin only
  updateField(id, dto, actor): Promise<CustomFieldDef>
  deleteField(id, actor): Promise<void>
  setValues(entityType, entityId, values, actor): Promise<void>
  enrichEntity<T>(entityType, entityId, entity: T): Promise<T & { customFields }>
}

class AttachmentService {
  upload(file, entityType, entityId, actor): Promise<Attachment>
  delete(attachmentId, actor): Promise<void>
  serveFile(attachmentId, actor): Promise<ReadableStream>
}

class EnumService {
  listTypes(): Promise<EnumType[]>
  listValues(enumTypeName): Promise<EnumValue[]>
  createValue(enumTypeId, dto, actor): Promise<EnumValue>       // admin only
  updateValue(id, dto, actor): Promise<EnumValue>
  deleteValue(id, actor): Promise<void>                         // rejects is_system=true
}

class RoleService {
  listRoles(): Promise<Role[]>
  createRole(dto, actor): Promise<Role>
  updateRole(id, dto, actor): Promise<Role>
  setPermissions(roleId, permissionIds, actor): Promise<void>   // saves full matrix
  deleteRole(id, actor): Promise<void>                          // rejects is_system=true
}

class AuthService {
  oauthInitiate(provider): Promise<{ redirectUrl: string }>
  oauthCallback(provider, code): Promise<{ accessToken: string, refreshToken: string }>
  loginLocal(email, password): Promise<{ accessToken: string, refreshToken: string }>
  refreshToken(refreshToken): Promise<{ accessToken: string, refreshToken: string }>
  logout(refreshToken): Promise<void>                           // revokes refresh token
  register(dto): Promise<User>                                  // if ALLOW_REGISTRATION=true
  forgotPassword(email): Promise<void>                          // sends email via IMailAdapter
  resetPassword(token, newPassword): Promise<void>
  changePassword(userId, current, newPassword): Promise<void>
}

class AdminUserService {
  listUsers(filters): Promise<User[]>
  getUser(id, actor): Promise<User>
  createUser(dto, actor): Promise<User>                         // admin creates user directly
  updateUser(id, dto, actor): Promise<User>                     // role, lock, force pw change
  deactivateUser(id, actor): Promise<void>
  unlockUser(id, actor): Promise<void>                          // manual unlock
}
```

### Integration Adapters (Polymorphism)

```typescript
// Open for extension — add new trackers without changing BugService
// `credential` is the resolved secret from INTEGRATIONS.credential (decrypted at runtime)
// It may be an API token (Jira), a PAT (GitHub), or an OAuth token depending on provider.
interface IBugTrackerAdapter {
  fetchBug(externalId: string, credential: string): Promise<ExternalBug>
  createBug(data, credential: string): Promise<ExternalBug>
  updateBug(externalId, changes, credential: string): Promise<ExternalBug>
  closeBug(externalId, credential: string): Promise<void>
}

// Mail adapter — used by AuthService for password reset and notifications
interface IMailAdapter {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
  sendNotification(to: string, subject: string, body: string): Promise<void>
}

class SmtpMailAdapter implements IMailAdapter { ... }  // Nodemailer

// File storage adapter — provider resolved at startup from STORAGE_PROVIDER env var
interface IFileStorageAdapter {
  save(path: string, buffer: Buffer, mimeType: string): Promise<string>  // returns public/signed URL or local path
  delete(path: string): Promise<void>
  getUrl(path: string): Promise<string>   // signed URL (cloud) or served via /attachments/:id/file (local)
}

class LocalStorageAdapter    implements IFileStorageAdapter { ... }  // STORAGE_PROVIDER=local
class SupabaseStorageAdapter implements IFileStorageAdapter { ... }  // STORAGE_PROVIDER=supabase
class S3StorageAdapter       implements IFileStorageAdapter { ... }  // STORAGE_PROVIDER=s3 (AWS S3, R2, MinIO)

class JiraAdapter    implements IBugTrackerAdapter { ... }
class GitHubAdapter  implements IBugTrackerAdapter { ... }
class GitLabAdapter  implements IBugTrackerAdapter { ... }

interface ICIAdapter {
  triggerJob(config, params): Promise<CIJob>
  getJobStatus(jobId, config): Promise<CIJobStatus>
}

class JenkinsAdapter       implements ICIAdapter { ... }
class GitHubActionsAdapter implements ICIAdapter { ... }
```

### Worker Queue Jobs (BullMQ)

```typescript
// All heavy or external-network operations run as async jobs.
// sync_bugs, trigger_ci, and generate_report are trackable via GET /jobs/:jobId.
// send_notification is fire-and-forget — no job status tracking.
type QueueJob =
  | { type: 'sync_bugs',       payload: { integrationId, userId } }
  | { type: 'trigger_ci',      payload: { caseId, integrationId, userId } }
  | { type: 'generate_report', payload: { planId, format, userId, jobId } }
  | { type: 'send_notification', payload: { userId, event: NotificationEvent, body: object } }

// Valid notification events:
type NotificationEvent =
  | 'execution_completed'   // test execution finished (CI run)
  | 'bug_synced'            // bug sync job completed
  | 'report_ready'          // export report is ready for download
  | 'user_invited'          // admin added a new user
```

---

## 5. API REST

**Base URL:** `/api/v1`
**Auth:** `Authorization: Bearer <jwt>` on all endpoints except `/auth/*`
**Language:** All code comments, Swagger descriptions, and examples in English

### Endpoint Groups

```
AUTH
  GET  /auth/:provider                OAuth2 initiation — redirects to provider
  GET  /auth/:provider/callback       OAuth2 callback (github|google|microsoft)
  POST /auth/login                    Local login {email, password}
  POST /auth/register                 Self-registration (if ALLOW_REGISTRATION=true)
  POST /auth/refresh                  Refresh JWT (body: {refreshToken})
  POST /auth/logout                   Revokes refresh token (body: {refreshToken})
  POST /auth/forgot-password
  POST /auth/reset-password
  PATCH /auth/change-password

PROJECTS
  GET    /projects
  POST   /projects
  GET    /projects/:id
  PATCH  /projects/:id
  DELETE /projects/:id
  GET    /projects/:id/members
  POST   /projects/:id/members
  PATCH  /projects/:id/members/:userId
  DELETE /projects/:id/members/:userId

TEST PLANS
  GET    /projects/:id/test-plans
  POST   /projects/:id/test-plans
  GET    /test-plans/:id
  PATCH  /test-plans/:id
  DELETE /test-plans/:id
  GET    /test-plans/:id/dashboard

TEST SUITES
  GET    /test-plans/:id/suites
  POST   /test-plans/:id/suites
  PATCH  /suites/:id
  DELETE /suites/:id

TEST CASES
  GET    /suites/:id/cases
  POST   /suites/:id/cases
  GET    /cases/:id
  PATCH  /cases/:id
  DELETE /cases/:id
  POST   /cases/import              CSV/Excel import

TEST EXECUTIONS
  GET    /test-plans/:id/executions
  POST   /cases/:id/executions      Manual execution record
  PATCH  /executions/:id
  POST   /executions/bulk           Bulk status update
  POST   /cases/:id/trigger-ci      Trigger CI/CD job (async → returns jobId)

ASYNC JOBS (polling — covers trigger_ci, sync_bugs, generate_report)
  GET    /jobs/:jobId               Status: {status: pending|running|completed|failed, result?}

BUGS
  GET    /projects/:id/bugs
  POST   /projects/:id/bugs
  GET    /bugs/:id
  PATCH  /bugs/:id
  DELETE /bugs/:id
  POST   /bugs/:id/sync             Force sync with external tracker (async → returns jobId)
  POST   /executions/:id/bugs       Link bug to execution

ATTACHMENTS
  POST   /attachments               multipart/form-data upload
  GET    /attachments/:id/file      Serve file (authenticated)
  DELETE /attachments/:id

REPORTS
  GET    /projects/:id/reports/dashboard
  GET    /test-plans/:id/reports/trend
  GET    /test-plans/:id/reports/coverage
  POST   /test-plans/:id/reports/export   {format: "pdf"|"csv"|"excel"}
  -- Note: report export job status is tracked via GET /jobs/:jobId

INTEGRATIONS
  GET    /projects/:id/integrations
  POST   /projects/:id/integrations
  PATCH  /integrations/:id
  DELETE /integrations/:id
  POST   /integrations/:id/test           Test connection

ADMIN — SETTINGS
  GET    /settings/enums
  GET    /settings/enums/:type/values
  POST   /settings/enums/:type/values
  PATCH  /settings/enums/values/:id
  DELETE /settings/enums/values/:id
  GET    /settings/roles
  POST   /settings/roles
  PATCH  /settings/roles/:id
  DELETE /settings/roles/:id
  GET    /settings/roles/:id/permissions
  PUT    /settings/roles/:id/permissions  Full matrix save
  GET    /settings/custom-fields/:entityType
  POST   /settings/custom-fields
  PATCH  /settings/custom-fields/:id
  DELETE /settings/custom-fields/:id

ADMIN — SYSTEM SETTINGS
  GET    /settings/system                         All settings (admin only)
  PATCH  /settings/system                         Update multiple settings {key: value, ...}
  GET    /settings/system/public                  Public settings (no auth): locale, theme

ADMIN — USERS
  GET    /admin/users                          List all users (filters: role, status)
  POST   /admin/users                          Create user (when ALLOW_REGISTRATION=false)
  GET    /admin/users/:id
  PATCH  /admin/users/:id                      Edit role, force_password_change, deactivate
  DELETE /admin/users/:id                      Deactivate user
  POST   /admin/users/:id/unlock               Manually unlock locked account

USER PROFILE
  GET    /profile
  PATCH  /profile                              Includes theme_preference, locale
  GET    /profile/oauth-accounts
  POST   /profile/oauth-accounts/:provider     Link additional OAuth provider
  DELETE /profile/oauth-accounts/:provider

USER INTEGRATION CREDENTIALS
  GET    /profile/integrations                 List user's credentials (tokens masked)
  POST   /profile/integrations                 Add credential for a service
  PATCH  /profile/integrations/:id             Update credential
  DELETE /profile/integrations/:id
  POST   /profile/integrations/:id/test        Test connection with credential

AUDIT LOGS
  GET    /audit-logs                Filters: userId, entityType, dateRange

FRONTEND LOGGING
  POST   /frontend-logs             {level, message, stack, url, userAgent, userId}
```

---

## 6. Infrastructure — Docker

### Deployment Modes

| Mode | Database | Storage | Redis | Docker profile |
|---|---|---|---|---|
| `full-local` | Docker PostgreSQL container | Local filesystem `/data/uploads` | Docker Redis container | `--profile local-db` |
| `hybrid` | Supabase / Neon / RDS (external) | Local filesystem `/data/uploads` | Docker Redis container | *(no profile flag)* |
| `full-cloud` | Supabase / Neon (external) | Supabase Storage or S3/R2 | Upstash / Redis Cloud | *(no profile flag)* |

### docker-compose.yml Services

| Service | Image | Port | Profile | Purpose |
|---|---|---|---|---|
| `postgres` | postgres:16-alpine | internal | `local-db` | Local PostgreSQL — skipped when using external DB |
| `redis` | redis:7-alpine | internal | *(always)* | Cache + BullMQ queue (use Upstash URL to skip) |
| `backend` | local build | 3001 | *(always)* | Fastify API + Swagger UI |
| `frontend` | local build | 3000 | *(always)* | Next.js 16.2 app |
| `worker` | same as backend | — | *(always)* | BullMQ job processor |
| `backup` | postgres:16-alpine | — | `local-db` | Daily pg_dump cron — only useful with local DB |

Start with local DB: `docker-compose --profile local-db up`
Start without local DB (cloud): `docker-compose up`

### Volumes

```
postgres_data   → PostgreSQL data files         (local-db profile only)
redis_data      → Redis persistence (AOF)        (skipped if REDIS_URL points to external)
uploads_data    → /data/uploads                  (local storage only — STORAGE_PROVIDER=local)
backups_data    → /data/backups                  (local-db profile only)
logs_data       → /logs (Winston log files)
```

### File Storage Structure

Only applies when `STORAGE_PROVIDER=local`. Created automatically on first boot:

```
/data/uploads/
  projects/
    {project_id}/
      bugs/
        {bug_id}/
      test-executions/
        {execution_id}/
      test-cases/
        {case_id}/
```

When `STORAGE_PROVIDER=supabase` or `s3`, files are stored in the configured bucket.
The `AttachmentService` uses `IFileStorageAdapter` — the provider is swapped at runtime via env var.

### Dockerfile Strategy

- **Backend:** multi-stage — `node:22-alpine` builder (tsc compile) + runner (dist/ only) ~180MB
- **Frontend:** multi-stage — `node:22-alpine` builder (next build) + runner (standalone) ~120MB

### AUTH_MODE Behavior

| Mode | Behavior |
|---|---|
| `local` | Only email/password. OAuth providers disabled. |
| `oauth` | Only OAuth2. No password forms shown. Admin must pre-link accounts. |
| `both` | Both options shown on login screen. Accounts are unified by email: if an OAuth login arrives with an email that matches an existing local account, the OAuth provider is linked to that account automatically. A user may have multiple OAuth providers linked. `POST /profile/oauth-accounts/:provider` allows linking additional providers post-login. **Edge cases:** (1) If the matched account is **deactivated**, the login is rejected with HTTP 403 regardless of OAuth provider. (2) If the same provider is already linked to the account with a **different** `provider_user_id` (e.g., user changed their GitHub account), the existing `OAUTH_ACCOUNTS` row is updated — the new `provider_user_id` overwrites the old one after re-authorization. (3) If the incoming OAuth email matches no existing account, a new user is created automatically (subject to `ALLOW_REGISTRATION`). |

### Environment Variables

```bash
# ─── Database ───────────────────────────────────────────────────────────────
# Direct connection — used by Prisma for migrations and schema management.
# For full-local: postgresql://user:password@postgres:5432/teststool
# For Supabase:   postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
# For Neon:       postgresql://user:password@ep-xxx.region.aws.neon.tech/teststool
DATABASE_URL=postgresql://user:password@postgres:5432/teststool

# Pooled connection — used by the app at runtime for all queries.
# Required for Supabase (PgBouncer on port 6543, append ?pgbouncer=true).
# For Neon: use the pooled connection string provided in the Neon dashboard.
# For full-local: leave empty — DATABASE_URL is used for both migrations and queries.
DATABASE_POOL_URL=

# Shadow database for Prisma migrate diff calculation.
# Required when DATABASE_URL points to a cloud provider that does not allow
# Prisma to create/drop databases automatically (Supabase, Neon, RDS).
# For full-local: leave empty — Prisma manages the shadow DB automatically.
SHADOW_DATABASE_URL=

# ─── Redis ───────────────────────────────────────────────────────────────────
# For full-local Docker: redis://redis:6379
# For Upstash (serverless):  rediss://:[token]@[host].upstash.io:6380
# For Redis Cloud: redis://:[password]@[host]:[port]
REDIS_URL=redis://redis:6379

# ─── Auth ────────────────────────────────────────────────────────────────────
AUTH_MODE=both                    # local | oauth | both
ALLOW_REGISTRATION=false          # false = only admin can create users
JWT_SECRET=<strong-secret>
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d

# AES-256 encryption key for OAuth tokens and integration credentials stored in DB.
# Must be a 32-byte hex string (64 hex chars). Generate with: openssl rand -hex 32
ENCRYPTION_KEY=<32-byte-hex-secret>

# ─── OAuth2 providers (only required if AUTH_MODE=oauth or both) ─────────────
OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_MICROSOFT_CLIENT_ID=
OAUTH_MICROSOFT_CLIENT_SECRET=

# ─── First-boot admin (local auth seed) ──────────────────────────────────────
# Used once on first startup to create the initial admin user.
# User is forced to change password on first login.
ADMIN_EMAIL=admin@company.com
ADMIN_PASSWORD=changeme123!

# ─── File Storage ────────────────────────────────────────────────────────────
# STORAGE_PROVIDER controls where uploaded files (images, videos) are stored.
# local    → on-premise filesystem at STORAGE_PATH (default, works with Docker volume)
# supabase → Supabase Storage (requires SUPABASE_* vars below)
# s3       → AWS S3, Cloudflare R2, MinIO, or any S3-compatible service
STORAGE_PROVIDER=local

# Used when STORAGE_PROVIDER=local
STORAGE_PATH=/data/uploads

# Used when STORAGE_PROVIDER=supabase
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_KEY=
SUPABASE_STORAGE_BUCKET=teststool-uploads

# Used when STORAGE_PROVIDER=s3
# S3_ENDPOINT: leave empty for AWS S3, or set custom URL for R2/MinIO
# Example R2:   https://[account-id].r2.cloudflarestorage.com
# Example MinIO: http://minio:9000
S3_ENDPOINT=
S3_BUCKET=teststool-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# ─── Backup (local-db profile only) ──────────────────────────────────────────
# Only used by the backup container when running with --profile local-db.
# Cloud databases (Supabase, Neon, RDS) handle their own backup strategies.
BACKUP_PATH=/data/backups
BACKUP_CRON=0 2 * * *             # daily at 02:00 UTC

# ─── Logging ─────────────────────────────────────────────────────────────────
LOG_LEVEL=info                    # debug | info | warn | error
LOG_OUTPUT=both                   # file | stdout | both
LOG_MAX_SIZE=20m                  # max size per log file before rotation
LOG_MAX_FILES=14d                 # retain logs for 14 days, then delete
LOG_PATH=/logs

# ─── Frontend ────────────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# ─── UI Defaults ─────────────────────────────────────────────────────────────
UI_DEFAULT_THEME=dark             # dark | light | system

# ─── Password Policy ─────────────────────────────────────────────────────────
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_SYMBOL=true

# ─── Account Lockout ─────────────────────────────────────────────────────────
LOCKOUT_MAX_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15       # time-based auto-unlock after this duration

# ─── Email / SMTP ────────────────────────────────────────────────────────────
# Required for password reset emails and job completion notifications.
# Works with any SMTP provider: Gmail, SendGrid, Mailgun, AWS SES, Postmark, etc.
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_SECURE=false                 # true for TLS on port 465
SMTP_USER=
SMTP_PASS=
SMTP_FROM="teststool <no-reply@company.com>"
```

---

## 7. Observability

### Backend Logging (Winston)

```json
{
  "level": "info",
  "timestamp": "2026-03-23T14:00:00.000Z",
  "requestId": "req-uuid",
  "userId": "user-uuid",
  "action": "test_execution.create",
  "entity": "test_execution",
  "entityId": "exec-uuid",
  "durationMs": 42,
  "error": null
}
```

Log levels control verbosity:
- `debug`: SQL queries, full request payloads, integration request/response bodies
- `info`: HTTP requests, job completions, user actions
- `warn`: Recoverable errors, rate limits, denied access attempts
- `error`: Exceptions, DB failures, unhandled rejections

### Frontend Error Reporter

Critical client-side errors are sent to `POST /api/v1/frontend-logs`:

```json
{
  "level": "error",
  "message": "Unhandled promise rejection",
  "stack": "Error: ...",
  "url": "/projects/123/test-plans",
  "userAgent": "Mozilla/5.0...",
  "userId": "user-uuid"
}
```

---

## 8. UI/UX Guidelines

- **Component library:** shadcn/ui (Radix UI primitives + Tailwind CSS)
- **Layout:** Collapsible sidebar (left) + header bar (top) + main content area
  - Sidebar: logo, project selector, navigation sections (main, reports, admin), collapsible to icon-only
  - Mobile: sidebar as Sheet overlay via hamburger button
  - Header: breadcrumbs (left), theme toggle + avatar/profile dropdown (right)
  - Profile dropdown: My Profile, Change Password, My Integrations, Logout
- **Default theme:** system (configurable per user: dark | light | system)
- **Icons:** Lucide React on all action buttons
- **Tooltips:** all action buttons have descriptive tooltips (especially in collapsed sidebar)
- **Modals:** help modals on complex forms
- **Code/docs language:** English (comments, Swagger, logs)

### i18n + Locale Strategy

- **Supported locales:** en-US, pt-BR (extensible)
- **Seed default:** en-US (stored in SYSTEM_SETTINGS.default_locale)
- **Admin** can change system default locale via System Settings UI
- **Users created** inherit system default (locale = null in USERS table)
- **Logged-in user** with locale set in profile: frontend uses that locale
- **Logged-in user** with locale = null: uses system default from SYSTEM_SETTINGS
- **Not logged in:** uses system default (fetched via public endpoint)
- **Fallback:** en-US (hardcoded, used only if system setting is somehow missing)
- **Number formatting:** Intl.NumberFormat with active locale (pt-BR: 1.234,56 / en-US: 1,234.56)
- **Date formatting:** Intl.DateTimeFormat with active locale
- **Translation:** next-intl with messages files per locale

---

## 9. Security

- bcrypt (cost 12) for local passwords
- JWT access token (8h) + refresh token (30d) rotation. Refresh tokens stored hashed in `REFRESH_TOKENS`. Logout revokes the refresh token row. `POST /auth/logout` is the invalidation mechanism — no Redis denylist needed.
- OAuth tokens and integration credentials encrypted at-rest with AES-256 using `ENCRYPTION_KEY`. Decrypted only in-process at runtime.
- OAuth scopes stored per user per provider — bug operations respect external permissions
- `PermissionGuard` middleware validates every request against `ROLE_PERMISSIONS` (Redis-cached)
- Account lockout: after `LOCKOUT_MAX_ATTEMPTS` (default 5) failed logins, account is locked for `LOCKOUT_DURATION_MINUTES` (default 15). Time-based auto-unlock via `locked_until`. Admin can also unlock manually via `POST /admin/users/:id/unlock`.
- Password reset tokens stored hashed in `PASSWORD_RESET_TOKENS` with 1h TTL.
- All file downloads served through authenticated `/attachments/:id/file` endpoint
- Audit log on all write operations

---

## 10. RBAC — Default Permission Seed

| Permission | admin | lead | tester | viewer |
|---|---|---|---|---|
| create:project | yes | no | no | no |
| manage_members:project | yes | yes | no | no |
| create:test_plan | yes | yes | no | no |
| create:test_case | yes | yes | yes | no |
| execute:execution | yes | yes | yes | no |
| create:bug | yes | yes | yes | no |
| export:report | yes | yes | yes | yes |
| import:test_case | yes | yes | no | no |
| manage_settings | yes | no | no | no |
| manage:enum | yes | no | no | no |
| manage:role | yes | no | no | no |
| manage:custom_field | yes | yes | no | no |
