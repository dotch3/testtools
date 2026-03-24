# Plan 8 -- Admin: Enums, Roles/Permissions, Users, Custom Fields, System Settings UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete admin settings backend (services + routes) and frontend (pages under /[locale]/admin/) for managing enums, roles/permissions, users, custom fields, system settings, and audit logs. All admin endpoints require the `manage_settings` permission (or resource-specific permissions). The frontend uses shadcn/ui components, supports i18n (en-US, pt-BR), and works in both dark and light themes.

**Architecture:** Clean architecture -- services encapsulate business logic, routes handle HTTP concerns (validation, serialization). Frontend pages live under `src/app/[locale]/admin/`. All write operations are captured by the existing audit log plugin.

**Tech Stack:** Fastify 5, Prisma 6, Zod, TypeScript, Next.js 16.2, shadcn/ui, Tailwind CSS 4, next-intl, Lucide React

**IMPORTANT:** Next.js 16.2 has breaking changes. Before writing any frontend code, read the relevant guide in `frontend/node_modules/next/dist/docs/` to understand current API conventions (layouts, route handlers, metadata, etc.).

---

## File Map

```
backend/
  src/
    services/
      EnumService.ts             -- Enum CRUD + reorder logic
      RoleService.ts             -- Role CRUD + permission matrix
      CustomFieldService.ts      -- Field definition CRUD + value storage
      AdminUserService.ts        -- User management (create, update, lock, deactivate)
      SystemSettingsService.ts   -- Key-value system settings
      AuditLogService.ts         -- Query audit logs with filters
    interfaces/
      http/
        routes/
          settings/
            enums.ts             -- /settings/enums routes
            roles.ts             -- /settings/roles routes
            customFields.ts      -- /settings/custom-fields routes
            system.ts            -- /settings/system routes
          admin/
            users.ts             -- (already exists, will be refactored to use AdminUserService)
          auditLogs.ts           -- /audit-logs route
    app.ts                       -- Register new routes

  tests/
    services/
      EnumService.test.ts
      RoleService.test.ts
      CustomFieldService.test.ts
      AdminUserService.test.ts
      SystemSettingsService.test.ts
      AuditLogService.test.ts
    routes/
      settings/
        enums.test.ts
        roles.test.ts
        customFields.test.ts
        system.test.ts
      auditLogs.test.ts

frontend/
  src/
    app/
      [locale]/
        admin/
          layout.tsx             -- Admin layout with sub-navigation
          page.tsx               -- Redirect to /admin/users
          enums/
            page.tsx             -- Enum management page
          roles/
            page.tsx             -- Roles + permission matrix page
          users/
            page.tsx             -- Users management page
          custom-fields/
            page.tsx             -- Custom fields management page
          settings/
            page.tsx             -- System settings page
          audit-logs/
            page.tsx             -- Audit logs page
    components/
      admin/
        AdminSidebar.tsx         -- Admin sub-navigation sidebar
        EnumTypeList.tsx         -- Left panel: enum type list
        EnumValueEditor.tsx      -- Right panel: value editor with color/icon
        RoleList.tsx             -- Left panel: roles list
        PermissionMatrix.tsx     -- Right panel: permission matrix grid
        RoleFormDialog.tsx       -- Create/edit role dialog
        UserTable.tsx            -- Users data table
        UserFormDialog.tsx       -- Create/edit user dialog
        CustomFieldList.tsx      -- Field definitions list per entity tab
        CustomFieldFormDialog.tsx -- Create/edit custom field dialog
        AuditLogTable.tsx        -- Audit logs table with expandable rows
        ColorPicker.tsx          -- Hex color picker component
        IconSelector.tsx         -- Lucide icon selector component
      ui/                        -- shadcn/ui components (add as needed)
    lib/
      api/
        enums.ts                 -- API client functions for enum endpoints
        roles.ts                 -- API client functions for role endpoints
        customFields.ts          -- API client functions for custom field endpoints
        adminUsers.ts            -- API client functions for admin user endpoints
        systemSettings.ts        -- API client functions for system settings endpoints
        auditLogs.ts             -- API client functions for audit log endpoints
    messages/
      en-US.json                 -- Add admin.* keys
      pt-BR.json                 -- Add admin.* keys
```

---

## Task 1: Enum Service + Routes (Backend)

**Goal:** Create `EnumService` with business logic for managing enum types and values, plus Fastify routes with Zod validation and Swagger docs.

**Files:**
- Create: `backend/src/services/EnumService.ts`
- Create: `backend/src/interfaces/http/routes/settings/enums.ts`
- Create: `backend/tests/services/EnumService.test.ts`
- Create: `backend/tests/routes/settings/enums.test.ts`
- Modify: `backend/src/app.ts` (register routes)

**Key patterns:**
- Services receive `prisma` as implicit dependency (import singleton from `infrastructure/database/prisma.ts`)
- Use `permissionGuard('enum', 'manage_settings')` as preHandler on all routes
- Enum values with `isSystem: true` cannot be deleted or have their `systemKey` changed
- Reorder updates all `orderIndex` values in a single transaction

### Steps

- [ ] **Step 1: Create `EnumService.ts`**

  Implement the following methods in `backend/src/services/EnumService.ts`:

  ```typescript
  export class EnumService {
    // Returns all enum types with value counts
    async listTypes(): Promise<EnumTypeWithCount[]>

    // Returns all values for a given enum type name, ordered by orderIndex
    async listValues(typeName: string): Promise<EnumValue[]>

    // Creates a new enum value for the given type
    // Validates: type exists, value is unique within type
    // Sets orderIndex to max+1 automatically
    async createValue(typeName: string, data: CreateEnumValueInput): Promise<EnumValue>

    // Updates an existing enum value
    // Rejects changes to systemKey on is_system values
    // Allows changing: label, value, color, icon, isDefault
    async updateValue(valueId: string, data: UpdateEnumValueInput): Promise<EnumValue>

    // Deletes an enum value
    // Rejects if isSystem is true (throw 400 with descriptive message)
    // Rejects if value is referenced by any entity (FK check)
    async deleteValue(valueId: string): Promise<void>

    // Reorders values within a type
    // Receives array of { id, orderIndex } and updates all in a transaction
    async reorderValues(typeName: string, order: Array<{ id: string; orderIndex: number }>): Promise<void>
  }
  ```

  - Import `prisma` from `../../infrastructure/database/prisma.js`
  - For `deleteValue`, check references: query related models (Bug, TestCase, TestExecution, TestPlan, Integration, CustomFieldDef) to see if the value is in use. If referenced, throw an error listing which entities reference it
  - For `reorderValues`, use `prisma.$transaction` with an array of update operations
  - For `createValue`, when `isDefault` is set to true, unset `isDefault` on all other values of the same type first (within a transaction)

- [ ] **Step 2: Write unit tests for `EnumService`**

  Create `backend/tests/services/EnumService.test.ts`:

  - Mock `prisma` (same pattern as `AuthService.test.ts` -- use `vi.mock`)
  - Test `listTypes` returns types with `_count.values`
  - Test `listValues` returns values ordered by `orderIndex`
  - Test `createValue` assigns next `orderIndex`
  - Test `createValue` with `isDefault: true` unsets other defaults
  - Test `updateValue` rejects `systemKey` change on system values
  - Test `deleteValue` rejects on `isSystem: true`
  - Test `deleteValue` rejects when value is referenced
  - Test `reorderValues` updates all indices in transaction

- [ ] **Step 3: Run tests -- verify they fail**

  ```bash
  cd backend && npx vitest run tests/services/EnumService.test.ts
  ```

- [ ] **Step 4: Implement `EnumService` -- make tests pass**

