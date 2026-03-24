# Plan 5 -- Projects (Backend CRUD + Frontend Pages + Members + Project Selector)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Projects feature -- backend CRUD with member management, frontend list/detail/create/edit pages, member management UI, and a project selector in the sidebar. This is the first domain feature on top of the auth/infrastructure foundation.

**Architecture:** Clean architecture layers -- domain entity + repository interface, application service, Prisma repository implementation, Fastify HTTP routes. Frontend uses Next.js 16.2 App Router with `[locale]` segment, shadcn/ui components, next-intl for i18n.

**IMPORTANT:** Next.js 16 has breaking changes. Before writing any frontend code, read the relevant docs in `frontend/node_modules/next/dist/docs/` to understand current API conventions.

**Dependencies:** Plan 1 (infrastructure) and Plan 2 (authentication) must be complete. The Prisma schema already contains `Project` and `ProjectMember` models. Auth middleware (`requireAuth`) and permission guard (`permissionGuard`) are available. Audit log plugin is registered globally.

---

## File Map

```
backend/
  src/
    domain/
      entities/
        Project.ts                  -- Domain entity with validation + slug generation
      interfaces/
        IProjectRepository.ts       -- Repository interface
    services/
      ProjectService.ts             -- Application service (all business logic)
    infrastructure/
      repositories/
        ProjectRepository.ts        -- Prisma implementation of IProjectRepository
    interfaces/
      http/
        routes/
          projects.ts               -- /projects CRUD routes
          projectMembers.ts         -- /projects/:id/members routes
        schemas/
          projectSchemas.ts         -- Zod schemas for request/response validation
    app.ts                          -- (modify) Register new routes

frontend/
  src/
    app/
      [locale]/
        projects/
          page.tsx                  -- Projects list page
        projects/
          [id]/
            page.tsx                -- Project detail page
    components/
      projects/
        ProjectsTable.tsx           -- Table component for project list
        ProjectDialog.tsx           -- Create/Edit project dialog
        ProjectOverview.tsx         -- Overview tab content
        ProjectSettings.tsx         -- Settings tab content (archive, etc.)
        MembersTable.tsx            -- Members table with actions
        AddMemberDialog.tsx         -- Dialog for adding a member
        ProjectSelector.tsx         -- Sidebar project selector dropdown
      providers/
        ProjectProvider.tsx         -- React context for selected project
    lib/
      api/
        projects.ts                 -- API client functions for project endpoints
    messages/
      en-US.json                    -- (modify) Add project-related translations
      pt-BR.json                    -- (modify) Add project-related translations
```

---

## Task 1: Project Domain Entity + Repository Interface

**Files:**
- Create: `backend/src/domain/entities/Project.ts`
- Create: `backend/src/domain/interfaces/IProjectRepository.ts`

### Steps

- [ ] **Step 1: Create the Project domain entity**

  Create `backend/src/domain/entities/Project.ts` with the following:

  ```typescript
  // backend/src/domain/entities/Project.ts
  export interface ProjectProps {
    id: string
    name: string
    slug: string
    description: string | null
    createdById: string
    createdAt: Date
    updatedAt: Date
    archivedAt: Date | null
  }

  export class Project {
    readonly id: string
    readonly name: string
    readonly slug: string
    readonly description: string | null
    readonly createdById: string
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly archivedAt: Date | null

    constructor(props: ProjectProps) {
      this.id = props.id
      this.name = props.name
      this.slug = props.slug
      this.description = props.description
      this.createdById = props.createdById
      this.createdAt = props.createdAt
      this.updatedAt = props.updatedAt
      this.archivedAt = props.archivedAt
    }

    get isArchived(): boolean {
      return this.archivedAt !== null
    }

    static generateSlug(name: string): string {
      return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }

    static validateName(name: string): void {
      if (!name || name.trim().length === 0) {
        throw new Error('Project name is required')
      }
      if (name.trim().length > 100) {
        throw new Error('Project name must not exceed 100 characters')
      }
    }

    static validateSlug(slug: string): void {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error('Slug must be lowercase alphanumeric with hyphens')
      }
      if (slug.length > 100) {
        throw new Error('Slug must not exceed 100 characters')
      }
    }
  }
  ```

  Key patterns:
  - Slug generation: kebab-case from name, strip special chars
  - Validation methods are static so they can be called before construction
  - Entity is immutable (readonly properties)

- [ ] **Step 2: Create the repository interface**

  Create `backend/src/domain/interfaces/IProjectRepository.ts`:

  ```typescript
  // backend/src/domain/interfaces/IProjectRepository.ts
  import type { Project } from '../entities/Project.js'

  export interface ProjectListFilter {
    search?: string
    archived?: boolean
    memberUserId?: string  // filter by membership
    page: number
    limit: number
  }

  export interface PaginatedResult<T> {
    data: T[]
    total: number
    page: number
    limit: number
    totalPages: number
  }

  export interface ProjectMemberRecord {
    id: string
    projectId: string
    userId: string
    roleId: string
    joinedAt: Date
    user: { id: string; name: string | null; email: string; avatarUrl: string | null }
    role: { id: string; name: string; label: string; color: string | null }
  }

  export interface IProjectRepository {
    findById(id: string): Promise<Project | null>
    findBySlug(slug: string): Promise<Project | null>
    list(filter: ProjectListFilter): Promise<PaginatedResult<Project & { _count: { members: number } }>>
    create(data: { name: string; slug: string; description?: string | null; createdById: string }): Promise<Project>
    update(id: string, data: { name?: string; slug?: string; description?: string | null }): Promise<Project>
    archive(id: string): Promise<Project>
    slugExists(slug: string, excludeId?: string): Promise<boolean>

    // Members
    listMembers(projectId: string, page: number, limit: number): Promise<PaginatedResult<ProjectMemberRecord>>
    findMember(projectId: string, userId: string): Promise<ProjectMemberRecord | null>
    addMember(projectId: string, userId: string, roleId: string): Promise<ProjectMemberRecord>
    updateMemberRole(projectId: string, userId: string, roleId: string): Promise<ProjectMemberRecord>
    removeMember(projectId: string, userId: string): Promise<void>
    countMembersByRole(projectId: string, roleName: string): Promise<number>
    isMember(projectId: string, userId: string): Promise<boolean>
  }
  ```

  Key patterns:
  - `PaginatedResult` is generic -- reuse for all paginated queries across the app
  - `ProjectMemberRecord` includes joined user and role data for display
  - `countMembersByRole` used to prevent removing the last admin

