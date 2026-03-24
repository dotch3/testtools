# Plan 5 — Projects (Backend CRUD + Frontend Pages + Members + Project Selector)

**Goal:** Implement Projects feature — backend CRUD with member management, frontend list/detail/create/edit pages, member management UI, and project selector in sidebar.

---

## File Map

```
backend/src/
  domain/entities/Project.ts
  services/ProjectService.ts
  infrastructure/repositories/ProjectRepository.ts
  interfaces/http/routes/projects.ts, projectMembers.ts

frontend/src/
  app/[locale]/(app)/
    projects/page.tsx
    projects/[id]/page.tsx
  components/projects/
    ProjectsTable.tsx, ProjectCard.tsx, CreateProjectDialog.tsx, ProjectSelector.tsx
```

---

## Task 1: Project Repository

**Files:**
- Create: `backend/src/infrastructure/repositories/ProjectRepository.ts`

- [ ] **CRUD with Prisma**

  ```typescript
  async create(data): Promise<Project>
  async findById(id): Promise<Project | null>
  async findBySlug(slug): Promise<Project | null>
  async findMany(options): Promise<Project[]>
  async update(id, data): Promise<Project>
  async delete(id): Promise<void>
  ```

---

## Task 2: Project Service

**Files:**
- Create: `backend/src/services/ProjectService.ts`

- [ ] **Business logic**

  - Create project (generate slug from name)
  - List projects (filter by member)
  - Add/remove members
  - Update member role

---

## Task 3: Project API Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/projects.ts`
- Create: `backend/src/interfaces/http/routes/projectMembers.ts`

- [ ] **Endpoints**

  - `GET /projects` — list user's projects
  - `POST /projects` — create project
  - `GET /projects/:id` — get project detail
  - `PATCH /projects/:id` — update project
  - `DELETE /projects/:id` — delete project
  - `GET /projects/:id/members` — list members
  - `POST /projects/:id/members` — add member
  - `PATCH /projects/:id/members/:userId` — update member role
  - `DELETE /projects/:id/members/:userId` — remove member

---

## Task 4: Frontend Project List

**Files:**
- Create: `frontend/src/app/[locale]/(app)/projects/page.tsx`
- Create: `frontend/src/components/projects/ProjectsTable.tsx`

- [ ] **Project list with table**

  Columns: Name, Key, Status, Members, Test Plans, Created. Row actions: View, Edit, Delete.

---

## Task 5: Project Selector

**Files:**
- Create: `frontend/src/components/projects/ProjectSelector.tsx`

- [ ] **Dropdown in sidebar**

  Shows user's projects. Selected project stored in localStorage/context.

---

## Task 6: Project Detail Page

**Files:**
- Create: `frontend/src/app/[locale]/(app)/projects/[id]/page.tsx`

- [ ] **Project detail with tabs**

  Tabs: Overview, Test Plans, Members, Settings.

---

## Verification

- [ ] Can create, edit, delete projects
- [ ] Can add/remove project members
- [ ] Project selector shows user's projects
- [ ] Frontend displays project list and detail pages