- [ ] **Step 5: Create enum routes**

  Create `backend/src/interfaces/http/routes/settings/enums.ts`:

  ```typescript
  export async function enumRoutes(app: FastifyInstance) {
    const enumService = new EnumService()

    // GET /settings/enums -- list all enum types
    // Response: Array<{ id, name, entityType, isSystem, _count: { values } }>
    app.get('/settings/enums', {
      preHandler: [permissionGuard('enum', 'read')],
      schema: { tags: ['Settings - Enums'], summary: 'List all enum types' }
    }, ...)

    // GET /settings/enums/:type/values -- list values for a type
    // Params: type (enum type name, e.g., "bug_priority")
    // Response: Array<EnumValue> ordered by orderIndex
    app.get('/settings/enums/:type/values', {
      preHandler: [permissionGuard('enum', 'read')],
      schema: {
        tags: ['Settings - Enums'],
        summary: 'List values for an enum type',
        params: { type: 'object', required: ['type'], properties: { type: { type: 'string' } } }
      }
    }, ...)

    // POST /settings/enums/:type/values -- create a new value
    // Body: { value, label, color?, icon?, isDefault? }
    // Validation: value required string, label required string, color optional hex pattern
    app.post('/settings/enums/:type/values', {
      preHandler: [permissionGuard('enum', 'create')],
      schema: {
        tags: ['Settings - Enums'],
        summary: 'Create enum value',
        body: {
          type: 'object',
          required: ['value', 'label'],
          properties: {
            value: { type: 'string', minLength: 1 },
            label: { type: 'string', minLength: 1 },
            color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
            icon: { type: 'string' },
            isDefault: { type: 'boolean' }
          }
        }
      }
    }, ...)

    // PATCH /settings/enums/values/:id -- update a value
    // Body: { value?, label?, color?, icon?, isDefault? }
    app.patch('/settings/enums/values/:id', {
      preHandler: [permissionGuard('enum', 'update')],
      schema: { tags: ['Settings - Enums'], summary: 'Update enum value' }
    }, ...)

    // DELETE /settings/enums/values/:id -- delete a value
    app.delete('/settings/enums/values/:id', {
      preHandler: [permissionGuard('enum', 'delete')],
      schema: { tags: ['Settings - Enums'], summary: 'Delete enum value' }
    }, ...)

    // PATCH /settings/enums/:type/reorder -- reorder values
    // Body: { order: Array<{ id: string, orderIndex: number }> }
    app.patch('/settings/enums/:type/reorder', {
      preHandler: [permissionGuard('enum', 'update')],
      schema: { tags: ['Settings - Enums'], summary: 'Reorder enum values' }
    }, ...)
  }
  ```

- [ ] **Step 6: Register routes in `app.ts`**

  Add to `backend/src/app.ts`:
  ```typescript
  import { enumRoutes } from './interfaces/http/routes/settings/enums.js'
  // ...
  await app.register(enumRoutes, { prefix: '/api/v1' })
  ```

- [ ] **Step 7: Write route integration tests**

  Create `backend/tests/routes/settings/enums.test.ts`:
  - Test GET /settings/enums returns list
  - Test GET /settings/enums/:type/values returns ordered values
  - Test POST creates value, returns 201
  - Test POST rejects invalid color format (400)
  - Test PATCH updates value
  - Test DELETE on system value returns 400
  - Test DELETE on non-system value returns 200
  - Test reorder updates orderIndex values
  - Test all routes return 403 without proper permissions

- [ ] **Step 8: Verify all tests pass**

  ```bash
  cd backend && npx vitest run tests/services/EnumService.test.ts tests/routes/settings/enums.test.ts
  ```

### Verification
- GET /settings/enums returns all 9 seeded enum types
- GET /settings/enums/bug_priority/values returns 4 values in order
- POST creates new value with next orderIndex
- DELETE on system value returns 400 error
- Reorder endpoint updates all orderIndex values atomically
- All routes require authentication + enum permissions

---

## Task 2: Role Service + Routes (Backend)

**Goal:** Create `RoleService` for role CRUD and permission matrix management, plus routes.

**Files:**
- Create: `backend/src/services/RoleService.ts`
- Create: `backend/src/interfaces/http/routes/settings/roles.ts`
- Create: `backend/tests/services/RoleService.test.ts`
- Create: `backend/tests/routes/settings/roles.test.ts`
- Modify: `backend/src/app.ts` (register routes)

**Key patterns:**
- System roles (admin, lead, tester, viewer) cannot be deleted but their permissions CAN be edited
- Permission matrix save is a full replace: delete all existing role_permissions, then insert the new set
- Return all available permissions so the frontend can render the full matrix
- Invalidate the permission cache in `permissionGuard.ts` when permissions change

### Steps

- [ ] **Step 1: Create `RoleService.ts`**

  Implement in `backend/src/services/RoleService.ts`:

  ```typescript
  export class RoleService {
    // Returns all roles with permission count and user count
    async listRoles(): Promise<RoleWithCounts[]>

    // Returns all available permissions, grouped by resource
    async listPermissions(): Promise<PermissionsByResource>
    // Returns: { project: [{ id, action, label }], test_case: [...], ... }

    // Returns permissions assigned to a specific role
    async getRolePermissions(roleId: string): Promise<string[]>
    // Returns array of permission IDs

    // Creates a new custom role
    async createRole(data: { name: string; label: string; color?: string }): Promise<Role>

    // Updates role name/label/color
    // Cannot change name of system roles
    async updateRole(roleId: string, data: UpdateRoleInput): Promise<Role>

    // Deletes a custom role
    // Rejects if isSystem is true
    // Rejects if any users are assigned to this role (must reassign first)
    async deleteRole(roleId: string): Promise<void>

    // Full permission matrix replace for a role
    // Receives array of permission IDs
    // Deletes all existing role_permissions, inserts new ones in a transaction
    // Invalidates permission cache
    async setPermissions(roleId: string, permissionIds: string[]): Promise<void>
  }
  ```

  - For `setPermissions`, use `prisma.$transaction`:
    1. `prisma.rolePermission.deleteMany({ where: { roleId } })`
    2. `prisma.rolePermission.createMany({ data: permissionIds.map(pid => ({ roleId, permissionId: pid })) })`
  - After `setPermissions`, clear the permission cache: import and call a cache-clear function from `permissionGuard.ts`

- [ ] **Step 2: Add cache invalidation export to `permissionGuard.ts`**

  Add to `backend/src/interfaces/http/plugins/permissionGuard.ts`:
  ```typescript
  export function invalidatePermissionCache(roleId?: string) {
    if (roleId) {
      permissionCache.delete(roleId)
    } else {
      permissionCache.clear()
    }
  }
  ```

- [ ] **Step 3: Write unit tests for `RoleService`**

  Create `backend/tests/services/RoleService.test.ts`:
  - Test `listRoles` returns roles with counts
  - Test `listPermissions` groups permissions by resource
  - Test `getRolePermissions` returns permission IDs for a role
  - Test `createRole` creates with unique name
  - Test `createRole` rejects duplicate name
  - Test `updateRole` rejects name change on system role
  - Test `deleteRole` rejects on system role
  - Test `deleteRole` rejects when users assigned
  - Test `setPermissions` replaces all permissions in transaction

- [ ] **Step 4: Run tests -- verify they fail, then implement to make them pass**

- [ ] **Step 5: Create role routes**

  Create `backend/src/interfaces/http/routes/settings/roles.ts`:

  ```typescript
  export async function roleRoutes(app: FastifyInstance) {
    const roleService = new RoleService()

    // GET /settings/roles -- list all roles
    app.get('/settings/roles', { preHandler: [permissionGuard('role', 'read')], ... })

    // GET /settings/roles/permissions -- list all available permissions grouped by resource
    app.get('/settings/roles/permissions', { preHandler: [permissionGuard('role', 'read')], ... })

    // POST /settings/roles -- create role
    // Body: { name: string, label: string, color?: string }
    app.post('/settings/roles', { preHandler: [permissionGuard('role', 'create')], ... })

    // PATCH /settings/roles/:id -- update role
    app.patch('/settings/roles/:id', { preHandler: [permissionGuard('role', 'update')], ... })

    // DELETE /settings/roles/:id -- delete role
    app.delete('/settings/roles/:id', { preHandler: [permissionGuard('role', 'delete')], ... })

    // GET /settings/roles/:id/permissions -- get role's current permissions
    app.get('/settings/roles/:id/permissions', { preHandler: [permissionGuard('role', 'read')], ... })

    // PUT /settings/roles/:id/permissions -- full matrix save
    // Body: { permissionIds: string[] }
    app.put('/settings/roles/:id/permissions', { preHandler: [permissionGuard('role', 'update')], ... })
  }
  ```