- [ ] **Step 3: Verify**

  - Files compile: `cd backend && npx tsc --noEmit`
  - No circular imports
  - Types are exported and importable from both files

---

## Task 2: Prisma ProjectRepository Implementation

**Files:**
- Create: `backend/src/infrastructure/repositories/ProjectRepository.ts`

### Steps

- [ ] **Step 1: Create the `infrastructure/repositories/` directory if it does not exist**

  ```bash
  mkdir -p backend/src/infrastructure/repositories
  ```

- [ ] **Step 2: Implement ProjectRepository**

  Create `backend/src/infrastructure/repositories/ProjectRepository.ts`:

  - Import `prisma` from `../../infrastructure/database/prisma.js`
  - Import `Project` from `../../domain/entities/Project.js`
  - Import `IProjectRepository` and related types from `../../domain/interfaces/IProjectRepository.js`
  - Implement every method from the interface

  Implementation details for each method:

  **findById(id):**
  - `prisma.project.findUnique({ where: { id } })`
  - Return `null` if not found, otherwise map to `Project` entity

  **findBySlug(slug):**
  - `prisma.project.findUnique({ where: { slug } })`
  - Same mapping as findById

  **list(filter):**
  - Build `where` clause:
    - If `filter.search`: `{ OR: [{ name: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] }`
    - If `filter.archived === true`: `{ archivedAt: { not: null } }`
    - If `filter.archived === false` (default): `{ archivedAt: null }`
    - If `filter.memberUserId`: `{ members: { some: { userId: filter.memberUserId } } }`
  - Use `prisma.project.findMany` with `skip`, `take`, `orderBy: { createdAt: 'desc' }`
  - Include `_count: { select: { members: true } }`
  - Use `prisma.project.count` with same `where` for total
  - Calculate `totalPages = Math.ceil(total / limit)`

  **create(data):**
  - `prisma.project.create({ data })` -- map result to `Project` entity

  **update(id, data):**
  - `prisma.project.update({ where: { id }, data })` -- map result to `Project` entity

  **archive(id):**
  - `prisma.project.update({ where: { id }, data: { archivedAt: new Date() } })`

  **slugExists(slug, excludeId?):**
  - `prisma.project.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } })`
  - Return `!!result`

  **listMembers(projectId, page, limit):**
  - `prisma.projectMember.findMany` with `where: { projectId }`, `include: { user: { select: ... }, role: { select: ... } }`
  - Paginate with `skip` and `take`, order by `joinedAt asc`

  **findMember(projectId, userId):**
  - `prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } }, include: { user, role } })`

  **addMember(projectId, userId, roleId):**
  - `prisma.projectMember.create({ data: { projectId, userId, roleId }, include: { user, role } })`

  **updateMemberRole(projectId, userId, roleId):**
  - `prisma.projectMember.update({ where: { projectId_userId: { projectId, userId } }, data: { roleId }, include: { user, role } })`

  **removeMember(projectId, userId):**
  - `prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } })`

  **countMembersByRole(projectId, roleName):**
  - `prisma.projectMember.count({ where: { projectId, role: { name: roleName } } })`

  **isMember(projectId, userId):**
  - `prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } })`
  - Return `!!result`

- [ ] **Step 3: Verify**

  - File compiles: `cd backend && npx tsc --noEmit`
  - All interface methods are implemented (no TS errors about missing members)

---

## Task 3: ProjectService (Application Layer)

**Files:**
- Create: `backend/src/services/ProjectService.ts`

### Steps

- [ ] **Step 1: Create the ProjectService class**

  Create `backend/src/services/ProjectService.ts`:

  ```typescript
  import type { IProjectRepository, ProjectListFilter, PaginatedResult, ProjectMemberRecord } from '../domain/interfaces/IProjectRepository.js'
  import { Project } from '../domain/entities/Project.js'
  import { logger } from '../logger.js'
  ```

  Constructor takes `IProjectRepository` as dependency injection.

- [ ] **Step 2: Implement createProject(dto, actor)**

  ```
  createProject(dto: { name: string; description?: string; slug?: string }, actor: { userId: string; roleId: string }): Promise<Project>
  ```

  Logic:
  1. Validate name with `Project.validateName(dto.name)`
  2. Generate slug: if `dto.slug` provided, validate it; otherwise `Project.generateSlug(dto.name)`
  3. Check slug uniqueness via `this.repo.slugExists(slug)`
  4. If slug exists, append incrementing number: `slug-1`, `slug-2`, etc. (loop until unique, max 10 attempts)
  5. Call `this.repo.create({ name, slug, description, createdById: actor.userId })`
  6. Automatically add the creator as a project member with "admin" role:
     - Look up the admin role: query the role with `name: 'admin'` (or accept roleId from a constant)
     - Call `this.repo.addMember(project.id, actor.userId, adminRoleId)`
  7. Log: `logger.info('Project created', { action: 'project.create', projectId: project.id, userId: actor.userId })`
  8. Return the project

  Note: For finding the admin role, either accept it as a param or use prisma directly in the service. Preferred approach: add a helper or use the role name lookup. Since the service should stay independent of Prisma, consider adding a `findRoleByName(name: string)` method to the repository interface, OR import prisma directly in the service (following the existing pattern in AuthService).

  Decision: Follow the existing AuthService pattern -- import prisma directly for simple lookups that do not belong to the project repository interface.

- [ ] **Step 3: Implement getProject(id, actor)**

  ```
  getProject(id: string, actor: { userId: string; roleId: string }): Promise<Project>
  ```

  Logic:
  1. Fetch project via `this.repo.findById(id)`
  2. If not found, throw error with status 404
  3. Check access: actor must be a member (`this.repo.isMember(id, actor.userId)`) OR actor must have system admin role
  4. To check system admin: look up role name from actor.roleId, or check a permission like `project:read`
  5. Simplified approach: check membership. If not a member, check if actor's role name is 'admin' (system-wide admin). Import prisma for the role lookup.
  6. If neither member nor admin, throw 403
  7. Return project

