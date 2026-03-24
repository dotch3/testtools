# Plan 8 — Admin: Enums, Roles/Permissions, Users, Custom Fields, System Settings UI

**Goal:** Complete admin settings — backend services/routes and frontend pages for managing enums, roles/permissions, users, custom fields, system settings.

---

## File Map

```
backend/src/
  services/EnumService.ts, RoleService.ts, UserAdminService.ts, CustomFieldService.ts
  interfaces/http/routes/admin/enums.ts, roles.ts, users.ts, customFields.ts, settings.ts

frontend/src/
  app/[locale]/(app)/admin/
    users/page.tsx, roles/page.tsx, enums/page.tsx
    custom-fields/page.tsx, integrations/page.tsx, settings/page.tsx
  components/admin/
    UsersTable.tsx, RolesMatrix.tsx, EnumsManager.tsx, CustomFieldBuilder.tsx
```

---

## Task 1: Enum Management

**Files:**
- Create: `backend/src/services/EnumService.ts`
- Create: `backend/src/interfaces/http/routes/admin/enums.ts`

- [ ] **CRUD for enum values**

  - `GET /admin/enums` — list all enum types
  - `POST /admin/enums` — create new enum type
  - `PATCH /admin/enums/:id` — update enum values
  - `DELETE /admin/enums/:id` — delete enum type

---

## Task 2: Role/Permission Matrix

**Files:**
- Create: `backend/src/services/RoleService.ts`
- Create: `backend/src/interfaces/http/routes/admin/roles.ts`

- [ ] **Role CRUD with permission matrix**

  - `GET /admin/roles`
  - `POST /admin/roles`
  - `PATCH /admin/roles/:id` — update permissions
  - Check permission in permissionGuard by resource+action

---

## Task 3: User Management

**Files:**
- Create: `backend/src/services/UserAdminService.ts`
- Create: `backend/src/interfaces/http/routes/admin/users.ts`

- [ ] **Admin user operations**

  - `GET /admin/users` — paginated list with search
  - `POST /admin/users` — create user (send invite email)
  - `PATCH /admin/users/:id` — update role, active status
  - `DELETE /admin/users/:id` — soft delete

---

## Task 4: Custom Fields

**Files:**
- Create: `backend/src/services/CustomFieldService.ts`
- Create: `backend/src/interfaces/http/routes/admin/customFields.ts`

- [ ] **Custom field definitions**

  - `GET /admin/custom-fields` — list definitions
  - `POST /admin/custom-fields` — create definition (entity_type, field_type, label)
  - `PATCH/DELETE /admin/custom-fields/:id`

---

## Task 5: System Settings

**Files:**
- Create: `backend/src/services/SystemSettingsService.ts`
- Create: `backend/src/interfaces/http/routes/admin/settings.ts`

- [ ] **Key-value settings**

  - `GET /settings/system/public` — no auth, returns default_locale, default_theme
  - `GET /admin/settings` — all settings (admin only)
  - `PATCH /admin/settings` — update setting

---

## Task 6: Admin Frontend Pages

**Files:**
- Create: All admin pages under `/admin/`

- [ ] **Create pages with shadcn/ui components**

  - UsersTable with search, pagination
  - RolesMatrix with permission checkboxes
  - EnumsManager with drag-and-drop ordering
  - CustomFieldBuilder with field type selector
  - SettingsPage with form for each setting

---

## Verification

- [ ] Admin can manage enums
- [ ] Admin can edit role permissions
- [ ] Admin can create/deactivate users
- [ ] Custom fields can be defined
- [ ] System settings can be changed