- [ ] **Step 6: Register routes in `app.ts`**

  ```typescript
  import { roleRoutes } from './interfaces/http/routes/settings/roles.js'
  await app.register(roleRoutes, { prefix: '/api/v1' })
  ```

- [ ] **Step 7: Write route tests and verify**

  - Test all CRUD operations
  - Test PUT permissions replaces matrix
  - Test system role deletion returns 400
  - Test 403 without permissions

### Verification
- GET /settings/roles returns 4 system roles + any custom ones
- GET /settings/roles/permissions returns all permissions grouped by resource
- PUT /settings/roles/:id/permissions saves full matrix and invalidates cache
- System roles cannot be deleted (400)
- Custom role with assigned users cannot be deleted (400)

---

## Task 3: Custom Field Service + Routes (Backend)

**Goal:** Create `CustomFieldService` for defining custom fields per entity type and storing/retrieving their values.

**Files:**
- Create: `backend/src/services/CustomFieldService.ts`
- Create: `backend/src/interfaces/http/routes/settings/customFields.ts`
- Create: `backend/tests/services/CustomFieldService.test.ts`
- Modify: `backend/src/app.ts`

**Key patterns:**
- Field types come from the `field_type` enum in the database
- Values stored polymorphically: `text` -> `value_text`, `number` -> `value_number`, `date` -> `value_date`, `select/multi_select/user/boolean` -> `value_json`
- `enrichEntity` attaches custom field values to any entity (called by other services when fetching entities)
- `projectId: null` means global (applies to all projects)

### Steps

- [ ] **Step 1: Create `CustomFieldService.ts`**

  Implement in `backend/src/services/CustomFieldService.ts`:

  ```typescript
  export class CustomFieldService {
    // List field definitions for a given entity type
    // Optionally filter by projectId (null = global only, string = global + project)
    async listDefinitions(entityType: string, projectId?: string | null): Promise<CustomFieldDef[]>

    // Create a new field definition
    // Validates: fieldTypeId references a valid field_type enum value
    // Sets orderIndex to max+1 for that entity type
    async defineField(data: DefineFieldInput, createdById: string): Promise<CustomFieldDef>

    // Update a field definition
    // Can change: label, required, defaultValue, options, orderIndex
    // Cannot change: entityType, name (after creation), fieldTypeId
    async updateField(fieldId: string, data: UpdateFieldInput): Promise<CustomFieldDef>

    // Delete a field definition
    // Also deletes all associated CustomFieldValue records (cascade in Prisma)
    async deleteField(fieldId: string): Promise<void>

    // Set values for an entity's custom fields
    // Receives: entityId, entityType, fields: Array<{ fieldDefinitionId, value }>
    // Maps value to correct column based on field type
    // Uses upsert: create if not exists, update if exists
    async setValues(entityId: string, entityType: string, fields: FieldValueInput[]): Promise<void>

    // Enrich an entity with its custom field values
    // Returns the custom fields with their definitions and current values
    async enrichEntity(entityId: string, entityType: string): Promise<EnrichedField[]>

    // Reorder field definitions within an entity type
    async reorderFields(entityType: string, order: Array<{ id: string; orderIndex: number }>): Promise<void>
  }
  ```

  Value mapping logic:
  ```typescript
  function mapValueToColumn(fieldType: string, value: any) {
    switch (fieldType) {
      case 'text':
      case 'url':
        return { valueText: String(value) }
      case 'number':
        return { valueNumber: Number(value) }
      case 'date':
        return { valueDate: new Date(value) }
      case 'select':
      case 'multi_select':
      case 'user':
      case 'boolean':
        return { valueJson: value }
      default:
        return { valueText: String(value) }
    }
  }
  ```

- [ ] **Step 2: Write unit tests for `CustomFieldService`**

  - Test `listDefinitions` filters by entityType and projectId
  - Test `defineField` validates fieldTypeId exists
  - Test `defineField` auto-assigns orderIndex
  - Test `updateField` rejects entityType change
  - Test `deleteField` cascades to values
  - Test `setValues` maps text -> valueText, number -> valueNumber, etc.
  - Test `setValues` upserts (update existing, create new)
  - Test `enrichEntity` returns definitions + values merged

- [ ] **Step 3: Run tests, implement, verify pass**

- [ ] **Step 4: Create custom field routes**

  Create `backend/src/interfaces/http/routes/settings/customFields.ts`:

  ```typescript
  export async function customFieldRoutes(app: FastifyInstance) {
    const service = new CustomFieldService()

    // GET /settings/custom-fields/:entityType
    // Query: projectId? (optional)
    // Response: field definitions with their field type details
    app.get('/settings/custom-fields/:entityType', {
      preHandler: [permissionGuard('custom_field', 'read')],
      schema: {
        tags: ['Settings - Custom Fields'],
        params: { type: 'object', properties: { entityType: { type: 'string', enum: ['bug', 'test_case', 'test_execution', 'test_plan'] } } }
      }
    }, ...)

    // POST /settings/custom-fields
    // Body: { entityType, name, label, fieldTypeId, projectId?, options?, required?, defaultValue? }
    app.post('/settings/custom-fields', {
      preHandler: [permissionGuard('custom_field', 'create')],
      schema: {
        tags: ['Settings - Custom Fields'],
        body: {
          type: 'object',
          required: ['entityType', 'name', 'label', 'fieldTypeId'],
          properties: {
            entityType: { type: 'string', enum: ['bug', 'test_case', 'test_execution', 'test_plan'] },
            name: { type: 'string', minLength: 1, pattern: '^[a-z][a-z0-9_]*$' },
            label: { type: 'string', minLength: 1 },
            fieldTypeId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            options: { type: 'array', items: { type: 'string' } },
            required: { type: 'boolean' },
            defaultValue: { type: 'string' }
          }
        }
      }
    }, ...)

    // PATCH /settings/custom-fields/:id
    app.patch('/settings/custom-fields/:id', {
      preHandler: [permissionGuard('custom_field', 'update')], ...
    }, ...)

    // DELETE /settings/custom-fields/:id
    app.delete('/settings/custom-fields/:id', {
      preHandler: [permissionGuard('custom_field', 'delete')], ...
    }, ...)

    // PATCH /settings/custom-fields/:entityType/reorder
    // Body: { order: Array<{ id, orderIndex }> }
    app.patch('/settings/custom-fields/:entityType/reorder', {
      preHandler: [permissionGuard('custom_field', 'update')], ...
    }, ...)
  }
  ```

- [ ] **Step 5: Register in `app.ts` and write route tests**

- [ ] **Step 6: Verify all tests pass**

### Verification
- GET /settings/custom-fields/bug returns definitions for bugs
- POST creates field with correct type linkage
- Field name must match `^[a-z][a-z0-9_]*$`
- Options only relevant for select/multi_select types
- Values stored in correct polymorphic column
- Delete cascades to CustomFieldValue records

---

## Task 4: Admin User Service + Routes (Backend)

**Goal:** Refactor existing admin user routes to use a dedicated `AdminUserService`, add pagination, status filtering, and deactivation logic.

**Files:**
- Create: `backend/src/services/AdminUserService.ts`
- Modify: `backend/src/interfaces/http/routes/admin/users.ts` (refactor to use service)
- Create: `backend/tests/services/AdminUserService.test.ts`

**Key patterns:**
- The existing `admin/users.ts` routes already work but have inline Prisma calls. Refactor to use a service layer.
- Add pagination (offset-based: `page` + `perPage` query params)
- Add status filter: `active` (no lockedUntil), `locked` (lockedUntil in future), `deactivated` (lockedUntil far in future)
- When creating a user with AUTH_MODE=local or AUTH_MODE=both, require temporary password and set `forcePasswordChange: true`