- [ ] **Step 4: Implement listProjects(actor, filter)**

  ```
  listProjects(actor: { userId: string; roleId: string }, filter: Omit<ProjectListFilter, 'memberUserId'>): Promise<PaginatedResult<...>>
  ```

  Logic:
  1. Determine if actor is system admin (role name = 'admin')
  2. If admin: list all projects (no memberUserId filter)
  3. If not admin: set `filter.memberUserId = actor.userId` to only return projects where actor is a member
  4. Default `archived` to `false` if not provided
  5. Default `page` to 1, `limit` to 20 (max 100)
  6. Return `this.repo.list(fullFilter)`

- [ ] **Step 5: Implement updateProject(id, dto, actor)**

  ```
  updateProject(id: string, dto: { name?: string; description?: string; slug?: string }, actor: { userId: string; roleId: string }): Promise<Project>
  ```

  Logic:
  1. Fetch project, check it exists (404 if not)
  2. Check permission: actor must be project member with admin/lead role, OR system admin
  3. If `dto.name` provided, validate with `Project.validateName`
  4. If `dto.slug` provided, validate with `Project.validateSlug`, check uniqueness excluding current project id
  5. Call `this.repo.update(id, dto)`
  6. Log the update
  7. Return updated project

- [ ] **Step 6: Implement archiveProject(id, actor)**

  ```
  archiveProject(id: string, actor: { userId: string; roleId: string }): Promise<Project>
  ```

  Logic:
  1. Fetch project, check it exists
  2. Check permission: only system admin OR project admin can archive
  3. If already archived, throw 400
  4. Call `this.repo.archive(id)`
  5. Log the archive action
  6. Return archived project

- [ ] **Step 7: Implement member management methods**

  **addMember(projectId, userId, roleId, actor):**
  1. Verify project exists (404)
  2. Permission check: actor must be project admin/lead or system admin
  3. Verify target user exists (import prisma to check `prisma.user.findUnique`)
  4. Verify role exists
  5. Check if user is already a member (409 Conflict if so)
  6. Call `this.repo.addMember(projectId, userId, roleId)`
  7. Log the action

  **updateMemberRole(projectId, userId, roleId, actor):**
  1. Verify project exists
  2. Permission check: actor must be project admin or system admin
  3. Verify membership exists (404 if not)
  4. If changing own role AND actor is the last admin, prevent (400: "Cannot change role of the last admin")
  5. Call `this.repo.updateMemberRole(projectId, userId, roleId)`
  6. Log the action

  **removeMember(projectId, userId, actor):**
  1. Verify project exists
  2. Permission check: actor must be project admin or system admin (or user removing themselves)
  3. Verify membership exists (404)
  4. Prevent removing the last admin: `this.repo.countMembersByRole(projectId, 'admin')` -- if count is 1 and the target user is that admin, throw 400
  5. Call `this.repo.removeMember(projectId, userId)`
  6. Log the action

  **listMembers(projectId, actor, page, limit):**
  1. Verify project exists
  2. Check actor is a member or system admin
  3. Return `this.repo.listMembers(projectId, page, limit)`

- [ ] **Step 8: Create a helper for permission checks**

  Create a private method in ProjectService:

  ```typescript
  private async checkProjectPermission(
    projectId: string,
    actor: { userId: string; roleId: string },
    requiredRoles: string[] // e.g., ['admin', 'lead']
  ): Promise<void>
  ```

  Logic:
  1. Check if actor is system admin (role name = 'admin') -- if so, return (allowed)
  2. Find project member record: `this.repo.findMember(projectId, actor.userId)`
  3. If not a member, throw 403
  4. If member's role name is not in `requiredRoles`, throw 403

  This avoids duplicating the permission check in every method.

- [ ] **Step 9: Verify**

  - File compiles: `cd backend && npx tsc --noEmit`
  - All public methods have proper error handling
  - Logger calls follow the existing pattern: `logger.info(message, { action: 'project.xxx', ... })`

---

## Task 4: Project API Routes (Backend HTTP Layer)

**Files:**
- Create: `backend/src/interfaces/http/schemas/projectSchemas.ts`
- Create: `backend/src/interfaces/http/routes/projects.ts`
- Create: `backend/src/interfaces/http/routes/projectMembers.ts`
- Modify: `backend/src/app.ts`

### Steps

- [ ] **Step 1: Create Zod validation schemas**

  Create `backend/src/interfaces/http/schemas/projectSchemas.ts`:

  Define schemas using the JSON Schema format (matching the existing pattern in auth routes that use `type: 'object'` for Fastify schema validation):

  **createProjectBody:**
  ```
  { name: string (required, maxLength 100), description: string (optional), slug: string (optional, pattern: ^[a-z0-9]+(?:-[a-z0-9]+)*$) }
  ```

  **updateProjectBody:**
  ```
  { name: string (optional), description: string (optional), slug: string (optional) }
  ```

  **projectParams:**
  ```
  { id: string (uuid format) }
  ```

  **listProjectsQuery:**
  ```
  { page: integer (default 1, min 1), limit: integer (default 20, min 1, max 100), search: string (optional), archived: boolean (optional, default false) }
  ```

  **memberParams:**
  ```
  { id: string (uuid), userId: string (uuid) }
  ```

  **addMemberBody:**
  ```
  { userId: string (uuid, required), roleId: string (uuid, required) }
  ```

  **updateMemberRoleBody:**
  ```
  { roleId: string (uuid, required) }
  ```

  **paginationQuery:**
  ```
  { page: integer (default 1), limit: integer (default 20, max 100) }
  ```

  **Response schemas** for Swagger documentation:
  - `projectResponse` -- single project object
  - `projectListResponse` -- paginated array of projects with member count
  - `memberResponse` -- single member with user and role info
  - `memberListResponse` -- paginated array of members

  Follow the existing pattern: use plain JSON Schema objects (not Zod -- the existing routes use inline JSON Schema for Fastify). If you want to use Zod, use `zod-to-json-schema` to convert. Check which approach the codebase uses and match it.

  Looking at the existing routes (auth.ts, admin/users.ts), they use **inline JSON Schema objects** directly in the `schema` property. Follow that same pattern.

  Export all schemas as named exports.

