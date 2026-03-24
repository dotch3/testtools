# Plan 3 — Frontend Core: Layout, Sidebar, Theme, i18n, shadcn/ui

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authenticated application shell — sidebar navigation, header with breadcrumbs and profile dropdown, theme system driven by SYSTEM_SETTINGS, enhanced i18n with locale-aware formatting, and a typed API client.

**Prerequisites:** Plan 1 (infrastructure) and Plan 2 (auth backend) completed.

**Skills needed:** Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui (Radix UI), next-intl, next-themes.

---

## File Map

```
frontend/
  components.json                   -- shadcn/ui config
  src/
    app/
      globals.css                   -- MODIFY: add shadcn/ui CSS variables
      layout.tsx                   -- MODIFY: minimal root layout
      page.tsx                     -- MODIFY: redirect to /[locale]
      [locale]/
        layout.tsx                 -- CREATE: locale layout with providers
        page.tsx                   -- MODIFY: redirect to dashboard
        (auth)/
          login/page.tsx          -- CREATE: placeholder
          layout.tsx              -- CREATE: public-only layout
        (app)/
          layout.tsx              -- CREATE: AppShell layout
          dashboard/page.tsx      -- CREATE: placeholder
          test-plans/page.tsx     -- CREATE: placeholder
          test-cases/page.tsx     -- CREATE: placeholder
          executions/page.tsx      -- CREATE: placeholder
          bugs/page.tsx           -- CREATE: placeholder
          reports/dashboard/page.tsx
          reports/coverage/page.tsx
          admin/users/page.tsx
          admin/roles/page.tsx
          admin/enums/page.tsx
          admin/custom-fields/page.tsx
          admin/integrations/page.tsx
          admin/settings/page.tsx
    components/
      ui/
        button.tsx, dropdown-menu.tsx, sheet.tsx, tooltip.tsx
        separator.tsx, avatar.tsx, breadcrumb.tsx, scroll-area.tsx, skeleton.tsx
      layout/
        AppShell.tsx, Sidebar.tsx, SidebarNav.tsx, Header.tsx
        Breadcrumbs.tsx, ProfileDropdown.tsx, ThemeToggle.tsx, MobileSidebar.tsx
      providers/
        ThemeProvider.tsx, AuthProvider.tsx, AppProviders.tsx
    lib/
      api.ts                       -- CREATE: typed fetch wrapper
      navigation.ts               -- CREATE: sidebar nav config
      formatters.ts               -- CREATE: Intl-based date/number formatters
    hooks/
      useAuth.ts, useSidebarState.ts
    messages/
      en-US.json, pt-BR.json      -- MODIFY: add nav, layout keys
    middleware.ts                  -- MODIFY: locale detection
```

---