### Steps

- [ ] **Step 1: Create `AdminUserService.ts`**

  Implement in `backend/src/services/AdminUserService.ts`:

  ```typescript
  export class AdminUserService {
    // List users with pagination, filters, and search
    async listUsers(params: {
      page?: number        // default 1
      perPage?: number     // default 20
      roleId?: string
      status?: 'active' | 'locked' | 'deactivated'
      search?: string      // search name + email
    }): Promise<{ users: UserListItem[]; total: number; page: number; perPage: number }>

    // Get single user with full details
    async getUser(userId: string): Promise<UserDetail>

    // Create user
    // If AUTH_MODE is 'local' or 'both': password is required, hash it, set forcePasswordChange=true
    // If AUTH_MODE is 'oauth': password not needed
    async createUser(data: CreateUserInput): Promise<UserDetail>

    // Update user (role, forcePasswordChange, name)
    async updateUser(userId: string, data: UpdateUserInput): Promise<UserDetail>

    // Deactivate user (set lockedUntil to far future, not actual delete)
    async deactivateUser(userId: string): Promise<void>

    // Unlock user (clear lockedUntil and failedLoginCount)
    async unlockUser(userId: string): Promise<void>
  }
  ```

  Status filtering logic:
  ```typescript
  function statusFilter(status: string) {
    const now = new Date()
    switch (status) {
      case 'active':
        return { OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }
      case 'locked':
        return { lockedUntil: { gt: now }, lockedUntil: { lt: new Date(now.getTime() + 364 * 24 * 60 * 60 * 1000) } }
      case 'deactivated':
        return { lockedUntil: { gte: new Date(now.getTime() + 364 * 24 * 60 * 60 * 1000) } }
    }
  }
  ```

- [ ] **Step 2: Write unit tests for `AdminUserService`**

  - Test `listUsers` with pagination (returns correct page, total count)
  - Test `listUsers` with role filter
  - Test `listUsers` with status filter (active, locked, deactivated)
  - Test `listUsers` with search (name or email contains)
  - Test `createUser` hashes password and sets forcePasswordChange
  - Test `createUser` validates email uniqueness
  - Test `deactivateUser` sets lockedUntil far in future
  - Test `unlockUser` clears lockedUntil and failedLoginCount

- [ ] **Step 3: Refactor existing `admin/users.ts` routes to use `AdminUserService`**

  Update `backend/src/interfaces/http/routes/admin/users.ts`:
  - Replace inline Prisma calls with `AdminUserService` method calls
  - Add `page`, `perPage`, `status` query parameters to GET /admin/users
  - Return paginated response: `{ data: [...], meta: { total, page, perPage, totalPages } }`
  - Keep existing preHandler permissions unchanged

- [ ] **Step 4: Run existing and new tests, verify all pass**

### Verification
- GET /admin/users?page=1&perPage=10 returns paginated results
- GET /admin/users?status=locked returns only locked users
- GET /admin/users?search=admin returns matching users
- POST /admin/users with local auth creates user with hashed password + forcePasswordChange
- DELETE /admin/users/:id sets far-future lockedUntil (deactivation, not actual delete)
- POST /admin/users/:id/unlock clears lock

---

## Task 5: System Settings Service + Routes (Backend)

**Goal:** Implement system-wide key-value settings stored in a `SystemSetting` model. Provides admin-only CRUD and a public endpoint for locale/theme (used by login page before auth).

**Files:**
- Modify: `backend/prisma/schema.prisma` (add SystemSetting model if not present)
- Create: `backend/src/services/SystemSettingsService.ts`
- Create: `backend/src/interfaces/http/routes/settings/system.ts`
- Create: `backend/tests/services/SystemSettingsService.test.ts`
- Modify: `backend/src/app.ts`

**Key patterns:**
- SystemSetting is a simple key-value store: `key` (PK string), `value` (text), `updatedBy` (FK user), `updatedAt`
- Default settings seeded: `default_locale` = "pt-BR", `default_theme` = "dark"
- Public endpoint returns only safe keys (locale, theme) -- no auth required

### Steps

- [ ] **Step 1: Add SystemSetting model to Prisma schema (if not present)**

  Add to `backend/prisma/schema.prisma`:
  ```prisma
  model SystemSetting {
    key       String   @id
    value     String
    updatedBy String?
    user      User?    @relation(fields: [updatedBy], references: [id], onDelete: SetNull)
    updatedAt DateTime @updatedAt

    @@map("system_settings")
  }
  ```

  Also add to the `User` model:
  ```prisma
  systemSettings SystemSetting[]
  ```

  Run: `npx prisma migrate dev --name add-system-settings`

- [ ] **Step 2: Seed default settings**

  Add to `backend/prisma/seed.ts`:
  ```typescript
  const defaultSettings = [
    { key: 'default_locale', value: 'pt-BR' },
    { key: 'default_theme', value: 'dark' },
  ]
  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      create: { key: setting.key, value: setting.value },
      update: {},
    })
  }
  ```

- [ ] **Step 3: Create `SystemSettingsService.ts`**

  ```typescript
  export class SystemSettingsService {
    // Get all settings (admin only)
    async getAll(): Promise<SystemSettingWithUser[]>

    // Update multiple settings at once
    // Uses transaction to update all keys
    async updateMany(settings: Array<{ key: string; value: string }>, updatedBy: string): Promise<void>

    // Get only public settings (no auth)
    // Returns only: default_locale, default_theme
    async getPublic(): Promise<Record<string, string>>
  }
  ```

  Public keys whitelist:
  ```typescript
  const PUBLIC_KEYS = ['default_locale', 'default_theme']
  ```

- [ ] **Step 4: Write unit tests**

  - Test `getAll` returns all settings with user info
  - Test `updateMany` updates multiple settings in transaction
  - Test `updateMany` sets updatedBy
  - Test `getPublic` returns only whitelisted keys

- [ ] **Step 5: Create system settings routes**

  Create `backend/src/interfaces/http/routes/settings/system.ts`:

  ```typescript
  export async function systemSettingsRoutes(app: FastifyInstance) {
    const service = new SystemSettingsService()

    // GET /settings/system -- all settings (admin only)
    app.get('/settings/system', {
      preHandler: [permissionGuard('settings', 'manage_settings')],
      schema: { tags: ['Settings - System'], summary: 'Get all system settings' }
    }, ...)

    // PATCH /settings/system -- update settings (admin only)
    // Body: { settings: Array<{ key: string, value: string }> }
    app.patch('/settings/system', {
      preHandler: [permissionGuard('settings', 'manage_settings')],
      schema: {
        tags: ['Settings - System'],
        summary: 'Update system settings',
        body: {
          type: 'object',
          required: ['settings'],
          properties: {
            settings: {
              type: 'array',
              items: {
                type: 'object',
                required: ['key', 'value'],
                properties: { key: { type: 'string' }, value: { type: 'string' } }
              }
            }
          }
        }
      }
    }, ...)

    // GET /settings/system/public -- public settings (no auth)
    app.get('/settings/system/public', {
      schema: { tags: ['Settings - System'], summary: 'Get public system settings (no auth)' }
    }, async (_, reply) => {
      const settings = await service.getPublic()
      return reply.send(settings)
    })
  }
  ```

  Note: The public route must NOT have any auth preHandler.

- [ ] **Step 6: Register routes in `app.ts` and run tests**

### Verification
- GET /settings/system returns all settings with updater info (requires admin)
- PATCH /settings/system updates locale and theme
- GET /settings/system/public returns only locale + theme without authentication
- Settings persist across server restarts (stored in DB)

---

## Task 6: Audit Log Service + Route (Backend)

**Goal:** Create `AuditLogService` for querying audit logs with filters and pagination, plus the GET route.

**Files:**
- Create: `backend/src/services/AuditLogService.ts`
- Create: `backend/src/interfaces/http/routes/auditLogs.ts`
- Create: `backend/tests/services/AuditLogService.test.ts`
- Modify: `backend/src/app.ts`