- [ ] **Step 2: Create project CRUD routes**

  Create `backend/src/interfaces/http/routes/projects.ts`:

  ```typescript
  import type { FastifyInstance } from 'fastify'
  import { ProjectService } from '../../../services/ProjectService.js'
  import { ProjectRepository } from '../../../infrastructure/repositories/ProjectRepository.js'
  import { permissionGuard } from '../plugins/permissionGuard.js'
  // Import schemas from projectSchemas.ts
  ```

  Register as an async Fastify plugin function: `export async function projectRoutes(app: FastifyInstance)`

  Instantiate dependencies at the top of the function:
  ```typescript
  const repo = new ProjectRepository()
  const service = new ProjectService(repo)
  ```

  **GET /projects:**
  - PreHandler: none (auth plugin already decorates `request.user`; service handles access filtering)
  - Schema: tags ['Projects'], summary, querystring from listProjectsQuery, response 200 from projectListResponse
  - Handler: extract `page, limit, search, archived` from query, call `service.listProjects(request.user, filter)`
  - Return paginated result

  **POST /projects:**
  - PreHandler: `[permissionGuard('project', 'create')]`
  - Schema: tags ['Projects'], body from createProjectBody, response 201 from projectResponse
  - Handler: call `service.createProject(request.body, request.user)`
  - Return `reply.status(201).send(project)`

  **GET /projects/:id:**
  - PreHandler: none (service checks membership)
  - Schema: tags ['Projects'], params from projectParams, response 200 from projectResponse
  - Handler: call `service.getProject(request.params.id, request.user)`

  **PATCH /projects/:id:**
  - PreHandler: `[permissionGuard('project', 'update')]`
  - Schema: tags ['Projects'], params, body from updateProjectBody, response 200
  - Handler: call `service.updateProject(request.params.id, request.body, request.user)`

  **DELETE /projects/:id:**
  - PreHandler: `[permissionGuard('project', 'delete')]`
  - Schema: tags ['Projects'], params from projectParams, response 200
  - Handler: call `service.archiveProject(request.params.id, request.user)` (soft delete)
  - Return the archived project

  Error handling pattern (matching existing routes):
  ```typescript
  try {
    // ... service call
  } catch (err: any) {
    if (err.statusCode) return reply.status(err.statusCode).send({ error: err.message })
    throw err
  }
  ```

  Create a custom error class or reuse a pattern. Recommended: create a simple `ServiceError` class:
  ```typescript
  export class ServiceError extends Error {
    constructor(message: string, public statusCode: number) { super(message) }
  }
  ```
  Place it in `backend/src/services/ProjectService.ts` (exported) or in a shared `backend/src/domain/errors.ts`.

- [ ] **Step 3: Create project members routes**

  Create `backend/src/interfaces/http/routes/projectMembers.ts`:

  ```typescript
  export async function projectMemberRoutes(app: FastifyInstance)
  ```

  **GET /projects/:id/members:**
  - Schema: params (id), querystring (page, limit), response 200 memberListResponse
  - Handler: `service.listMembers(params.id, request.user, query.page, query.limit)`

  **POST /projects/:id/members:**
  - PreHandler: `[permissionGuard('project', 'update')]`
  - Schema: params (id), body (userId, roleId), response 201 memberResponse
  - Handler: `service.addMember(params.id, body.userId, body.roleId, request.user)`

  **PATCH /projects/:id/members/:userId:**
  - PreHandler: `[permissionGuard('project', 'update')]`
  - Schema: params (id, userId), body (roleId), response 200 memberResponse
  - Handler: `service.updateMemberRole(params.id, params.userId, body.roleId, request.user)`

  **DELETE /projects/:id/members/:userId:**
  - PreHandler: `[permissionGuard('project', 'update')]`
  - Schema: params (id, userId), response 204
  - Handler: `service.removeMember(params.id, params.userId, request.user)`
  - Return `reply.status(204).send()`

- [ ] **Step 4: Register routes in app.ts**

  Modify `backend/src/app.ts`:

  1. Add imports:
     ```typescript
     import { projectRoutes } from './interfaces/http/routes/projects.js'
     import { projectMemberRoutes } from './interfaces/http/routes/projectMembers.js'
     ```

  2. Register routes (after existing route registrations):
     ```typescript
     await app.register(projectRoutes, { prefix: '/api/v1' })
     await app.register(projectMemberRoutes, { prefix: '/api/v1' })
     ```

- [ ] **Step 5: Verify**

  - `cd backend && npx tsc --noEmit` -- no type errors
  - Start the server: `cd backend && npm run dev`
  - Check Swagger docs at `http://localhost:3001/docs` -- all project endpoints listed under "Projects" tag
  - Test with curl:
    ```bash
    # Create project (requires auth token)
    curl -X POST http://localhost:3001/api/v1/projects \
      -H "Authorization: Bearer <token>" \
      -H "Content-Type: application/json" \
      -d '{"name": "My First Project"}'

    # List projects
    curl http://localhost:3001/api/v1/projects \
      -H "Authorization: Bearer <token>"

    # Get single project
    curl http://localhost:3001/api/v1/projects/<id> \
      -H "Authorization: Bearer <token>"
    ```
  - Verify audit log entries are created for POST, PATCH, DELETE operations (the global auditLog plugin handles this automatically based on URL pattern matching `/projects/`)

---

## Task 5: Frontend -- API Client Functions

**Files:**
- Create: `frontend/src/lib/api/projects.ts`

**IMPORTANT:** Before writing any frontend code, read `frontend/node_modules/next/dist/docs/` to understand Next.js 16.2 conventions and any breaking changes.

### Steps

