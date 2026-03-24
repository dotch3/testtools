# Plan 1 — Infrastructure (Backend Foundation)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setup the complete infrastructure foundation — PostgreSQL with Prisma 6, Redis with BullMQ for job queues, Docker/Podman containerization, environment configuration, and database seeding.

**Architecture:** Clean architecture with services in `src/services/`, infrastructure adapters in `src/infrastructure/`, HTTP interfaces in `src/interfaces/http/`.

**Tech Stack:** Node.js 22, Fastify 5, Prisma 6, PostgreSQL 16, Redis 7, BullMQ, TypeScript 5, Zod, Winston, Fastify plugins.

---

## File Map

```
backend/
  prisma/
    schema.prisma                    -- Full database schema (22 tables)
    migrations/                      -- Prisma migrations
    seed.ts                         -- Database seeding
  src/
    config.ts                       -- Zod-based env validation
    logger.ts                      -- Winston logger with rotation
    init.ts                         -- First-boot initialization
    index.ts                        -- Entry point
    app.ts                          -- Fastify app factory
    infrastructure/
      database/
        prisma.ts                  -- Prisma client singleton
      cache/
        redis.ts                   -- Redis client (ioredis)
      queue/
        bullmq.ts                  -- BullMQ setup
      mail/
        SmtpMailAdapter.ts         -- Nodemailer SMTP adapter
    interfaces/
      http/
        plugins/
          swagger.ts              -- Swagger/OpenAPI docs
          cors.ts                 -- CORS configuration
          auth.ts                -- JWT validation
          auditLog.ts            -- Request/response logging
          permissionGuard.ts      -- RBAC middleware
        routes/
          health.ts               -- GET /health
        middleware/
          requireAuth.ts          -- Auth middleware
    services/                       -- Business logic services
    utils/                         -- Utilities
  Dockerfile                       -- Multi-stage build
  scripts/
    docker-entrypoint.sh           -- Auto-migration on startup
  tests/
    *.test.ts                      -- Integration tests
docker-compose.yml                  -- Full stack orchestration
.env.example                       -- Environment template
.env.local                        -- Local development
.env.podman                        -- Podman deployment
```

---

## Task 1: Prisma Schema + Migrations

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: migration via `prisma migrate dev`

- [ ] **Step 1: Create schema.prisma with all 22 tables**

  Tables required (all with UUID primary keys, timestamps, soft deletes where appropriate):

  - `roles` — system roles (admin, lead, tester, viewer)
  - `permissions` — granular permissions per resource
  - `role_permissions` — many-to-many junction
  - `users` — email, name, avatar, password hash, role FK, locale, theme preference
  - `sessions` — JWT refresh tokens (revocable)
  - `o_auth_accounts` — GitHub/Google/Microsoft linked accounts
  - `password_reset_tokens` — time-limited reset tokens
  - `projects` — project with status, key, description
  - `project_members` — user-project membership with role
  - `test_plans` — test plan with status, dates, milestone FK
  - `test_suites` — hierarchical suites (parent_id self-reference)
  - `test_cases` — test case with priority, type, preconditions, steps
  - `test_case_versions` — version history for test cases
  - `test_executions` — execution run with status, assignee
  - `execution_steps` — each test case in an execution with result
  - `execution_attachments` — file attachments per execution step
  - `bugs` — bug with severity, priority, status, linked to execution
  - `bug_execution_links` — junction table (many-to-many)
  - `integrations` — project-level config (Jira, GitHub, Jenkins) — NO credential column
  - `audit_logs` — who did what when (admin panel)
  - `enum_values` — customizable enums (statuses, priorities, types)
  - `custom_field_definitions` — per-entity custom fields schema
  - `custom_field_values` — actual custom field data
  - `attachments` — file attachments (linked to test cases, executions, bugs)
  - `system_settings` — key-value store for global config

- [ ] **Step 2: Run initial migration**

  ```bash
  cd backend
  npx prisma migrate dev --name init
  ```

---

## Task 2: Environment Configuration

**Files:**
- Create: `backend/src/config.ts`
- Create: `backend/.env.example`
- Create: `backend/.env.local`
- Create: `backend/.env.podman`

- [ ] **Step 1: Create Zod schema for all env vars**

  Required variables with validation:
  - `DATABASE_URL` — postgresql:// connection string
  - `DATABASE_POOL_URL` — optional, for PgBouncer
  - `REDIS_URL` — redis:// connection string
  - `JWT_SECRET` — min 32 chars
  - `JWT_EXPIRES_IN` — default '8h'
  - `JWT_REFRESH_EXPIRES_IN` — default '30d'
  - `ENCRYPTION_KEY` — 64-char hex (AES-256-GCM key)
  - `AUTH_MODE` — enum: local, oauth, both
  - `ALLOW_REGISTRATION` — boolean
  - `ADMIN_EMAIL` — email
  - `ADMIN_PASSWORD` — min 8 chars
  - OAuth client IDs/secrets (optional)
  - Storage config (local, supabase, s3)
  - SMTP config
  - Logging config (level, output, rotation)

- [ ] **Step 2: Create env template files**

  Create `.env.example` with all keys and placeholder values. Create `.env.local` and `.env.podman` with appropriate defaults for each environment.

---

## Task 3: Database Infrastructure

**Files:**
- Create: `backend/src/infrastructure/database/prisma.ts`

- [ ] **Step 1: Create Prisma client singleton**

  ```typescript
  import { PrismaClient } from '@prisma/client'

  declare global {
    var __prisma: PrismaClient | undefined
  }

  export const prisma = globalThis.__prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma
  }
  ```

---

## Task 4: Redis Infrastructure

**Files:**
- Create: `backend/src/infrastructure/cache/redis.ts`