**Key patterns:**
- Read-only service -- only queries, never writes (writing is handled by the existing `auditLog.ts` plugin)
- Offset-based pagination (cursor-based is overkill for admin-only logs)
- Filter by userId, entityType, action, dateRange

### Steps

- [ ] **Step 1: Create `AuditLogService.ts`**

  ```typescript
  export class AuditLogService {
    async query(params: {
      page?: number         // default 1
      perPage?: number      // default 50
      userId?: string
      entityType?: string
      action?: string
      dateFrom?: string     // ISO date
      dateTo?: string       // ISO date
    }): Promise<{ logs: AuditLogEntry[]; total: number; page: number; perPage: number }>
  }
  ```

  Build `where` clause dynamically:
  ```typescript
  const where: any = {}
  if (params.userId) where.userId = params.userId
  if (params.entityType) where.entityType = params.entityType
  if (params.action) where.action = { contains: params.action }
  if (params.dateFrom || params.dateTo) {
    where.createdAt = {}
    if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom)
    if (params.dateTo) where.createdAt.lte = new Date(params.dateTo)
  }
  ```

  Include user relation for display: `include: { user: { select: { id, name, email, avatarUrl } } }`
  Order by `createdAt` descending.

- [ ] **Step 2: Write unit tests**

  - Test query with no filters returns paginated results
  - Test query with userId filter
  - Test query with entityType filter
  - Test query with date range
  - Test pagination (correct offset/limit)

- [ ] **Step 3: Create audit log route**

  Create `backend/src/interfaces/http/routes/auditLogs.ts`:

  ```typescript
  export async function auditLogRoutes(app: FastifyInstance) {
    const service = new AuditLogService()

    // GET /audit-logs
    // Query: page?, perPage?, userId?, entityType?, action?, dateFrom?, dateTo?
    app.get('/audit-logs', {
      preHandler: [permissionGuard('settings', 'manage_settings')],
      schema: {
        tags: ['Audit Logs'],
        summary: 'Query audit logs',
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            perPage: { type: 'integer', minimum: 1, maximum: 100 },
            userId: { type: 'string', format: 'uuid' },
            entityType: { type: 'string' },
            action: { type: 'string' },
            dateFrom: { type: 'string', format: 'date' },
            dateTo: { type: 'string', format: 'date' }
          }
        }
      }
    }, async (request, reply) => {
      const result = await service.query(request.query)
      return reply.send(result)
    })
  }
  ```

- [ ] **Step 4: Register in `app.ts`, run tests, verify**

### Verification
- GET /audit-logs returns paginated results with user info
- Filters narrow results correctly
- Date range filter works with ISO dates
- Only users with manage_settings can access
- Response includes full payload JSON for each log entry

---

## Task 7: Frontend -- Admin Layout

**Goal:** Create the admin section layout with sub-navigation sidebar and permission-based visibility.

**Files:**
- Create: `frontend/src/app/[locale]/admin/layout.tsx`
- Create: `frontend/src/app/[locale]/admin/page.tsx`
- Create: `frontend/src/components/admin/AdminSidebar.tsx`
- Modify: `frontend/src/messages/en-US.json` (add admin keys)
- Modify: `frontend/src/messages/pt-BR.json` (add admin keys)

**IMPORTANT:** Before writing any Next.js code, read `frontend/node_modules/next/dist/docs/` for Next.js 16.2 API conventions. Layouts, metadata, and route conventions may differ from older versions.

**Key patterns:**
- Admin layout wraps all `/admin/*` pages with a sidebar on the left and content area on the right
- Sidebar has links: Users, Roles, Enums, Custom Fields, System Settings, Audit Logs
- Use Lucide React icons for each nav item (Users, Shield, List, Columns, Settings, FileText)
- Permission check: only show admin section to users with `manage_settings` permission
- Responsive: sidebar collapses to top bar on mobile

### Steps

- [ ] **Step 1: Read Next.js 16.2 docs**

  ```bash
  ls frontend/node_modules/next/dist/docs/
  ```
  Read all relevant files, especially about layouts, route groups, and metadata. Check for any breaking changes in how layouts work.

- [ ] **Step 2: Add i18n keys for admin section**

  Add to `frontend/src/messages/en-US.json`:
  ```json
  "admin": {
    "title": "Administration",
    "nav": {
      "users": "Users",
      "roles": "Roles & Permissions",
      "enums": "Enums",
      "customFields": "Custom Fields",
      "settings": "System Settings",
      "auditLogs": "Audit Logs"
    },
    "users": {
      "title": "User Management",
      "create": "Create User",
      "edit": "Edit User",
      "name": "Name",
      "email": "Email",
      "role": "Role",
      "status": "Status",
      "lastLogin": "Last Login",
      "created": "Created",
      "active": "Active",
      "locked": "Locked",
      "deactivated": "Deactivated",
      "deactivate": "Deactivate",
      "unlock": "Unlock",
      "forcePasswordChange": "Force Password Change",
      "temporaryPassword": "Temporary Password",
      "confirmDeactivate": "Are you sure you want to deactivate this user?",
      "noUsers": "No users found"
    },
    "roles": {
      "title": "Roles & Permissions",
      "create": "Create Role",
      "edit": "Edit Role",
      "name": "Role Name",
      "label": "Display Label",
      "color": "Color",
      "permissionMatrix": "Permission Matrix",
      "systemRole": "System Role",
      "cannotDelete": "System roles cannot be deleted",
      "toggleAll": "Toggle All",
      "savePermissions": "Save Permissions",
      "permissionsSaved": "Permissions saved successfully"
    },
    "enums": {
      "title": "Enum Management",
      "types": "Enum Types",
      "values": "Values",
      "addValue": "Add Value",
      "editValue": "Edit Value",
      "value": "Value",
      "label": "Label",
      "color": "Color",
      "icon": "Icon",
      "default": "Default",
      "system": "System",
      "cannotDelete": "System values cannot be deleted",
      "confirmDelete": "Are you sure you want to delete this value?",
      "dragToReorder": "Drag to reorder"
    },
    "customFields": {
      "title": "Custom Fields",
      "create": "Create Field",
      "edit": "Edit Field",
      "name": "Field Name",
      "label": "Display Label",
      "fieldType": "Field Type",
      "required": "Required",
      "defaultValue": "Default Value",
      "options": "Options",
      "addOption": "Add Option",
      "scope": "Scope",
      "global": "Global (all projects)",
      "project": "Specific Project",
      "entityTypes": {
        "bug": "Bugs",
        "test_case": "Test Cases",
        "test_execution": "Test Executions",
        "test_plan": "Test Plans"
      }
    },
    "settings": {
      "title": "System Settings",
      "defaultLocale": "Default Locale",
      "defaultTheme": "Default Theme",
      "save": "Save Settings",
      "saved": "Settings saved successfully",
      "lastUpdated": "Last updated by {user} on {date}"
    },
    "auditLogs": {
      "title": "Audit Logs",
      "timestamp": "Timestamp",
      "user": "User",
      "action": "Action",
      "entityType": "Entity Type",
      "entityId": "Entity ID",
      "details": "Details",
      "noLogs": "No audit logs found",
      "filters": "Filters",
      "dateRange": "Date Range",
      "expandDetails": "Click to expand details"
    }
  }
  ```

  Add equivalent Portuguese translations to `pt-BR.json`.

- [ ] **Step 3: Create `AdminSidebar.tsx`**

  Create `frontend/src/components/admin/AdminSidebar.tsx`:

  - Use `useTranslations('admin.nav')` from next-intl
  - Use `usePathname()` to highlight active nav item
  - Navigation items:
    ```typescript
    const navItems = [
      { href: '/admin/users', label: t('users'), icon: Users },
      { href: '/admin/roles', label: t('roles'), icon: Shield },
      { href: '/admin/enums', label: t('enums'), icon: List },
      { href: '/admin/custom-fields', label: t('customFields'), icon: Columns },
      { href: '/admin/settings', label: t('settings'), icon: Settings },
      { href: '/admin/audit-logs', label: t('auditLogs'), icon: FileText },
    ]
    ```
  - Each item: icon + label, active state with accent background
  - Responsive: on mobile, render as horizontal scrollable tabs at top

