# Plan 9 — User Profile + Integrations (Profile page, OAuth accounts, user credentials)

**Goal:** User profile experience and two-layer integration architecture — profile management, OAuth account linking, and per-user API credentials for GitHub/Jira/etc.

---

## File Map

```
backend/src/
  services/ProfileService.ts, UserIntegrationService.ts
  interfaces/http/routes/profile.ts, profileIntegrations.ts

frontend/src/
  app/[locale]/(app)/
    profile/page.tsx
    projects/[id]/settings/integrations/page.tsx
  components/profile/
    PersonalInfoForm.tsx, PreferencesForm.tsx, OAuthAccountsList.tsx
    IntegrationCredentialCard.tsx, IntegrationCredentialDialog.tsx
```

---

## Task 1: User Integration Credentials

**Files:**
- Create: `backend/prisma/schema.prisma` (add UserIntegrationCredential model)
- Create: `backend/src/services/UserIntegrationService.ts`
- Create: `backend/src/interfaces/http/routes/profileIntegrations.ts`

- [ ] **User-level credentials**

  ```typescript
  // Encrypted with ENCRYPTION_KEY
  async create(userId, integrationTypeId, credential, username)
  async list(userId)
  async update(id, credential)
  async delete(id)
  async testConnection(id) // Verify credential works
  ```

---

## Task 2: Profile Service Enhancement

**Files:**
- Create: `backend/src/services/ProfileService.ts`
- Modify: `backend/src/interfaces/http/routes/profile.ts`

- [ ] **Profile operations**

  - Get profile with OAuth accounts
  - Update name, avatar, locale, theme preference
  - Link/unlink OAuth account
  - Change password

---

## Task 3: Project Integrations

**Files:**
- Create: `backend/src/interfaces/http/routes/projectIntegrations.ts`

- [ ] **Project-level integration config**

  - `GET /projects/:id/integrations` — list configured integrations
  - `POST /projects/:id/integrations` — configure integration
  - `PATCH/DELETE /projects/:id/integrations/:id`

---

## Task 4: Profile Frontend Page

**Files:**
- Create: `frontend/src/app/[locale]/(app)/profile/page.tsx`
- Create: `frontend/src/components/profile/PersonalInfoForm.tsx`

- [ ] **Profile page tabs**

  - Personal Info (name, email, avatar)
  - Preferences (locale, theme)
  - Linked Accounts (OAuth)
  - Integration Credentials (API tokens)

---

## Task 5: Integration Credential Manager

**Files:**
- Create: `frontend/src/components/profile/IntegrationCredentialDialog.tsx`

- [ ] **Add/edit credential dialog**

  - Select integration type (GitHub, Jira, etc.)
  - Enter username and API token
  - Test connection button
  - Save encrypted

---

## Task 6: Project Integration Settings

**Files:**
- Create: `frontend/src/app/[locale]/(app)/projects/[id]/settings/integrations/page.tsx`

- [ ] **Project integration config**

  - Configure which tracker to use
  - Enter repository URL, project key, etc.
  - Select which user credential to use

---

## Verification

- [ ] User can update profile
- [ ] User can link/unlink OAuth accounts
- [ ] User can save API credentials for integrations
- [ ] Project admin can configure project integrations