- [ ] **Step 1: Create Redis client**

  ```typescript
  import Redis from 'ioredis'

  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  export { redis }
  ```

---

## Task 5: BullMQ Queue Setup

**Files:**
- Create: `backend/src/infrastructure/queue/bullmq.ts`

- [ ] **Step 1: Create queue infrastructure**

  ```typescript
  import { Queue, Worker } from 'bullmq'

  export const queues = {
    email: new Queue('email', { connection: redis }),
    backup: new Queue('backup', { connection: redis }),
    export: new Queue('export', { connection: redis }),
  }
  ```

  Create a basic `src/worker.ts` entry point for the worker process:
  ```typescript
  import './infrastructure/queue/workers/emailWorker.js'
  import './infrastructure/queue/workers/backupWorker.js'
  import './infrastructure/queue/workers/exportWorker.js'
  ```

---

## Task 6: Logger

**Files:**
- Create: `backend/src/logger.ts`

- [ ] **Step 1: Create Winston logger with rotation**

  - Console transport with JSON format
  - File transport with daily rotation (`winston-daily-rotate-file`)
  - Configurable level (debug/info/warn/error)
  - Configurable output (stdout/file/both)

---

## Task 7: First-Boot Initialization

**Files:**
- Create: `backend/src/init.ts`

- [ ] **Step 1: Create init script**

  Runs once on startup:
  - Create upload directory (`./data/uploads`) if not exists
  - Create logs directory if not exists
  - Ensure directories are writable

---

## Task 8: Database Seeding

**Files:**
- Create: `backend/prisma/seed.ts`
- Modify: `backend/package.json` (add seed script)

- [ ] **Step 1: Create seed script**

  Seed order:
  1. Roles (admin, lead, tester, viewer)
  2. Permissions (all resource+action combinations)
  3. Role-permission mappings
  4. Default enums (test_plan_status, test_case_priority, test_case_type, bug_severity, bug_priority, bug_status, integration_type)
  5. Admin user (from ADMIN_EMAIL + ADMIN_PASSWORD env vars, bcrypt hashed)
  6. System settings (default_locale = 'en-US', default_theme = 'system')

---

## Task 9: Fastify App Factory

**Files:**
- Create: `backend/src/app.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create app factory**

  ```typescript
  // app.ts
  import Fastify from 'fastify'
  import { fastifyLogger } from './logger.js'
  // ... imports

  export async function buildApp() {
    const app = Fastify({
      loggerInstance: fastifyLogger,
      disableRequestLogging: true,
    })
    // register plugins
    // register routes
    return app
  }

  // index.ts
  import 'dotenv/config'
  import { logger } from './logger.js'
  import { buildApp } from './app.js'
  import { runInit } from './init.js'

  async function start() {
    await runInit()
    const app = await buildApp()
    await app.listen({ port: 3001, host: '0.0.0.0' })
    logger.info('TestTool backend started', { port: 3001 })
  }

  start()
  ```

---

## Task 10: Swagger Documentation

**Files:**
- Create: `backend/src/interfaces/http/plugins/swagger.ts`

- [ ] **Step 1: Create Swagger plugin**

  ```typescript
  import swagger from '@fastify/swagger'
  import swaggerUi from '@fastify/swagger-ui'

  await app.register(swagger, {
    openapi: {
      info: { title: 'TestTool API', version: '1.0.0' },
      servers: [{ url: '/api/v1' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  await app.register(swaggerUi, { routePrefix: '/docs' })
  ```

---

## Task 11: CORS Plugin

**Files:**
- Create: `backend/src/interfaces/http/plugins/cors.ts`

- [ ] **Step 1: Create CORS plugin**

  Allow credentials, expose headers, allow frontend origin (from env or wildcard in dev).

---

## Task 12: Health Check Route

**Files:**
- Create: `backend/src/interfaces/http/routes/health.ts`

- [ ] **Step 1: Create health route**

  ```typescript
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  }))
  ```

---

## Task 13: Docker/Podman Setup

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/scripts/docker-entrypoint.sh`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Create multi-stage Dockerfile**

  ```dockerfile
  # Stage 1: builder
  FROM node:22-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npx prisma generate
  RUN npm run build

  # Stage 2: runner
  FROM node:22-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --omit=dev && npm install prisma tsx postgresql-client
  COPY --from=builder /app/dist ./dist
  COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
  COPY --from=builder /app/prisma ./prisma
  COPY scripts/docker-entrypoint.sh /usr/local/bin/
  RUN chmod +x /usr/local/bin/docker-entrypoint.sh
  EXPOSE 3001
  ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
  ```

- [ ] **Step 2: Create entrypoint script**

  The script must:
  1. Wait for database to be ready (pg_isready or psql ping)
  2. Run `prisma migrate deploy`
  3. Check if admin user exists; if not, run `prisma db seed`
  4. Start the server with `node dist/index.js`

- [ ] **Step 3: Update docker-compose.yml**

  Add backend, frontend, worker services. Use named volumes for data persistence.

---

## Task 14: Integration Tests

**Files:**
- Create: `backend/tests/*.test.ts`

- [ ] **Step 1: Create integration tests**

  Using `vitest` + `supertest`-equivalent (use Fastify's `inject` method):
  - Health check returns 200
  - Auth endpoints return correct status codes
  - Protected routes reject unauthenticated requests

---

## Verification

- [ ] `npm run dev` starts without errors
- [ ] `npx prisma migrate dev` runs cleanly
- [ ] `npx prisma db seed` creates admin user
- [ ] `GET /api/v1/health` returns 200
- [ ] Swagger UI at `/docs`
- [ ] Docker build succeeds
- [ ] Podman compose starts all services
- [ ] Integration tests pass