- [ ] **Step 4: Create admin layout**

  Create `frontend/src/app/[locale]/admin/layout.tsx`:

  - Server component that wraps children with AdminSidebar
  - Layout: sidebar (w-64) on the left, content area (flex-1, overflow-y-auto) on the right
  - Apply proper padding and max-width
  - Add page title "Administration" in the header area

- [ ] **Step 5: Create admin index page**

  Create `frontend/src/app/[locale]/admin/page.tsx`:
  - Redirect to `/admin/users` (or render a dashboard overview if desired)

- [ ] **Step 6: Verify layout renders correctly**

  - Navigate to /en-US/admin -- should show sidebar with 6 nav items
  - Active item should be highlighted
  - Mobile view should show tabs
  - Dark/light theme should work

### Verification
- /[locale]/admin/ shows the admin layout with sidebar
- All 6 navigation items are visible and link correctly
- Active page is highlighted in sidebar
- Layout is responsive (sidebar becomes tabs on mobile)
- i18n works in both en-US and pt-BR

---

## Task 8: Frontend -- Enum Management Page

**Goal:** Build the enum management page with type list (left) and value editor (right).

**Files:**
- Create: `frontend/src/app/[locale]/admin/enums/page.tsx`
- Create: `frontend/src/components/admin/EnumTypeList.tsx`
- Create: `frontend/src/components/admin/EnumValueEditor.tsx`
- Create: `frontend/src/components/admin/ColorPicker.tsx`
- Create: `frontend/src/components/admin/IconSelector.tsx`
- Create: `frontend/src/lib/api/enums.ts`

**Key patterns:**
- Split-pane layout: type list on left (w-72), value editor on right
- Select a type -> load its values on the right
- Values are editable inline or via dialog
- Drag-and-drop reordering (use @dnd-kit/core or native HTML5 drag)
- System values show a lock icon and cannot be deleted
- Color picker shows hex input + preview swatch
- Icon selector shows a grid of common Lucide icons

### Steps

- [ ] **Step 1: Create API client for enums**

  Create `frontend/src/lib/api/enums.ts`:
  ```typescript
  const API_BASE = process.env.NEXT_PUBLIC_API_URL

  export async function fetchEnumTypes(token: string): Promise<EnumType[]>
  export async function fetchEnumValues(token: string, typeName: string): Promise<EnumValue[]>
  export async function createEnumValue(token: string, typeName: string, data: CreateEnumValueInput): Promise<EnumValue>
  export async function updateEnumValue(token: string, valueId: string, data: UpdateEnumValueInput): Promise<EnumValue>
  export async function deleteEnumValue(token: string, valueId: string): Promise<void>
  export async function reorderEnumValues(token: string, typeName: string, order: ReorderInput[]): Promise<void>
  ```

  All functions include `Authorization: Bearer ${token}` header and handle errors.