- [ ] **Step 1: Create the API client module**

  Create `frontend/src/lib/api/projects.ts`:

  Define TypeScript interfaces for API responses:

  ```typescript
  export interface Project {
    id: string
    name: string
    slug: string
    description: string | null
    createdById: string
    createdAt: string
    updatedAt: string
    archivedAt: string | null
    _count?: { members: number }
  }

  export interface ProjectMember {
    id: string
    projectId: string
    userId: string
    roleId: string
    joinedAt: string
    user: { id: string; name: string | null; email: string; avatarUrl: string | null }
    role: { id: string; name: string; label: string; color: string | null }
  }

  export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
  ```

  Define API functions. Each function should:
  - Use `fetch` with the backend base URL (from env `NEXT_PUBLIC_API_URL` or default `http://localhost:3001/api/v1`)
  - Include `Authorization: Bearer <token>` header (get token from cookie or localStorage -- match the auth pattern established in Plan 2)
  - Handle errors consistently (throw on non-2xx responses)

  Functions to create:

  ```typescript
  export async function listProjects(params: { page?: number; limit?: number; search?: string; archived?: boolean }): Promise<PaginatedResponse<Project>>
  export async function getProject(id: string): Promise<Project>
  export async function createProject(data: { name: string; description?: string; slug?: string }): Promise<Project>
  export async function updateProject(id: string, data: { name?: string; description?: string; slug?: string }): Promise<Project>
  export async function archiveProject(id: string): Promise<Project>
  export async function listProjectMembers(projectId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<ProjectMember>>
  export async function addProjectMember(projectId: string, data: { userId: string; roleId: string }): Promise<ProjectMember>
  export async function updateProjectMemberRole(projectId: string, userId: string, data: { roleId: string }): Promise<ProjectMember>
  export async function removeProjectMember(projectId: string, userId: string): Promise<void>
  ```

  Create a shared `fetchApi` helper at the top of the file (or in a shared `frontend/src/lib/api/client.ts`):

  ```typescript
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

  async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(body.error || res.statusText, res.status)
    }
    if (res.status === 204) return undefined as T
    return res.json()
  }

  export class ApiError extends Error {
    constructor(message: string, public status: number) { super(message) }
  }
  ```

- [ ] **Step 2: Verify**

  - File compiles: `cd frontend && npx tsc --noEmit`
  - All functions are properly typed

---

## Task 6: Frontend -- i18n Translations

**Files:**
- Modify: `frontend/src/messages/en-US.json`
- Modify: `frontend/src/messages/pt-BR.json`

### Steps

- [ ] **Step 1: Add English translations**

  Add a `"projects"` key to `en-US.json` with the following structure:

  ```json
  {
    "projects": {
      "title": "Projects",
      "newProject": "New Project",
      "searchPlaceholder": "Search projects...",
      "emptyState": "No projects found. Create your first project to get started.",
      "emptyStateFiltered": "No projects match your search criteria.",
      "columns": {
        "name": "Name",
        "slug": "Slug",
        "members": "Members",
        "created": "Created",
        "status": "Status"
      },
      "status": {
        "active": "Active",
        "archived": "Archived"
      },
      "dialog": {
        "createTitle": "Create Project",
        "editTitle": "Edit Project",
        "nameLabel": "Project Name",
        "namePlaceholder": "Enter project name",
        "descriptionLabel": "Description",
        "descriptionPlaceholder": "Brief description of the project",
        "slugLabel": "Slug",
        "slugHelp": "URL-friendly identifier. Auto-generated from name.",
        "cancel": "Cancel",
        "create": "Create",
        "save": "Save Changes"
      },
      "detail": {
        "overview": "Overview",
        "members": "Members",
        "settings": "Settings",
        "description": "Description",
        "noDescription": "No description provided.",
        "stats": {
          "testPlans": "Test Plans",
          "bugs": "Bugs",
          "members": "Members"
        },
        "archive": {
          "title": "Archive Project",
          "description": "Archiving this project will hide it from the active list. Members will no longer be able to access it. This action can be reversed by an admin.",
          "confirm": "Archive",
          "cancel": "Cancel"
        }
      },
      "members": {
        "title": "Members",
        "addMember": "Add Member",
        "columns": {
          "name": "Name",
          "email": "Email",
          "role": "Role",
          "joined": "Joined"
        },
        "addDialog": {
          "title": "Add Member",
          "searchUser": "Search users...",
          "selectRole": "Select role",
          "add": "Add",
          "cancel": "Cancel"
        },
        "removeDialog": {
          "title": "Remove Member",
          "description": "Are you sure you want to remove {name} from this project?",
          "confirm": "Remove",
          "cancel": "Cancel"
        },
        "lastAdminError": "Cannot remove the last admin from the project."
      },
      "selector": {
        "allProjects": "All Projects",
        "selectProject": "Select project",
        "noProjects": "No projects"
      }
    }
  }
  ```

- [ ] **Step 2: Add Portuguese translations**

  Add the equivalent `"projects"` key to `pt-BR.json` with Portuguese translations. Translate all strings, for example:
  - "Projects" -> "Projetos"
  - "New Project" -> "Novo Projeto"
  - "Search projects..." -> "Buscar projetos..."
  - "No projects found..." -> "Nenhum projeto encontrado. Crie seu primeiro projeto para comecar."
  - etc.

- [ ] **Step 3: Verify**

  - Both JSON files are valid JSON (no syntax errors)
  - Both files have the same key structure under `"projects"`

---

## Task 7: Frontend -- Projects List Page

**Files:**
- Create: `frontend/src/app/[locale]/projects/page.tsx`
- Create: `frontend/src/components/projects/ProjectsTable.tsx`

**IMPORTANT:** Read `frontend/node_modules/next/dist/docs/` before writing page components. Understand the App Router conventions for Next.js 16.2.

### Steps

- [ ] **Step 1: Install required shadcn/ui components**

  Run the following to add needed components (if not already installed):

  ```bash
  cd frontend && npx shadcn@latest add table input button badge dialog select tabs avatar dropdown-menu pagination
  ```

  If the shadcn CLI is not set up, install it first. Check if `components.json` or `shadcn.config.ts` exists at `frontend/`. If not, initialize shadcn:

  ```bash
  cd frontend && npx shadcn@latest init
  ```

  Choose: TypeScript, Tailwind CSS, src/components/ui, default style.