## Task 1: shadcn/ui Setup

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/*.tsx`

- [ ] **Step 1: Install dependencies**

  ```bash
  cd frontend
  npm install class-variance-authority clsx tailwind-merge
  npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-tooltip
  npm install @radix-ui/react-separator @radix-ui/react-avatar @radix-ui/react-scroll-area
  npm install @radix-ui/react-slot
  ```

- [ ] **Step 2: Create cn utility**

  ```typescript
  // frontend/src/lib/utils.ts
  import { type ClassValue, clsx } from 'clsx'
  import { twMerge } from 'tailwind-merge'
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }
  ```

- [ ] **Step 3: Create shadcn/ui components**

  Copy shadcn/ui components for: button, dropdown-menu, sheet, tooltip, separator, avatar, breadcrumb, scroll-area, skeleton.

---

## Task 2: Layout Shell

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/[locale]/layout.tsx`

- [ ] **Step 1: Restructure layouts**

  Root `layout.tsx` — minimal, just `<html>` and `<body>`.
  Root `page.tsx` — redirect to default locale.
  Locale `layout.tsx` — wraps with NextIntlClientProvider + AppProviders.

---

## Task 3: API Client

**Files:**
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: Create typed API wrapper**

  ```typescript
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

  class ApiClient {
    private async request<T>(method, path, options?): Promise<T> {
      // Build headers with Authorization: Bearer <token>
      // Handle 401: attempt refresh, retry once, then redirect to login
      // Return typed response
    }
    get<T>(path, opts?): Promise<T> { ... }
    post<T>(path, body, opts?): Promise<T> { ... }
    patch<T>(path, body): Promise<T> { ... }
    delete<T>(path): Promise<T> { ... }
  }

  export const api = new ApiClient(API_BASE)
  ```

---

## Task 4: Sidebar Component

**Files:**
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/SidebarNav.tsx`
- Create: `frontend/src/lib/navigation.ts`
- Create: `frontend/src/hooks/useSidebarState.ts`

- [ ] **Step 1: Create navigation config**

  ```typescript
  export const sidebarNavigation = [
    { items: [
      { titleKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
      { titleKey: 'nav.testPlans', href: '/test-plans', icon: ClipboardList },
      // ...
    ]},
    { titleKey: 'nav.reports', items: [...] },
    { titleKey: 'nav.admin', adminOnly: true, items: [...] },
  ]
  ```

- [ ] **Step 2: Create Sidebar with collapse**

  - Width: 256px expanded, 64px collapsed
  - Logo area at top
  - Project selector placeholder
  - ScrollArea with nav items
  - Collapse toggle at bottom
  - Hidden on mobile (`hidden md:flex`)

---

## Task 5: Header Component

**Files:**
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/Breadcrumbs.tsx`
- Create: `frontend/src/components/layout/ProfileDropdown.tsx`
- Create: `frontend/src/components/layout/MobileSidebar.tsx`

- [ ] **Step 1: Create header**

  ```
  <header className="flex h-14 items-center gap-4 border-b px-4">
    <MobileSidebarTrigger />  {/* mobile only */}
    <Breadcrumbs />
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <ProfileDropdown />
    </div>
  </header>
  ```

- [ ] **Step 2: Profile dropdown**

  Avatar + DropdownMenu with: user name/email, My Profile, Change Password, Logout.

---

## Task 6: Theme System

**Files:**
- Create: `frontend/src/components/layout/ThemeToggle.tsx`
- Modify: `frontend/src/components/providers/ThemeProvider.tsx`

- [ ] **Step 1: Create ThemeToggle**

  DropdownMenu with sun/moon/monitor icons for light/dark/system.

---

## Task 7: Auth Context

**Files:**
- Create: `frontend/src/components/providers/AuthProvider.tsx`
- Create: `frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: Create auth provider**

  - On mount: check token, fetch profile, set user
  - Provide: user, isAuthenticated, isLoading, login, logout, updateUser
  - Redirect unauthenticated users to /login
  - Redirect authenticated users on public routes to /dashboard

---

## Task 8: i18n

**Files:**
- Modify: `frontend/src/messages/en-US.json`
- Modify: `frontend/src/messages/pt-BR.json`
- Create: `frontend/src/lib/formatters.ts`

- [ ] **Step 1: Add translation keys**

  Add: nav.*, layout.*, theme.*, profile.*, breadcrumbs.* keys.

- [ ] **Step 2: Create formatters**

  ```typescript
  export function formatDate(date: Date | string, locale: string): string
  export function formatDateTime(date: Date | string, locale: string): string
  export function formatNumber(value: number, locale: string): string
  export function formatDecimal(value: number, locale: string, decimals?: number): string
  export function formatPercent(value: number, locale: string): string
  ```

---

## Task 9: Placeholder Pages

**Files:**
- Create: All placeholder pages under `(app)/`

- [ ] **Step 1: Create placeholder pages**

  Each page exports a component with the page name as heading:
  ```tsx
  export default function DashboardPage() {
    return <h1 className="text-2xl font-semibold">Dashboard</h1>
  }
  ```

---

## Verification

- [ ] `/` redirects to `/en-US`
- [ ] `/en-US` redirects to `/en-US/dashboard`
- [ ] AppShell renders with sidebar + header
- [ ] Sidebar collapses and expands
- [ ] Theme toggle works
- [ ] Profile dropdown shows user info
- [ ] Logout clears tokens and redirects to login
- [ ] All text is translated