- [ ] **Step 2: Create `ColorPicker.tsx`**

  Create `frontend/src/components/admin/ColorPicker.tsx`:
  - Input field for hex color (e.g., #ef4444)
  - Color swatch preview next to input
  - Preset color palette (8-10 common colors used in the seed data)
  - Click preset to select, or type custom hex
  - Validate hex format on blur

- [ ] **Step 3: Create `IconSelector.tsx`**

  Create `frontend/src/components/admin/IconSelector.tsx`:
  - Dropdown/popover with grid of common Lucide icons
  - Search/filter icons by name
  - Show ~40-50 most relevant icons (Bug, CheckCircle, XCircle, AlertTriangle, Clock, etc.)
  - Selected icon shown as preview
  - Value stored as icon name string (e.g., "bug", "check-circle")

- [ ] **Step 4: Create `EnumTypeList.tsx`**

  Create `frontend/src/components/admin/EnumTypeList.tsx`:
  - Fetch enum types on mount
  - Display as a list of cards/items: name, value count, isSystem badge
  - Click to select -> triggers value loading on right panel
  - Active type highlighted
  - Format name for display: "bug_priority" -> "Bug Priority"

- [ ] **Step 5: Create `EnumValueEditor.tsx`**

  Create `frontend/src/components/admin/EnumValueEditor.tsx`:
  - Props: `typeName: string`
  - Fetch values when typeName changes
  - Display values as a sortable list (drag handles on left)
  - Each value row shows: drag handle, color swatch, label, value, icon, default badge, system lock icon
  - Edit button opens inline edit or dialog with fields: label, value, color (ColorPicker), icon (IconSelector), isDefault toggle
  - Add button at bottom opens same form for creation
  - Delete button (disabled/hidden for system values, shows lock icon instead)
  - Save reorder on drag end (call reorder API)
  - Optimistic updates for better UX

- [ ] **Step 6: Create enum management page**

  Create `frontend/src/app/[locale]/admin/enums/page.tsx`:
  - Use state to track selected enum type
  - Layout: `EnumTypeList` on left, `EnumValueEditor` on right
  - Default: select first type on load
  - Mobile: stack vertically (type list on top, values below)

- [ ] **Step 7: Install drag-and-drop dependency if needed**

  If using @dnd-kit:
  ```bash
  cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
  ```

  Alternatively, use a simpler approach with native drag events or shadcn's sortable patterns.

- [ ] **Step 8: Test the page end-to-end**

### Verification
- Page loads with all enum types listed on the left
- Selecting a type loads its values on the right
- Can add a new value with label, value, color, icon
- Can edit existing values (label, color, icon, default)
- Cannot delete system values (lock icon shown, delete disabled)
- Drag reorder works and persists
- Color picker shows preview swatch
- Works in dark and light themes
- i18n labels display correctly

---

## Task 9: Frontend -- Roles + Permission Matrix Page

**Goal:** Build the roles management page with role list and permission matrix.

**Files:**
- Create: `frontend/src/app/[locale]/admin/roles/page.tsx`
- Create: `frontend/src/components/admin/RoleList.tsx`
- Create: `frontend/src/components/admin/PermissionMatrix.tsx`
- Create: `frontend/src/components/admin/RoleFormDialog.tsx`
- Create: `frontend/src/lib/api/roles.ts`

**Key patterns:**
- Left panel: role list with color badges
- Right panel: permission matrix (grid of checkboxes)
- Matrix rows = permissions grouped by resource (project, test_case, bug, etc.)
- Matrix columns = single role (all permissions for selected role)
- Toggle-all per resource group
- Save sends full permission ID array via PUT

### Steps

- [ ] **Step 1: Create API client for roles**

  Create `frontend/src/lib/api/roles.ts`:
  ```typescript
  export async function fetchRoles(token: string): Promise<Role[]>
  export async function fetchAllPermissions(token: string): Promise<PermissionsByResource>
  export async function fetchRolePermissions(token: string, roleId: string): Promise<string[]>
  export async function createRole(token: string, data: CreateRoleInput): Promise<Role>
  export async function updateRole(token: string, roleId: string, data: UpdateRoleInput): Promise<Role>
  export async function deleteRole(token: string, roleId: string): Promise<void>
  export async function saveRolePermissions(token: string, roleId: string, permissionIds: string[]): Promise<void>
  ```

- [ ] **Step 2: Create `RoleList.tsx`**

  - Fetch roles on mount
  - Display as list items: color dot/badge, label, user count, system badge
  - Click to select -> loads permission matrix on right
  - "Create Role" button at top
  - Each non-system role has edit/delete actions

- [ ] **Step 3: Create `RoleFormDialog.tsx`**

  - Dialog for creating/editing a role
  - Fields: name (slug, lowercase), label (display name), color (ColorPicker from Task 8)
  - Name field: disabled when editing system roles
  - Validation: name required, unique; label required
  - On submit: calls createRole or updateRole API

- [ ] **Step 4: Create `PermissionMatrix.tsx`**

  - Props: `roleId: string`
  - Fetch all permissions (grouped by resource) and role's current permissions on mount
  - Render a table/grid:
    - Group header row for each resource (e.g., "Project", "Test Case", "Bug")
    - Under each group: rows for each action (create, read, update, delete, execute, export, import, manage_members, manage_settings)
    - Each row has: permission label + checkbox (checked if role has that permission)
  - Group header has "Toggle All" checkbox (checked if all permissions in group are selected, indeterminate if partial)
  - Clicking "Toggle All" checks/unchecks all permissions in that resource group
  - "Save Permissions" button at bottom
  - On save: collect all checked permission IDs, call PUT /settings/roles/:id/permissions
  - Show success toast on save
  - Track dirty state: show unsaved changes indicator if modified

- [ ] **Step 5: Create roles page**

  Create `frontend/src/app/[locale]/admin/roles/page.tsx`:
  - Split layout: RoleList (left, w-72), PermissionMatrix (right)
  - State: selectedRoleId
  - Default: select first role on load
  - Confirm dialog before deleting custom roles

- [ ] **Step 6: Test and verify**

### Verification
- Page shows 4 system roles (admin, lead, tester, viewer) + any custom ones
- Selecting a role shows its permission matrix
- Permission matrix shows all resources grouped with checkboxes
- Toggle-all works per resource group
- Saving permissions persists changes (reload and verify)
- Cannot delete system roles (button disabled or hidden)
- Can create custom roles with name, label, color
- Color badges display correctly
- i18n, dark/light theme

---

## Task 10: Frontend -- Users Management Page

**Goal:** Build the users management page with data table, filters, and CRUD dialogs.

**Files:**
- Create: `frontend/src/app/[locale]/admin/users/page.tsx`
- Create: `frontend/src/components/admin/UserTable.tsx`
- Create: `frontend/src/components/admin/UserFormDialog.tsx`
- Create: `frontend/src/lib/api/adminUsers.ts`

**Key patterns:**
- Data table with columns: name, email, role (color badge), status (active/locked/deactivated), last login, created
- Filters bar: role dropdown, status dropdown, search input
- Pagination controls (previous/next, page indicator)
- Create dialog: name, email, role dropdown, temporary password (for local auth)
- Edit: change role, force password change toggle
- Deactivate with confirmation dialog
- Unlock button for locked accounts

### Steps

- [ ] **Step 1: Create API client for admin users**

  Create `frontend/src/lib/api/adminUsers.ts`:
  ```typescript
  export async function fetchUsers(token: string, params: UserListParams): Promise<PaginatedResponse<User>>
  export async function fetchUser(token: string, userId: string): Promise<UserDetail>
  export async function createUser(token: string, data: CreateUserInput): Promise<UserDetail>
  export async function updateUser(token: string, userId: string, data: UpdateUserInput): Promise<UserDetail>
  export async function deactivateUser(token: string, userId: string): Promise<void>
  export async function unlockUser(token: string, userId: string): Promise<void>
  ```

- [ ] **Step 2: Create `UserTable.tsx`**

  - Receives paginated user data as props
  - Columns: avatar + name, email, role (colored badge), status (green/yellow/red badge), last login (relative time), created date
  - Row actions dropdown: Edit, Force Password Change, Deactivate, Unlock (shown conditionally)
  - Empty state when no users match filters
  - Use shadcn Table component

- [ ] **Step 3: Create `UserFormDialog.tsx`**

  - Mode: "create" | "edit"
  - Create mode fields: name, email (required), role (dropdown fetched from roles API), temporary password (required if AUTH_MODE includes local)
  - Edit mode fields: name, role (dropdown), force password change (toggle)
  - Validation: email format, password min length (for create)
  - On submit: calls createUser or updateUser
  - Show password field only when auth mode is local or both (read from system settings or env)

- [ ] **Step 4: Create users management page**

  Create `frontend/src/app/[locale]/admin/users/page.tsx`:
  - Filters bar at top: role dropdown (fetched from API), status dropdown (Active/Locked/Deactivated), search input (debounced 300ms)
  - "Create User" button in header
  - UserTable below filters
  - Pagination controls below table
  - Deactivate confirmation dialog (shadcn AlertDialog)
  - Unlock button calls API and refreshes
  - State management: filters, pagination, selected user for edit/delete

- [ ] **Step 5: Test and verify**

### Verification
- Table displays all users with correct role badges and status indicators
- Search filters by name or email (debounced)
- Role filter narrows results
- Status filter works (active, locked, deactivated)
- Pagination works (page navigation, correct total count)
- Create user dialog works with password for local auth
- Edit user changes role
- Deactivate shows confirmation, then marks user as deactivated
- Unlock clears locked status
- i18n, responsive, dark/light theme

---

## Task 11: Frontend -- Custom Fields Management Page

**Goal:** Build the custom fields management page with entity type tabs and field definition CRUD.

**Files:**
- Create: `frontend/src/app/[locale]/admin/custom-fields/page.tsx`
- Create: `frontend/src/components/admin/CustomFieldList.tsx`
- Create: `frontend/src/components/admin/CustomFieldFormDialog.tsx`
- Create: `frontend/src/lib/api/customFields.ts`

**Key patterns:**
- Tabs for entity types: Bug, Test Case, Test Execution, Test Plan
- Each tab shows field definitions for that entity type
- Drag to reorder fields
- Create/edit dialog with field type selection
- For select/multi_select: inline options editor (add/remove items)
- Scope toggle: global vs project-specific

### Steps

- [ ] **Step 1: Create API client for custom fields**

  Create `frontend/src/lib/api/customFields.ts`:
  ```typescript
  export async function fetchFieldDefinitions(token: string, entityType: string, projectId?: string): Promise<CustomFieldDef[]>
  export async function createFieldDefinition(token: string, data: CreateFieldInput): Promise<CustomFieldDef>
  export async function updateFieldDefinition(token: string, fieldId: string, data: UpdateFieldInput): Promise<CustomFieldDef>
  export async function deleteFieldDefinition(token: string, fieldId: string): Promise<void>
  export async function reorderFields(token: string, entityType: string, order: ReorderInput[]): Promise<void>
  ```

- [ ] **Step 2: Create `CustomFieldList.tsx`**

  - Props: `entityType: string`
  - Fetch field definitions for the entity type
  - Sortable list with drag handles
  - Each item shows: drag handle, field label, field type badge, required indicator, scope badge (Global/Project), edit/delete actions
  - "Add Field" button at top
  - Drag to reorder, save order on drop
  - Delete with confirmation

- [ ] **Step 3: Create `CustomFieldFormDialog.tsx`**

  - Mode: "create" | "edit"
  - Fields:
    - Name (slug, lowercase with underscores, disabled on edit)
    - Label (display name)
    - Field Type (dropdown: fetched from field_type enum values -- text, number, date, select, multi_select, user, boolean, url)
    - Required (toggle)
    - Default Value (text input, type depends on field type)
    - Scope: radio -- Global (all projects) or Specific Project (project dropdown)
  - Conditional: when field type is `select` or `multi_select`, show options editor:
    - List of option strings
    - "Add Option" button appends empty input
    - Each option has remove button
    - Options stored as JSON array
  - Validation: name must match `^[a-z][a-z0-9_]*$`, label required, fieldTypeId required

- [ ] **Step 4: Create custom fields page**

  Create `frontend/src/app/[locale]/admin/custom-fields/page.tsx`:
  - Tabs component (shadcn Tabs) with 4 tabs: Bug, Test Case, Test Execution, Test Plan
  - Each tab renders `CustomFieldList` with the entity type
  - Selected tab stored in URL search params for bookmarkability
  - "Create Field" button opens CustomFieldFormDialog with entityType pre-selected

- [ ] **Step 5: Test and verify**

### Verification
- Tabs switch between entity types correctly
- Field definitions load per entity type
- Can create new field with all supported types
- Select/multi_select shows options editor
- Field name validates as lowercase slug
- Drag reorder works and persists
- Delete removes field and its values
- Scope correctly sets projectId (null for global)
- i18n, responsive, dark/light theme

---

## Task 12: Frontend -- System Settings Page

**Goal:** Build a simple form page for system-wide settings.

**Files:**
- Create: `frontend/src/app/[locale]/admin/settings/page.tsx`
- Create: `frontend/src/lib/api/systemSettings.ts`

**Key patterns:**
- Simple form with dropdowns for locale and theme
- Save button persists to backend
- Shows who last updated and when
- Uses shadcn Select and Button components

### Steps

- [ ] **Step 1: Create API client for system settings**

  Create `frontend/src/lib/api/systemSettings.ts`:
  ```typescript
  export async function fetchSystemSettings(token: string): Promise<SystemSetting[]>
  export async function updateSystemSettings(token: string, settings: Array<{ key: string; value: string }>): Promise<void>
  ```

- [ ] **Step 2: Create system settings page**

  Create `frontend/src/app/[locale]/admin/settings/page.tsx`:

  - Fetch all settings on mount
  - Form fields:
    - Default Locale: dropdown with options ["en-US", "pt-BR"]
    - Default Theme: dropdown with options ["dark", "light", "system"]
  - "Save Settings" button
  - Below form: "Last updated by {userName} on {date}" (from setting's updatedBy + updatedAt)
  - On save: call PATCH /settings/system with changed values
  - Show success toast on save
  - Track dirty state: disable save button when no changes

- [ ] **Step 3: Test and verify**

### Verification
- Page loads current settings values into form
- Changing locale and saving persists the change
- Changing theme and saving persists the change
- "Last updated" info displays correctly
- Save button disabled when no changes
- Success toast on save
- i18n, dark/light theme

---

## Task 13: Frontend -- Audit Logs Page

**Goal:** Build a read-only audit logs viewer with filters and expandable details.

**Files:**
- Create: `frontend/src/app/[locale]/admin/audit-logs/page.tsx`
- Create: `frontend/src/components/admin/AuditLogTable.tsx`
- Create: `frontend/src/lib/api/auditLogs.ts`

**Key patterns:**
- Read-only table, no create/edit/delete actions
- Expandable rows to show full payload JSON
- Filters: user dropdown, entity type dropdown, action text input, date range picker
- Pagination at bottom

### Steps

- [ ] **Step 1: Create API client for audit logs**

  Create `frontend/src/lib/api/auditLogs.ts`:
  ```typescript
  export async function fetchAuditLogs(token: string, params: AuditLogParams): Promise<PaginatedResponse<AuditLog>>
  ```

- [ ] **Step 2: Create `AuditLogTable.tsx`**

  - Columns: timestamp (formatted date+time), user (avatar + name), action, entity type, entity ID (truncated UUID), expand button
  - Expandable row: shows full payload JSON (formatted with syntax highlighting or pre tag)
  - Use shadcn Table with collapsible rows
  - Action column: format action string for readability (e.g., "post_bugs" -> "Create Bug")
  - Entity ID: show truncated (first 8 chars), copy-to-clipboard on click
  - Empty state when no logs match filters

- [ ] **Step 3: Create audit logs page**

  Create `frontend/src/app/[locale]/admin/audit-logs/page.tsx`:

  - Filters bar:
    - User dropdown (fetch users from admin API)
    - Entity Type dropdown (hardcoded options: projects, test-plans, suites, cases, executions, bugs, settings, users)
    - Action text input (free text filter)
    - Date range: two date inputs (from, to) using shadcn Calendar/DatePicker
  - "Clear Filters" button
  - AuditLogTable below
  - Pagination controls (previous/next, showing X of Y)
  - Auto-refresh: optionally add a "Refresh" button

- [ ] **Step 4: Test and verify**

### Verification
- Table shows audit logs with user info and timestamps
- Expanding a row shows full JSON payload
- User filter narrows results to specific user's actions
- Entity type filter works
- Date range filter works
- Pagination works correctly
- Read-only (no edit/delete actions)
- i18n, responsive, dark/light theme

---

## Task 14: Verification (Full Integration)

**Goal:** Verify all admin features work end-to-end, including edge cases and cross-cutting concerns.

### Steps

- [ ] **Step 1: Backend verification**

  - Start the backend server
  - Run all new test suites:
    ```bash
    cd backend && npx vitest run tests/services/ tests/routes/
    ```
  - Verify all tests pass

- [ ] **Step 2: Enum management verification**

  - GET /api/v1/settings/enums returns all 9 seeded types
  - Create a new value for bug_priority: "urgent" with color #dc2626
  - Edit the new value's label to "Urgent!"
  - Reorder bug_priority values (move urgent to position 0)
  - Try deleting a system value (should fail with 400)
  - Delete the custom "urgent" value (should succeed)

- [ ] **Step 3: Roles + permissions verification**

  - GET /api/v1/settings/roles returns 4 system roles
  - Create custom role "qa_manager" with label "QA Manager" and color #8b5cf6
  - Set permissions: all test_case + test_plan + execution permissions
  - Verify permission matrix saved (GET role permissions)
  - Edit admin role permissions (should work)
  - Try deleting admin role (should fail -- system role)
  - Delete qa_manager role (should succeed if no users assigned)

- [ ] **Step 4: Custom fields verification**

  - Create a global text field for bugs: name "environment", label "Environment"
  - Create a select field for bugs: name "browser", label "Browser", options ["Chrome", "Firefox", "Safari", "Edge"]
  - Create a multi_select field for test cases: name "tags", label "Tags"
  - Create a number field: name "story_points", label "Story Points"
  - Verify fields appear in GET /settings/custom-fields/bug
  - Delete a field and verify values are cascaded

- [ ] **Step 5: User management verification**

  - List users with pagination
  - Create user with temporary password (local auth mode)
  - Verify forcePasswordChange is true
  - Change user's role
  - Lock and unlock a user
  - Deactivate a user and verify they appear with deactivated status

- [ ] **Step 6: System settings verification**

  - GET /api/v1/settings/system returns default_locale and default_theme
  - Update default_theme to "light"
  - Verify GET /api/v1/settings/system/public returns updated value (no auth needed)

- [ ] **Step 7: Audit log verification**

  - Perform several write operations (create enum value, create role, update user)
  - GET /api/v1/audit-logs should show all recent operations
  - Filter by entity type "settings" -- should narrow results
  - Filter by date range -- should narrow results
  - Verify payload contains method, url, statusCode

- [ ] **Step 8: Frontend verification**

  - Navigate to /en-US/admin -- sidebar shows all 6 sections
  - Each page loads data and displays correctly
  - CRUD operations work from the UI
  - Permission matrix saves and reloads correctly
  - Drag reorder works for enums and custom fields
  - System values show lock icons, cannot be deleted from UI
  - Forms validate inputs (required fields, color format, name slug)
  - Success/error toasts display after operations
  - Switch to /pt-BR/admin -- all labels in Portuguese
  - Toggle dark/light theme -- all pages render correctly
  - Responsive: test on mobile viewport (sidebar collapses, tables scroll)

- [ ] **Step 9: Cross-cutting concerns**

  - Verify all admin routes return 403 for non-admin users
  - Verify audit log plugin captures all new admin write operations
  - Verify permission cache is invalidated after role permission changes
  - Check that no console errors appear in browser
  - Verify all Swagger docs are generated for new endpoints (visit /docs)

### Final Verification Checklist
- [ ] All admin CRUD operations work (enums, roles, users, custom fields, settings)
- [ ] Permission matrix saves and loads correctly
- [ ] System roles cannot be deleted
- [ ] System enum values cannot be deleted
- [ ] Custom field values stored in correct polymorphic columns
- [ ] Audit logs capture all write operations with correct metadata
- [ ] Public settings endpoint works without authentication
- [ ] i18n works for both en-US and pt-BR
- [ ] Dark and light themes render correctly
- [ ] Responsive design works on mobile viewports
- [ ] All backend tests pass
- [ ] No TypeScript errors in frontend or backend