- [ ] **Step 2: Create the ProjectsTable component**

  Create `frontend/src/components/projects/ProjectsTable.tsx`:

  This is a client component (`'use client'`).

  Props:
  ```typescript
  interface ProjectsTableProps {
    projects: Project[]
    total: number
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    onRowClick: (project: Project) => void
  }
  ```

  Implementation:
  - Use shadcn `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
  - Columns: Name (bold), Slug (monospace/muted), Members (count badge), Created (formatted date), Status (Badge -- green for active, gray for archived)
  - Use `useTranslations('projects')` from next-intl for column headers
  - Each row is clickable (cursor-pointer, hover state)
  - At the bottom, render shadcn `Pagination` component with page controls
  - Empty state: show a centered message with icon when `projects.length === 0`

  Date formatting: use `useFormatter()` from next-intl or `Intl.DateTimeFormat` with the current locale.

- [ ] **Step 3: Create the projects list page**

  Create `frontend/src/app/[locale]/projects/page.tsx`:

  This should be a client component (needs state for search, pagination, data fetching).

  Implementation:
  - Page header: `<h1>` with translated title, "New Project" button on the right
  - Search bar: shadcn `Input` with search icon, debounced (300ms) -- updates the `search` state
  - Filter toggle: "Show archived" checkbox or toggle
  - Data fetching: use `useEffect` + `useState` to call `listProjects({ page, limit: 20, search, archived })`
  - Loading state: skeleton or spinner while fetching
  - Render `<ProjectsTable>` with the fetched data
  - "New Project" button opens the `ProjectDialog` (Task 8)
  - On row click: navigate to `/[locale]/projects/[id]` using `useRouter` from next/navigation

  ```typescript
  'use client'

  import { useState, useEffect, useCallback } from 'react'
  import { useRouter } from 'next/navigation'
  import { useTranslations } from 'next-intl'
  import { listProjects, type Project } from '@/lib/api/projects'
  import { ProjectsTable } from '@/components/projects/ProjectsTable'
  import { ProjectDialog } from '@/components/projects/ProjectDialog'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { Plus, Search } from 'lucide-react'
  ```

  State variables:
  - `projects: Project[]`
  - `total: number`, `page: number`, `totalPages: number`
  - `search: string`
  - `archived: boolean`
  - `loading: boolean`
  - `dialogOpen: boolean`

  Debounce the search input (use a simple `useRef` + `setTimeout` pattern or a `useDebouncedValue` hook).

- [ ] **Step 4: Verify**

  - Page renders at `http://localhost:3000/en-US/projects`
  - Table shows projects (or empty state if none)
  - Search filters in real-time (debounced)
  - Pagination works
  - "New Project" button visible (conditionally based on user permissions -- can defer permission check to later if auth context is not yet available)

---

## Task 8: Frontend -- Create/Edit Project Dialog

**Files:**
- Create: `frontend/src/components/projects/ProjectDialog.tsx`

### Steps

- [ ] **Step 1: Create the ProjectDialog component**

  This is a client component (`'use client'`).

  Props:
  ```typescript
  interface ProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project?: Project | null  // null = create mode, Project = edit mode
    onSuccess: () => void     // callback to refresh list after create/edit
  }
  ```

  Implementation:
  - Use shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
  - Form with:
    - **Name** input: required, max 100 chars. On change, auto-generate slug preview.
    - **Description** textarea: optional
    - **Slug** input: auto-generated from name (shown below name field), editable. Rendered in monospace, with a label explaining it is URL-friendly.
  - Slug auto-generation:
    - When name changes and user has NOT manually edited slug, regenerate slug
    - Use the same `generateSlug` logic as backend (kebab-case conversion)
    - Track whether user has manually modified slug with a `slugTouched` state boolean
  - Form validation:
    - Name: required, max 100
    - Slug: must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`
    - Show inline error messages
  - Submit:
    - Create mode: POST /projects
    - Edit mode: PATCH /projects/:id
    - Show loading spinner on submit button
    - On success: call `onSuccess()`, close dialog
    - On error: show error message (toast or inline)
  - Use `useTranslations('projects.dialog')` for labels

  ```typescript
  'use client'

  import { useState, useEffect } from 'react'
  import { useTranslations } from 'next-intl'
  import { createProject, updateProject } from '@/lib/api/projects'
  import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
  } from '@/components/ui/dialog'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { Label } from '@/components/ui/label'
  import { Textarea } from '@/components/ui/textarea'
  ```

- [ ] **Step 2: Implement slug generation (client-side)**

  Create a utility function (can be in the same file or `frontend/src/lib/utils/slug.ts`):

  ```typescript
  export function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
  ```

  This must match the backend implementation exactly.

- [ ] **Step 3: Verify**

  - Dialog opens when clicking "New Project" on list page
  - Name field auto-generates slug preview
  - Editing slug manually stops auto-generation
  - Create: form submits, project appears in list
  - Edit: pre-populated fields, changes save correctly
  - Validation errors display inline

---

## Task 9: Frontend -- Project Detail Page

**Files:**
- Create: `frontend/src/app/[locale]/projects/[id]/page.tsx`
- Create: `frontend/src/components/projects/ProjectOverview.tsx`
- Create: `frontend/src/components/projects/ProjectSettings.tsx`

### Steps

- [ ] **Step 1: Create the project detail page**

  Create `frontend/src/app/[locale]/projects/[id]/page.tsx`:

  This is a client component.

  Implementation:
  - Fetch project data on mount: `getProject(params.id)`
  - Show loading skeleton while fetching
  - Page header: project name + slug badge + status badge (active/archived)
  - Tabbed layout using shadcn `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`:
    - **Overview** tab (default)
    - **Members** tab
    - **Settings** tab
  - Edit button in header (opens `ProjectDialog` in edit mode)
  - Back link/button to projects list

  Note: Extract the `id` param according to Next.js 16.2 conventions. In standard App Router, `params` is passed as a prop to the page component. Check the docs for any changes.

- [ ] **Step 2: Create the ProjectOverview component**

  Create `frontend/src/components/projects/ProjectOverview.tsx`:

  Props: `{ project: Project }`

  Implementation:
  - Display project description (or "No description provided" placeholder)
  - Stats cards in a grid (2-3 columns):
    - "Test Plans" -- count (placeholder: 0 for now, will be populated by later plans)
    - "Bugs" -- count (placeholder: 0)
    - "Members" -- count from `project._count?.members`
  - Use shadcn `Card`, `CardHeader`, `CardTitle`, `CardContent`
  - Each stat card shows an icon (from lucide-react), the count, and a label
  - Use `useTranslations('projects.detail')` for labels

- [ ] **Step 3: Create the ProjectSettings component**

  Create `frontend/src/components/projects/ProjectSettings.tsx`:

  Props: `{ project: Project; onArchive: () => void }`

  Implementation:
  - "Danger Zone" section at the bottom
  - Archive button with confirmation dialog:
    - Use shadcn `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction`
    - On confirm: call `archiveProject(project.id)`, then `onArchive()` callback
    - Show warning text about archiving consequences
  - Only visible/enabled if user has permission (can be a simple prop `canArchive: boolean` passed from the parent)

- [ ] **Step 4: Verify**

  - Page renders at `http://localhost:3000/en-US/projects/<uuid>`
  - Tabs switch correctly between Overview, Members, Settings
  - Overview shows description and placeholder stats
  - Archive confirmation dialog works
  - Edit dialog opens with pre-populated data

---

## Task 10: Frontend -- Project Members Management

**Files:**
- Create: `frontend/src/components/projects/MembersTable.tsx`
- Create: `frontend/src/components/projects/AddMemberDialog.tsx`

### Steps

- [ ] **Step 1: Create the MembersTable component**

  Create `frontend/src/components/projects/MembersTable.tsx`:

  This is a client component.

  Props:
  ```typescript
  interface MembersTableProps {
    projectId: string
    canManage: boolean  // whether current user can add/remove/change roles
  }
  ```

  Implementation:
  - Fetch members on mount: `listProjectMembers(projectId, { page, limit: 20 })`
  - Table columns: Avatar + Name, Email, Role (colored badge), Joined date, Actions
  - Role badge: use the `color` field from role data, display `label`
  - Actions column (visible only if `canManage`):
    - **Change role**: inline `Select` dropdown (shadcn `Select`) showing available roles. On change, call `updateProjectMemberRole(projectId, userId, { roleId })`. Show loading state during update.
    - **Remove**: red trash icon button. On click, show confirmation dialog. On confirm, call `removeProjectMember(projectId, userId)`.
  - Handle errors: show toast notification on failure (especially the "last admin" error)
  - Pagination at the bottom
  - Use `useTranslations('projects.members')` for all labels

  For the role Select, fetch available roles from the backend. Either:
  - Add a `GET /roles` endpoint (if not already available)
  - Or hardcode the known roles from seed data

  Recommended: check if a roles endpoint exists. If not, create a minimal one or fetch roles from the members data itself.

- [ ] **Step 2: Create the AddMemberDialog component**

  Create `frontend/src/components/projects/AddMemberDialog.tsx`:

  Props:
  ```typescript
  interface AddMemberDialogProps {
    projectId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
  }
  ```

  Implementation:
  - Use shadcn `Dialog`
  - User search: `Input` field that searches users (need a user search endpoint -- check if `GET /admin/users?search=...` exists; it does in `admin/users.ts`)
  - Display search results as a list with user name + email
  - Select a user (highlight selection)
  - Role selector: `Select` dropdown with available roles
  - "Add" button: calls `addProjectMember(projectId, { userId, roleId })`
  - On success: call `onSuccess()`, close dialog, clear form
  - Handle error: 409 Conflict = "User is already a member"

- [ ] **Step 3: Wire members into the project detail page**

  In `frontend/src/app/[locale]/projects/[id]/page.tsx`, render `<MembersTable>` inside the "Members" tab:

  ```tsx
  <TabsContent value="members">
    <MembersTable projectId={project.id} canManage={canManageMembers} />
  </TabsContent>
  ```

  Determine `canManageMembers` based on the current user's role in the project. For now, this can be passed as a prop or determined by checking the user's membership role in the project data.

- [ ] **Step 4: Verify**

  - Members tab shows list of members
  - "Add Member" button opens dialog
  - User search works
  - Adding a member refreshes the list
  - Role change works inline
  - Remove member with confirmation works
  - Error handling: "last admin" error shows proper message

---

## Task 11: Frontend -- Project Selector (Sidebar)

**Files:**
- Create: `frontend/src/components/projects/ProjectSelector.tsx`
- Create: `frontend/src/components/providers/ProjectProvider.tsx`

### Steps

- [ ] **Step 1: Create the ProjectProvider context**

  Create `frontend/src/components/providers/ProjectProvider.tsx`:

  ```typescript
  'use client'

  import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
  import { listProjects, type Project } from '@/lib/api/projects'

  interface ProjectContextValue {
    selectedProject: Project | null
    setSelectedProject: (project: Project | null) => void
    projects: Project[]
    loading: boolean
    refreshProjects: () => Promise<void>
  }

  const ProjectContext = createContext<ProjectContextValue | null>(null)

  export function ProjectProvider({ children }: { children: ReactNode }) {
    // State: selectedProject, projects, loading
    // On mount:
    //   1. Fetch all user's projects (listProjects with high limit)
    //   2. Read selectedProjectId from localStorage
    //   3. If found and exists in fetched list, set it as selected
    //   4. Otherwise, select the first project (or null if none)
    // On selectedProject change:
    //   - Save id to localStorage
    // Expose refreshProjects() to refetch after create/edit
  }

  export function useProject() {
    const ctx = useContext(ProjectContext)
    if (!ctx) throw new Error('useProject must be used within ProjectProvider')
    return ctx
  }
  ```

  localStorage key: `'testtool:selectedProjectId'`

- [ ] **Step 2: Add ProjectProvider to the app layout**

  Modify the layout file (likely `frontend/src/app/[locale]/layout.tsx` or the root layout) to wrap children with `<ProjectProvider>`:

  ```tsx
  <ProjectProvider>
    {children}
  </ProjectProvider>
  ```

  Place it inside the existing ThemeProvider (or alongside it). It must be within a client component boundary since it uses hooks.

- [ ] **Step 3: Create the ProjectSelector component**

  Create `frontend/src/components/projects/ProjectSelector.tsx`:

  ```typescript
  'use client'

  import { useProject } from '@/components/providers/ProjectProvider'
  import { useTranslations } from 'next-intl'
  import { useRouter } from 'next/navigation'
  ```

  Implementation:
  - Use shadcn `DropdownMenu` or `Select` (or a custom Popover + Command for searchable dropdown)
  - Display trigger: current project name (or "All Projects" / "Select project")
  - Dropdown content:
    - "All Projects" option at top (sets selectedProject to null)
    - Divider
    - List of user's projects (from `useProject().projects`)
    - Each item shows project name + slug
    - Selected item has a checkmark
    - Divider
    - "+ New Project" option at bottom (opens create dialog or navigates to projects page)
  - Use `Plus` and `FolderOpen` icons from lucide-react
  - This component will be placed in the sidebar (when the sidebar layout is implemented per Plan 3)

  For now, create the component standalone. It will be integrated into the sidebar when that layout is built. If a sidebar layout already exists, integrate it there.

- [ ] **Step 4: Verify**

  - ProjectProvider loads projects on mount
  - Selected project persists across page reloads (localStorage)
  - ProjectSelector dropdown shows all projects
  - Selecting a project updates context
  - "All Projects" option clears selection
  - "New Project" option works (opens dialog or navigates)

---

## Task 12: Verification and Integration Testing

### Steps

- [ ] **Step 1: Backend endpoint verification**

  Test all endpoints manually or with a script:

  ```bash
  # Assumes a valid JWT token in $TOKEN variable

  # 1. Create project
  curl -s -X POST http://localhost:3001/api/v1/projects \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Project","description":"A test"}' | jq .

  # 2. List projects
  curl -s http://localhost:3001/api/v1/projects \
    -H "Authorization: Bearer $TOKEN" | jq .

  # 3. Get project by ID
  curl -s http://localhost:3001/api/v1/projects/$PROJECT_ID \
    -H "Authorization: Bearer $TOKEN" | jq .

  # 4. Update project
  curl -s -X PATCH http://localhost:3001/api/v1/projects/$PROJECT_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"description":"Updated description"}' | jq .

  # 5. List members
  curl -s http://localhost:3001/api/v1/projects/$PROJECT_ID/members \
    -H "Authorization: Bearer $TOKEN" | jq .

  # 6. Add member
  curl -s -X POST http://localhost:3001/api/v1/projects/$PROJECT_ID/members \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"userId":"<user-uuid>","roleId":"<role-uuid>"}' | jq .

  # 7. Update member role
  curl -s -X PATCH http://localhost:3001/api/v1/projects/$PROJECT_ID/members/$USER_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"roleId":"<new-role-uuid>"}' | jq .

  # 8. Remove member
  curl -s -X DELETE http://localhost:3001/api/v1/projects/$PROJECT_ID/members/$USER_ID \
    -H "Authorization: Bearer $TOKEN"

  # 9. Archive project
  curl -s -X DELETE http://localhost:3001/api/v1/projects/$PROJECT_ID \
    -H "Authorization: Bearer $TOKEN" | jq .

  # 10. List with archived filter
  curl -s "http://localhost:3001/api/v1/projects?archived=true" \
    -H "Authorization: Bearer $TOKEN" | jq .
  ```

  Verify for each:
  - Correct HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409)
  - Response body matches expected schema
  - Permission checks work (test with non-admin user)
  - Audit log entries created (check `audit_logs` table)

- [ ] **Step 2: Permission enforcement verification**

  - Non-admin user cannot create projects (403) unless they have `project:create` permission
  - Non-member cannot view project (403)
  - Member with viewer role cannot update project (403)
  - Member with lead or admin role CAN update project (200)
  - Only admin can archive (403 for others)
  - Cannot remove last admin from project (400)

- [ ] **Step 3: Frontend page verification**

  - Navigate to `/en-US/projects` -- page loads, shows projects or empty state
  - Navigate to `/pt-BR/projects` -- all strings are in Portuguese
  - Create a project via the dialog -- it appears in the list
  - Click a project -- navigates to detail page
  - Detail page tabs work: Overview, Members, Settings
  - Edit a project via the dialog on the detail page
  - Add/remove members on the Members tab
  - Archive a project from Settings tab
  - Project selector in sidebar shows current project, switching works

- [ ] **Step 4: Responsive design verification**

  - Projects list page: table collapses to card view or horizontal scroll on mobile
  - Project detail page: tabs stack vertically on mobile
  - Dialogs: full-width on mobile
  - Project selector: works on mobile sidebar

- [ ] **Step 5: Dark mode verification**

  - All project pages render correctly in dark mode
  - Badges, buttons, tables have proper dark variants
  - No hard-coded colors -- all use Tailwind CSS theme tokens

- [ ] **Step 6: Slug generation edge cases**

  - Name with special characters: "My Project @#$!" -> slug: "my-project"
  - Name with multiple spaces: "My   Project" -> slug: "my-project"
  - Duplicate slug: creating two projects with the same name -> second gets "my-project-1"
  - Unicode characters: "Projeto Teste" -> slug: "projeto-teste"
  - Custom slug provided: accepted if valid, rejected if invalid format

---

## Summary of Key Patterns

**Backend patterns (match existing code):**
- Routes use Fastify plugin pattern: `export async function xRoutes(app: FastifyInstance)`
- Permission checks use `preHandler: [permissionGuard('resource', 'action')]`
- Schemas use inline JSON Schema objects in the `schema` property (not Zod)
- Services import `prisma` directly for simple lookups (following AuthService pattern)
- Logger follows `logger.info(message, { action: 'entity.verb', ... })` pattern
- Audit logging is automatic via the global `auditLog` plugin for POST/PATCH/DELETE on matching URLs

**Frontend patterns:**
- Client components use `'use client'` directive
- i18n: `useTranslations('namespace')` from next-intl
- Routing: Next.js App Router with `[locale]` segment
- UI: shadcn/ui components from `@/components/ui/`
- API calls: typed fetch wrapper with auth token from localStorage

**Error handling:**
- Backend services throw errors with `statusCode` property
- Routes catch these and map to HTTP responses
- Frontend API client throws `ApiError` with `status` property
- UI shows errors via toast or inline messages

**Permissions model:**
- System roles: admin, lead, tester, viewer (from RBAC seed data)
- Project-level roles: stored in `project_members.role_id`
- `permissionGuard` checks system-level permissions (from `role_permissions` table)
- Project-level checks done in ProjectService (is member + has required project role)
