# Plan 3 — Frontend Core: Layout, Sidebar, Theme, i18n, shadcn/ui

> **For agentic workers:** This project uses **Next.js 16.2** which has breaking changes from prior versions. Before writing ANY code, read the relevant migration/upgrade guides located at `node_modules/next/dist/docs/` inside the frontend directory. APIs, conventions, and file structure may differ from your training data. Heed all deprecation notices. The `frontend/AGENTS.md` file reinforces this requirement.

**Goal:** Build the authenticated application shell — sidebar navigation, header with breadcrumbs and profile dropdown, theme system driven by SYSTEM_SETTINGS, enhanced i18n with locale-aware formatting, and a typed API client. After this plan, any authenticated user can log in and see a fully navigable (but mostly placeholder-content) application.

**Prerequisites:** Plan 1 (infrastructure — Prisma, Redis, Docker, env files) and Plan 2 (auth backend — JWT, OAuth, routes, profile endpoint) completed.

**Skills needed:** Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui (Radix UI), next-intl, next-themes, Prisma 6, Fastify 5

---

## File Map

```
backend/
  prisma/
    schema.prisma                          -- MODIFY: add SystemSetting model
    migrations/YYYYMMDD_system_settings/   -- CREATE: migration
    seed.ts                                -- MODIFY: seed default settings
  src/
    services/
      SystemSettingsService.ts             -- CREATE: getAll, get, set
    interfaces/
      http/
        routes/
          settings.ts                      -- CREATE: /settings/system routes

frontend/
  components.json                          -- CREATE: shadcn/ui config
  src/
    app/
      globals.css                          -- MODIFY: add shadcn/ui CSS variables
      layout.tsx                           -- MODIFY: restructure for locale/auth
      page.tsx                             -- MODIFY: redirect to /[locale]
      [locale]/
        layout.tsx                         -- CREATE: locale layout with providers
        page.tsx                           -- MODIFY: redirect to dashboard
        (auth)/
          login/page.tsx                   -- CREATE: placeholder (login page shell)
          layout.tsx                       -- CREATE: public-only layout (no sidebar)
        (app)/
          layout.tsx                       -- CREATE: AppShell layout (sidebar+header)
          dashboard/page.tsx               -- CREATE: placeholder dashboard
          test-plans/page.tsx              -- CREATE: placeholder
          test-cases/page.tsx              -- CREATE: placeholder
          executions/page.tsx              -- CREATE: placeholder
          bugs/page.tsx                    -- CREATE: placeholder
          reports/
            dashboard/page.tsx             -- CREATE: placeholder
            coverage/page.tsx              -- CREATE: placeholder
          admin/
            users/page.tsx                 -- CREATE: placeholder
            roles/page.tsx                 -- CREATE: placeholder
            enums/page.tsx                 -- CREATE: placeholder
            custom-fields/page.tsx         -- CREATE: placeholder
            integrations/page.tsx          -- CREATE: placeholder
            settings/page.tsx              -- CREATE: placeholder
    components/
      ui/
        button.tsx                         -- CREATE: shadcn/ui component
        dropdown-menu.tsx                  -- CREATE: shadcn/ui component
        sheet.tsx                          -- CREATE: shadcn/ui component
        tooltip.tsx                        -- CREATE: shadcn/ui component
        separator.tsx                      -- CREATE: shadcn/ui component
        avatar.tsx                         -- CREATE: shadcn/ui component
        breadcrumb.tsx                     -- CREATE: shadcn/ui component
        scroll-area.tsx                    -- CREATE: shadcn/ui component
        skeleton.tsx                       -- CREATE: shadcn/ui component
      layout/
        AppShell.tsx                       -- CREATE: main layout shell
        Sidebar.tsx                        -- CREATE: collapsible sidebar
        SidebarNav.tsx                     -- CREATE: navigation items
        Header.tsx                         -- CREATE: top header bar
        Breadcrumbs.tsx                    -- CREATE: auto breadcrumbs
        ProfileDropdown.tsx                -- CREATE: avatar + dropdown
        ThemeToggle.tsx                    -- CREATE: sun/moon/monitor button
        MobileSidebar.tsx                  -- CREATE: Sheet-based mobile sidebar
      providers/
        ThemeProvider.tsx                  -- MODIFY: integrate with system settings
        AuthProvider.tsx                   -- CREATE: auth context + token management
        AppProviders.tsx                   -- CREATE: wraps all providers
    lib/
      api.ts                              -- CREATE: typed fetch wrapper
      navigation.ts                       -- CREATE: sidebar nav config
      formatters.ts                       -- CREATE: Intl-based date/number formatters
    hooks/
      useAuth.ts                          -- CREATE: auth context hook
      useSidebarState.ts                  -- CREATE: sidebar collapse state
    messages/
      en-US.json                          -- MODIFY: add nav, layout, settings keys
      pt-BR.json                          -- MODIFY: add nav, layout, settings keys
    middleware.ts                          -- MODIFY: update locale detection logic
```

---

## Task 1: shadcn/ui Setup

**Files:**
- Create: `frontend/components.json`
- Modify: `frontend/src/app/globals.css`
- Create: `frontend/src/lib/utils.ts`
- Create: all files under `frontend/src/components/ui/`

**Context:** shadcn/ui with Tailwind CSS v4 uses a different CSS variable approach than Tailwind v3. Tailwind v4 uses `@theme` blocks and native CSS variables. shadcn/ui has a Tailwind v4 compatible mode — use it. The `cn()` utility from shadcn uses `clsx` + `tailwind-merge`.

- [ ] **Step 1: Install dependencies**

  ```bash
  cd frontend
  npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot
  npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-separator @radix-ui/react-avatar @radix-ui/react-scroll-area
  ```

  These are the Radix primitives that shadcn/ui components wrap. shadcn/ui is a copy-paste component library, not an npm package — but it depends on these Radix packages.

- [ ] **Step 2: Create the `cn` utility**

  ```typescript
  // frontend/src/lib/utils.ts
  import { type ClassValue, clsx } from 'clsx'
  import { twMerge } from 'tailwind-merge'

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }
  ```

- [ ] **Step 3: Create `components.json`**

  This file is used by the `shadcn` CLI if we ever run `npx shadcn add <component>`. Configure it for Tailwind v4 and the project's path aliases.

  ```json
  {
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "new-york",
    "rsc": true,
    "tsx": true,
    "tailwind": {
      "config": "",
      "css": "src/app/globals.css",
      "baseColor": "zinc",
      "cssVariables": true
    },
    "aliases": {
      "components": "@/components",
      "utils": "@/lib/utils",
      "ui": "@/components/ui",
      "lib": "@/lib",
      "hooks": "@/hooks"
    }
  }
  ```

- [ ] **Step 4: Update `globals.css` with shadcn/ui CSS variables**

  The existing `globals.css` has basic `--background` and `--foreground` variables. Replace/extend it with the full shadcn/ui variable set compatible with Tailwind v4. Key variables needed:

  - `--background`, `--foreground`
  - `--card`, `--card-foreground`
  - `--popover`, `--popover-foreground`
  - `--primary`, `--primary-foreground`
  - `--secondary`, `--secondary-foreground`
  - `--muted`, `--muted-foreground`
  - `--accent`, `--accent-foreground`
  - `--destructive`, `--destructive-foreground`
  - `--border`, `--input`, `--ring`
  - `--sidebar-background`, `--sidebar-foreground`, `--sidebar-accent`, etc.
  - `--radius`

  Provide both `:root` (light) and `.dark` variants. Use the zinc palette from shadcn/ui defaults. The `@theme inline` block must register these as Tailwind colors:

  ```css
  @import "tailwindcss";

  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    /* ... register all variables as Tailwind theme colors ... */
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);
  }
  ```

  Important: With Tailwind v4, the `@theme` block replaces what `tailwind.config.js` used to do. Check the shadcn/ui docs or source for the exact Tailwind v4 CSS variable format.

- [ ] **Step 5: Install shadcn/ui base components**

  Copy the following shadcn/ui components into `frontend/src/components/ui/`. You can either use `npx shadcn@latest add <component>` (which reads `components.json`) or manually create each file by copying from the shadcn/ui source, adapted for Tailwind v4.

  Components to install:
  - `button.tsx` — used everywhere (theme toggle, nav actions, form submits)
  - `dropdown-menu.tsx` — profile dropdown, project selector
  - `sheet.tsx` — mobile sidebar overlay
  - `tooltip.tsx` — collapsed sidebar icon tooltips
  - `separator.tsx` — visual dividers in menus and sidebar
  - `avatar.tsx` — user avatar in header
  - `breadcrumb.tsx` — header breadcrumbs
  - `scroll-area.tsx` — scrollable sidebar navigation
  - `skeleton.tsx` — loading states for async content

  If using the CLI: `npx shadcn@latest add button dropdown-menu sheet tooltip separator avatar breadcrumb scroll-area skeleton`

  Each component must:
  - Use `'use client'` directive (they use Radix hooks)
  - Import `cn` from `@/lib/utils`
  - Use CSS variable-based classes (e.g., `bg-background`, `text-foreground`, `border-border`)

- [ ] **Step 6: Verify components compile**

  Run `npx tsc --noEmit` from the frontend directory. Fix any type errors. Ensure all imports resolve correctly with the `@/` alias.

**Verification:**
- `npm run build` passes with no errors related to ui components
- All component files exist under `frontend/src/components/ui/`
- `cn()` utility works (combines classes and merges Tailwind conflicts)

---

## Task 2: SYSTEM_SETTINGS Backend

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration file (via `prisma migrate dev`)
- Modify: `backend/prisma/seed.ts`
- Create: `backend/src/services/SystemSettingsService.ts`
- Create: `backend/src/interfaces/http/routes/settings.ts`
- Modify: `backend/src/app.ts`

**Context:** SYSTEM_SETTINGS is a simple key-value table. It stores global configuration like the default locale and default theme for the application. The public endpoint (no auth) allows the login page to apply the correct theme/locale before the user is authenticated.

- [ ] **Step 1: Add the Prisma model**

  Add to `backend/prisma/schema.prisma`:

  ```prisma
  // ─── System Settings ────────────────────────────────────────────────────

  model SystemSetting {
    key       String   @id
    value     String
    updatedBy String?
    updatedAt DateTime @updatedAt

    @@map("system_settings")
  }
  ```

  Place it after the AuditLog model (at the end of the file).

- [ ] **Step 2: Run the migration**

  ```bash
  cd backend
  npx prisma migrate dev --name add_system_settings
  ```

  This creates the migration SQL file and applies it. Verify the `system_settings` table exists.

- [ ] **Step 3: Update seed file**

  Modify `backend/prisma/seed.ts` to upsert default system settings. Add after existing seed logic:

  ```typescript
  // Seed system settings
  const defaultSettings = [
    { key: 'default_locale', value: 'en-US' },
    { key: 'default_theme', value: 'system' },
  ]

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},  // do not overwrite if already set
      create: { key: setting.key, value: setting.value },
    })
  }
  ```

- [ ] **Step 4: Create SystemSettingsService**

  ```typescript
  // backend/src/services/SystemSettingsService.ts
  import { prisma } from '../infrastructure/database/prisma.js'

  export class SystemSettingsService {
    async getAll(): Promise<Record<string, string>> {
      const settings = await prisma.systemSetting.findMany()
      return Object.fromEntries(settings.map(s => [s.key, s.value]))
    }

    async get(key: string): Promise<string | null> {
      const setting = await prisma.systemSetting.findUnique({ where: { key } })
      return setting?.value ?? null
    }

    async set(key: string, value: string, updatedBy?: string): Promise<void> {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value, updatedBy },
        create: { key, value, updatedBy },
      })
    }

    async getPublic(): Promise<{ default_locale: string; default_theme: string }> {
      const settings = await this.getAll()
      return {
        default_locale: settings['default_locale'] ?? 'en-US',
        default_theme: settings['default_theme'] ?? 'system',
      }
    }
  }
  ```

- [ ] **Step 5: Create API routes**

  ```typescript
  // backend/src/interfaces/http/routes/settings.ts
  ```

  Define three endpoints:

  1. `GET /api/v1/settings/system/public` — **No authentication required.** Returns `{ default_locale, default_theme }`. Used by the login page and initial app load.

  2. `GET /api/v1/settings/system` — **Requires authentication + admin permission.** Returns all key-value pairs as an object.

  3. `PATCH /api/v1/settings/system` — **Requires authentication + admin permission.** Accepts `{ key: string, value: string }` in the body. Updates a single setting. Use `permissionGuard('system_settings', 'update')` as preHandler.

  Schema validation:
  - PATCH body: `{ type: 'object', required: ['key', 'value'], properties: { key: { type: 'string' }, value: { type: 'string' } } }`
  - Add `tags: ['Settings']` to all routes
  - For admin routes, add `security: [{ bearerAuth: [] }]`

- [ ] **Step 6: Register routes in app.ts**

  Add to `backend/src/app.ts`:

  ```typescript
  import { settingsRoutes } from './interfaces/http/routes/settings.js'
  // ...
  await app.register(settingsRoutes, { prefix: '/api/v1' })
  ```

- [ ] **Step 7: Verify with curl/REST client**

  ```bash
  # Public endpoint (no auth needed)
  curl http://localhost:3001/api/v1/settings/system/public
  # Expected: { "default_locale": "en-US", "default_theme": "system" }
  ```

**Verification:**
- Migration runs cleanly
- Seed inserts default settings
- Public endpoint returns default_locale and default_theme without auth
- Admin endpoints are protected (401 without token, 403 without admin permission)

---

## Task 3: API Client (Frontend)

**Files:**
- Create: `frontend/src/lib/api.ts`

**Context:** The frontend needs a typed fetch wrapper to communicate with the Fastify backend. The base URL comes from `NEXT_PUBLIC_API_URL` (e.g., `http://localhost:3001/api/v1`). Auth tokens are stored in localStorage and sent as `Authorization: Bearer <token>` headers.

- [ ] **Step 1: Create the API client**

  The client should export:

  ```typescript
  // frontend/src/lib/api.ts

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

  interface ApiError {
    status: number
    message: string
  }

  class ApiClient {
    private baseUrl: string
    private getToken: () => string | null

    constructor(baseUrl: string) {
      this.baseUrl = baseUrl
      this.getToken = () => {
        if (typeof window === 'undefined') return null
        return localStorage.getItem('access_token')
      }
    }

    private async request<T>(
      method: string,
      path: string,
      options?: { body?: unknown; headers?: Record<string, string>; noAuth?: boolean }
    ): Promise<T> {
      // Build headers: Content-Type, Authorization (if token exists and noAuth is not set)
      // Fetch from `${this.baseUrl}${path}`
      // If response is 401, attempt token refresh (call /auth/refresh)
      // If refresh succeeds, retry original request once
      // If refresh fails, clear tokens, redirect to /login
      // Parse JSON response
      // If !response.ok, throw ApiError
      // Return typed response
    }

    get<T>(path: string, opts?: { noAuth?: boolean }): Promise<T> { ... }
    post<T>(path: string, body: unknown, opts?: { noAuth?: boolean }): Promise<T> { ... }
    patch<T>(path: string, body: unknown): Promise<T> { ... }
    delete<T>(path: string): Promise<T> { ... }
  }

  export const api = new ApiClient(API_BASE)
  ```

- [ ] **Step 2: Add token refresh logic**

  When a 401 is received:
  1. Read `refresh_token` from localStorage
  2. POST to `/auth/refresh` with `{ refreshToken }`
  3. If successful, store new `access_token` and `refresh_token` in localStorage
  4. Retry the original request with the new token
  5. If refresh fails, clear both tokens and redirect to login page

  Use a mutex/flag to prevent multiple concurrent refresh attempts (race condition when multiple API calls fail simultaneously).

- [ ] **Step 3: Add public API helper**

  Export a convenience function for unauthenticated calls:

  ```typescript
  export async function fetchPublicSettings(): Promise<{ default_locale: string; default_theme: string }> {
    return api.get('/settings/system/public', { noAuth: true })
  }
  ```

- [ ] **Step 4: Type the profile response**

  ```typescript
  export interface UserProfile {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    themePreference: string | null
    forcePasswordChange: boolean
    role: { name: string; label: string; color: string | null }
  }

  export async function fetchProfile(): Promise<UserProfile> {
    return api.get<UserProfile>('/profile')
  }
  ```

**Verification:**
- File compiles with `npx tsc --noEmit`
- Token refresh logic handles 401 correctly (manual test or unit test)
- `fetchPublicSettings()` returns data from the backend

---

## Task 4: Layout Shell

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/[locale]/layout.tsx`
- Create: `frontend/src/app/[locale]/(auth)/layout.tsx`
- Create: `frontend/src/app/[locale]/(app)/layout.tsx`
- Create: `frontend/src/components/layout/AppShell.tsx`
- Create: `frontend/src/components/providers/AppProviders.tsx`

**Context:** The app uses Next.js route groups: `(auth)` for public pages (login, register, forgot-password) and `(app)` for authenticated pages (sidebar + header). The root `[locale]/layout.tsx` wraps both groups with i18n and theme providers. The `(app)/layout.tsx` wraps its children with `AppShell`.

> IMPORTANT: Read `node_modules/next/dist/docs/` for any changes to layout conventions, `metadata` API, or route group behavior in Next.js 16.

- [ ] **Step 1: Restructure root layout**

  `frontend/src/app/layout.tsx` should be minimal — just the `<html>` and `<body>` tags with `suppressHydrationWarning`. Remove the `Inter` font and ThemeProvider from here (they move to locale layout).

  ```tsx
  // frontend/src/app/layout.tsx
  import './globals.css'

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html suppressHydrationWarning>
        <body>{children}</body>
      </html>
    )
  }
  ```

  Note: The `lang` attribute on `<html>` will be set dynamically in the locale layout or via next-intl. Check Next.js 16 docs for the correct approach.

- [ ] **Step 2: Root page redirect**

  `frontend/src/app/page.tsx` should redirect to the default locale:

  ```tsx
  import { redirect } from 'next/navigation'
  export default function RootPage() {
    redirect('/en-US')
  }
  ```

- [ ] **Step 3: Create locale layout**

  `frontend/src/app/[locale]/layout.tsx` — this is where i18n, theme, and auth providers wrap the app:

  ```tsx
  import { NextIntlClientProvider } from 'next-intl'
  import { getMessages } from 'next-intl/server'
  import { AppProviders } from '@/components/providers/AppProviders'

  export default async function LocaleLayout({
    children,
    params,
  }: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
  }) {
    const { locale } = await params
    const messages = await getMessages()

    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AppProviders>
          {children}
        </AppProviders>
      </NextIntlClientProvider>
    )
  }
  ```

  Note: In Next.js 15+, `params` in layouts is a Promise. Check whether Next.js 16 changes this further.

- [ ] **Step 4: Create AppProviders wrapper**

  `frontend/src/components/providers/AppProviders.tsx` — composes ThemeProvider and AuthProvider:

  ```tsx
  'use client'
  import { ThemeProvider } from './ThemeProvider'
  import { AuthProvider } from './AuthProvider'

  export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    )
  }
  ```

- [ ] **Step 5: Create auth route group layout**

  `frontend/src/app/[locale]/(auth)/layout.tsx` — simple centered layout, no sidebar:

  ```tsx
  export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        {children}
      </div>
    )
  }
  ```

- [ ] **Step 6: Create app route group layout**

  `frontend/src/app/[locale]/(app)/layout.tsx` — uses AppShell:

  ```tsx
  import { AppShell } from '@/components/layout/AppShell'

  export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>
  }
  ```

- [ ] **Step 7: Create AppShell component**

  `frontend/src/components/layout/AppShell.tsx` — the main layout structure:

  ```tsx
  'use client'
  // Grid layout: sidebar (left, variable width) + main area (header + content)
  // Sidebar width: 256px expanded, 64px collapsed
  // On mobile (< 768px): sidebar hidden, Sheet overlay via MobileSidebar

  // Structure:
  // <div className="flex h-screen overflow-hidden">
  //   <Sidebar />            {/* desktop only, hidden on mobile */}
  //   <div className="flex flex-1 flex-col overflow-hidden">
  //     <Header />
  //     <main className="flex-1 overflow-auto p-6">
  //       {children}
  //     </main>
  //   </div>
  // </div>
  ```

  The component reads sidebar collapsed state from the `useSidebarState` hook. Pass `isCollapsed` and `onToggle` to both `Sidebar` and `Header`.

- [ ] **Step 8: Create placeholder pages**

  Create minimal placeholder pages for each route in the `(app)` group. Each should export a default component that renders a heading with the page name:

  ```tsx
  // Example: frontend/src/app/[locale]/(app)/dashboard/page.tsx
  export default function DashboardPage() {
    return <h1 className="text-2xl font-semibold">Dashboard</h1>
  }
  ```

  Create the following:
  - `(app)/dashboard/page.tsx`
  - `(app)/test-plans/page.tsx`
  - `(app)/test-cases/page.tsx`
  - `(app)/executions/page.tsx`
  - `(app)/bugs/page.tsx`
  - `(app)/reports/dashboard/page.tsx`
  - `(app)/reports/coverage/page.tsx`
  - `(app)/admin/users/page.tsx`
  - `(app)/admin/roles/page.tsx`
  - `(app)/admin/enums/page.tsx`
  - `(app)/admin/custom-fields/page.tsx`
  - `(app)/admin/integrations/page.tsx`
  - `(app)/admin/settings/page.tsx`

  Also create a placeholder login page:
  - `(auth)/login/page.tsx` — renders a "Login" heading (the actual login form is a later plan)

- [ ] **Step 9: Update [locale]/page.tsx**

  The locale root page should redirect to the dashboard:

  ```tsx
  import { redirect } from 'next/navigation'
  export default function LocaleRootPage() {
    redirect('dashboard')
  }
  ```

**Verification:**
- Navigating to `/` redirects to `/en-US`
- Navigating to `/en-US` redirects to `/en-US/dashboard`
- The `(app)` routes render inside the AppShell (sidebar + header visible)
- The `(auth)` routes render centered, no sidebar
- No hydration warnings in the browser console

---

## Task 5: Sidebar Component

**Files:**
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/SidebarNav.tsx`
- Create: `frontend/src/lib/navigation.ts`
- Create: `frontend/src/hooks/useSidebarState.ts`

**Context:** The sidebar is a fixed panel on the left. It collapses to icon-only mode (64px wide). The collapsed state is persisted in `localStorage`. On mobile (<768px), the sidebar is not rendered in the DOM — instead `MobileSidebar` (Task 6) renders a `Sheet` overlay.

- [ ] **Step 1: Define navigation configuration**

  ```typescript
  // frontend/src/lib/navigation.ts
  import {
    LayoutDashboard, ClipboardList, FileText, Play, Bug,
    BarChart3, PieChart, Users, Shield, List,
    FormInput, Plug, Settings,
  } from 'lucide-react'

  export interface NavItem {
    titleKey: string        // i18n message key, e.g. 'nav.dashboard'
    href: string
    icon: LucideIcon
  }

  export interface NavSection {
    titleKey?: string       // optional section header
    items: NavItem[]
    adminOnly?: boolean     // collapse entire section for non-admins
    collapsible?: boolean   // can the section be collapsed
  }

  export const sidebarNavigation: NavSection[] = [
    {
      items: [
        { titleKey: 'nav.dashboard',  href: '/dashboard',   icon: LayoutDashboard },
        { titleKey: 'nav.testPlans',  href: '/test-plans',  icon: ClipboardList },
        { titleKey: 'nav.testCases',  href: '/test-cases',  icon: FileText },
        { titleKey: 'nav.executions', href: '/executions',  icon: Play },
        { titleKey: 'nav.bugs',       href: '/bugs',        icon: Bug },
      ],
    },
    {
      titleKey: 'nav.reports',
      items: [
        { titleKey: 'nav.reportsDashboard', href: '/reports/dashboard', icon: BarChart3 },
        { titleKey: 'nav.reportsCoverage',  href: '/reports/coverage',  icon: PieChart },
      ],
    },
    {
      titleKey: 'nav.admin',
      adminOnly: true,
      collapsible: true,
      items: [
        { titleKey: 'nav.users',           href: '/admin/users',          icon: Users },
        { titleKey: 'nav.roles',           href: '/admin/roles',          icon: Shield },
        { titleKey: 'nav.enums',           href: '/admin/enums',          icon: List },
        { titleKey: 'nav.customFields',    href: '/admin/custom-fields',  icon: FormInput },
        { titleKey: 'nav.integrations',    href: '/admin/integrations',   icon: Plug },
        { titleKey: 'nav.systemSettings',  href: '/admin/settings',       icon: Settings },
      ],
    },
  ]
  ```

- [ ] **Step 2: Create useSidebarState hook**

  ```typescript
  // frontend/src/hooks/useSidebarState.ts
  'use client'
  import { useState, useEffect, useCallback } from 'react'

  const STORAGE_KEY = 'sidebar-collapsed'

  export function useSidebarState() {
    const [isCollapsed, setIsCollapsed] = useState(false)

    useEffect(() => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setIsCollapsed(stored === 'true')
    }, [])

    const toggle = useCallback(() => {
      setIsCollapsed(prev => {
        const next = !prev
        localStorage.setItem(STORAGE_KEY, String(next))
        return next
      })
    }, [])

    return { isCollapsed, toggle }
  }
  ```

- [ ] **Step 3: Create Sidebar component**

  `frontend/src/components/layout/Sidebar.tsx`:

  Structure:
  ```
  <aside> (w-64 or w-16 depending on isCollapsed, transition-all duration-300)
    <div> Logo area
      - Expanded: app icon + "TestTool" text
      - Collapsed: app icon only
      - Clicking the logo navigates to /dashboard
    </div>
    <Separator />
    <div> Project selector (placeholder)
      - Expanded: dropdown showing "Select Project"
      - Collapsed: folder icon only
    </div>
    <Separator />
    <ScrollArea className="flex-1">
      <SidebarNav sections={sidebarNavigation} isCollapsed={isCollapsed} />
    </ScrollArea>
    <Separator />
    <div> Collapse toggle button at bottom
      - ChevronLeft icon when expanded, ChevronRight when collapsed
    </div>
  </aside>
  ```

  Props: `isCollapsed: boolean`, `onToggle: () => void`

  Use `hidden md:flex` to hide on mobile (mobile uses Sheet instead).

- [ ] **Step 4: Create SidebarNav component**

  `frontend/src/components/layout/SidebarNav.tsx`:

  - Iterates over `NavSection[]`
  - Renders optional section title (hidden when collapsed)
  - Each `NavItem` is a link (`next/link`) with:
    - Lucide icon (always visible)
    - Text label (hidden when collapsed)
    - Active state: compare `pathname` (from `usePathname()`) with item `href`
    - Active style: `bg-accent text-accent-foreground` or similar
    - Hover style: `hover:bg-accent/50`
  - When collapsed, wrap each icon in a `Tooltip` showing the item name
  - For `collapsible` sections, use a collapsible section with a chevron toggle
  - For `adminOnly` sections, check user role from auth context; hide if not admin

  The `href` values in navigation config are relative (no locale prefix). Prepend the current locale when rendering links. Use `useLocale()` from next-intl.

- [ ] **Step 5: Handle active route detection**

  ```typescript
  import { usePathname } from 'next/navigation'
  import { useLocale } from 'next-intl'

  // Inside SidebarNav:
  const pathname = usePathname()
  const locale = useLocale()

  function isActive(href: string): boolean {
    const fullHref = `/${locale}${href}`
    return pathname === fullHref || pathname.startsWith(`${fullHref}/`)
  }
  ```

**Verification:**
- Sidebar renders with all navigation sections
- Clicking the collapse button toggles between full and icon-only mode
- Collapsed state persists across page reloads (localStorage)
- Active route is visually highlighted
- Tooltips appear on icons when sidebar is collapsed
- Admin section is only visible for admin-role users

---

## Task 6: Header Component

**Files:**
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/Breadcrumbs.tsx`
- Create: `frontend/src/components/layout/ProfileDropdown.tsx`
- Create: `frontend/src/components/layout/MobileSidebar.tsx`

- [ ] **Step 1: Create Header component**

  `frontend/src/components/layout/Header.tsx`:

  ```
  <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
    <MobileSidebarTrigger />   {/* visible only on mobile: Menu icon button */}
    <Breadcrumbs />            {/* left side, flex-1 */}
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <ProfileDropdown />
    </div>
  </header>
  ```

  The `MobileSidebarTrigger` is a `Button` with `variant="ghost"` and `size="icon"` that opens the `Sheet`. It is hidden on `md:` breakpoint and above.

- [ ] **Step 2: Create Breadcrumbs component**

  `frontend/src/components/layout/Breadcrumbs.tsx`:

  Auto-generate breadcrumbs from the current route path using `usePathname()`:

  ```typescript
  // Example: pathname = "/en-US/admin/users"
  // Segments: ["admin", "users"]
  // Breadcrumbs: Home > Admin > Users

  // Map segment to display name using i18n:
  // Use a lookup like `t(`breadcrumbs.${segment}`)` with fallback to capitalized segment
  ```

  Use the shadcn/ui `Breadcrumb` components:
  - `<Breadcrumb>` wrapper
  - `<BreadcrumbList>` ordered list
  - `<BreadcrumbItem>` each crumb
  - `<BreadcrumbLink>` clickable crumbs (all except last)
  - `<BreadcrumbPage>` current page (last item, not clickable)
  - `<BreadcrumbSeparator>` between items

  Each breadcrumb link navigates to the corresponding path prefix.

- [ ] **Step 3: Create ProfileDropdown component**

  `frontend/src/components/layout/ProfileDropdown.tsx`:

  ```
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl} alt={user.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>
        <div className="flex flex-col">
          <span>{user.name}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem> My Profile </DropdownMenuItem>
      <DropdownMenuItem> Change Password </DropdownMenuItem>
      <DropdownMenuItem> My Integrations </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem> Logout </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  ```

  - User data comes from auth context (`useAuth()` hook)
  - "Logout" calls `api.post('/auth/logout', { refreshToken })`, clears tokens from localStorage, and redirects to `/login`
  - All labels use i18n translation keys
  - Compute initials from `user.name` (first letter of first and last name) or fallback to first letter of email

- [ ] **Step 4: Create MobileSidebar component**

  `frontend/src/components/layout/MobileSidebar.tsx`:

  Uses shadcn/ui `Sheet` (which wraps Radix Dialog):

  ```tsx
  'use client'
  import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
  import { Button } from '@/components/ui/button'
  import { Menu } from 'lucide-react'
  import { Sidebar } from './Sidebar'

  export function MobileSidebar() {
    const [open, setOpen] = useState(false)

    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar isCollapsed={false} onToggle={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    )
  }
  ```

  Close the sheet when any nav item is clicked (pass `onNavigate={() => setOpen(false)}` to Sidebar/SidebarNav).

**Verification:**
- Header displays breadcrumbs on the left and profile dropdown on the right
- Breadcrumbs update when navigating between routes
- Profile dropdown shows user info and all menu items
- Logout clears tokens and redirects to login
- On mobile (< 768px), hamburger menu button appears
- Clicking hamburger opens sidebar as a Sheet overlay
- Clicking a nav item in the mobile sidebar closes the sheet

---

## Task 7: Theme System Enhancement

**Files:**
- Modify: `frontend/src/components/providers/ThemeProvider.tsx`
- Create: `frontend/src/components/layout/ThemeToggle.tsx`

**Context:** The existing ThemeProvider uses next-themes. We need to enhance it to load the default theme from SYSTEM_SETTINGS (for unauthenticated users) and from the user profile (for authenticated users). The theme toggle cycles through light/dark/system.

- [ ] **Step 1: Create ThemeToggle component**

  `frontend/src/components/layout/ThemeToggle.tsx`:

  ```tsx
  'use client'
  import { useTheme } from 'next-themes'
  import { Sun, Moon, Monitor } from 'lucide-react'
  import { Button } from '@/components/ui/button'
  import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu'

  export function ThemeToggle() {
    const { setTheme, theme } = useTheme()

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" /> Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" /> Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" /> System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
  ```

  Use i18n for the labels ("Light", "Dark", "System").

- [ ] **Step 2: Enhance ThemeProvider to load defaults**

  Modify `frontend/src/components/providers/ThemeProvider.tsx`:

  The provider should:
  1. On initial mount (before user is authenticated), fetch `fetchPublicSettings()` to get `default_theme`
  2. Pass `defaultTheme` to `NextThemesProvider`
  3. When the user logs in (auth context updates), check `user.themePreference`
  4. If user has a theme preference, call `setTheme(user.themePreference)` via next-themes
  5. If user has no preference, keep the system default

  Implementation approach:
  - Keep the existing ThemeProvider mostly as-is (it wraps NextThemesProvider)
  - The theme-from-user-profile logic happens in AuthProvider or AppShell: when user profile loads, call `setTheme(user.themePreference)` if set
  - The default theme from SYSTEM_SETTINGS can be fetched server-side in the locale layout and passed as a prop

- [ ] **Step 3: Persist theme changes to user profile**

  When an authenticated user changes the theme via ThemeToggle, also save to their profile:

  ```typescript
  // In ThemeToggle or a wrapper:
  const { user } = useAuth()

  function handleThemeChange(newTheme: string) {
    setTheme(newTheme)
    if (user) {
      api.patch('/profile', { themePreference: newTheme }).catch(console.error)
    }
  }
  ```

  This is fire-and-forget — do not block the UI on the API call.

**Verification:**
- Theme toggle button appears in the header
- Clicking Light/Dark/System applies the theme immediately
- Refreshing the page retains the selected theme (next-themes stores in localStorage)
- When a logged-in user changes theme, the backend profile is updated
- When loading without a user (login page), the system default from SYSTEM_SETTINGS is applied

---

## Task 8: i18n Enhancement

**Files:**
- Modify: `frontend/src/messages/en-US.json`
- Modify: `frontend/src/messages/pt-BR.json`
- Modify: `frontend/src/middleware.ts`
- Modify: `frontend/src/i18n.ts`
- Create: `frontend/src/lib/formatters.ts`

**Context:** The current i18n setup is minimal. We need to add all navigation and layout translation keys, create locale-aware formatters for numbers and dates, and update the locale detection flow.

- [ ] **Step 1: Expand message files**

  Add the following key sections to both `en-US.json` and `pt-BR.json`:

  ```json
  {
    "common": { /* existing + additions */ },
    "auth": { /* existing */ },
    "nav": {
      "dashboard": "Dashboard",
      "testPlans": "Test Plans",
      "testCases": "Test Cases",
      "executions": "Executions",
      "bugs": "Bugs",
      "reports": "Reports",
      "reportsDashboard": "Dashboard",
      "reportsCoverage": "Coverage",
      "admin": "Administration",
      "users": "Users",
      "roles": "Roles",
      "enums": "Enumerations",
      "customFields": "Custom Fields",
      "integrations": "Integrations",
      "systemSettings": "System Settings",
      "projects": "Projects",
      "settings": "Settings",
      "profile": "Profile"
    },
    "layout": {
      "appName": "TestTool",
      "selectProject": "Select Project",
      "collapseSidebar": "Collapse sidebar",
      "expandSidebar": "Expand sidebar"
    },
    "profile": {
      "myProfile": "My Profile",
      "changePassword": "Change Password",
      "myIntegrations": "My Integrations",
      "logout": "Logout"
    },
    "theme": {
      "toggle": "Toggle theme",
      "light": "Light",
      "dark": "Dark",
      "system": "System"
    },
    "breadcrumbs": {
      "home": "Home",
      "dashboard": "Dashboard",
      "testPlans": "Test Plans",
      "testCases": "Test Cases",
      "executions": "Executions",
      "bugs": "Bugs",
      "reports": "Reports",
      "coverage": "Coverage",
      "admin": "Administration",
      "users": "Users",
      "roles": "Roles",
      "enums": "Enumerations",
      "customFields": "Custom Fields",
      "integrations": "Integrations",
      "settings": "Settings"
    }
  }
  ```

  Provide the equivalent Portuguese translations in `pt-BR.json`. Examples:
  - "Test Plans" -> "Planos de Teste"
  - "Test Cases" -> "Casos de Teste"
  - "Executions" -> "Execucoes"
  - "Bugs" -> "Bugs"
  - "Coverage" -> "Cobertura"
  - "Administration" -> "Administracao"
  - "Custom Fields" -> "Campos Personalizados"
  - "System Settings" -> "Configuracoes do Sistema"

  Use proper Portuguese accents in the actual file (UTF-8): Execucoes -> Execucoes with tilde, Administracao -> Administracao with tilde, etc.

- [ ] **Step 2: Create formatters utility**

  ```typescript
  // frontend/src/lib/formatters.ts

  export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(locale, options).format(value)
  }

  export function formatDecimal(value: number, locale: string, decimals = 2): string {
    return formatNumber(value, locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  export function formatPercent(value: number, locale: string, decimals = 1): string {
    return formatNumber(value / 100, locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  export function formatDate(date: Date | string, locale: string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(locale, options ?? {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
  }

  export function formatDateTime(date: Date | string, locale: string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  export function formatRelativeTime(date: Date | string, locale: string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

    if (diffDay > 0) return rtf.format(-diffDay, 'day')
    if (diffHr > 0) return rtf.format(-diffHr, 'hour')
    if (diffMin > 0) return rtf.format(-diffMin, 'minute')
    return rtf.format(-diffSec, 'second')
  }
  ```

- [ ] **Step 3: Update locale detection in middleware**

  Modify `frontend/src/middleware.ts` to support locale detection priority:

  1. URL path locale (already handled by next-intl)
  2. Cookie `NEXT_LOCALE` (set when user changes locale)
  3. `Accept-Language` header (browser default)
  4. System default from SYSTEM_SETTINGS (fallback)

  The system default cannot be fetched in middleware (it would require an API call on every request). Instead, set the fallback `defaultLocale` to `'en-US'` and let the client-side code adjust once the user profile or system settings load.

  ```typescript
  import createMiddleware from 'next-intl/middleware'

  export default createMiddleware({
    locales: ['pt-BR', 'en-US'],
    defaultLocale: 'en-US',
    localeDetection: true,    // respect Accept-Language header
    localePrefix: 'always',   // always include locale in URL
  })

  export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)'],
  }
  ```

  Check next-intl v4 docs for exact config options — some may have changed.

- [ ] **Step 4: Ensure all hardcoded strings use translation keys**

  Audit all components created in Tasks 4-7 and replace any hardcoded English strings with `useTranslations()` calls:

  ```tsx
  import { useTranslations } from 'next-intl'

  function Sidebar() {
    const t = useTranslations('layout')
    // Use t('appName'), t('selectProject'), t('collapseSidebar'), etc.
  }
  ```

**Verification:**
- All navigation items display in the correct language
- Switching locale (manually changing URL from `/en-US/...` to `/pt-BR/...`) updates all text
- `formatDate('2026-03-24', 'pt-BR')` returns "24/03/2026"
- `formatDate('2026-03-24', 'en-US')` returns "03/24/2026"
- `formatNumber(1234.56, 'pt-BR')` returns "1.234,56"
- `formatNumber(1234.56, 'en-US')` returns "1,234.56"
- No hardcoded English strings remain in layout components

---

## Task 9: Auth Context + Route Protection

**Files:**
- Create: `frontend/src/components/providers/AuthProvider.tsx`
- Create: `frontend/src/hooks/useAuth.ts`

**Context:** The auth context manages the current user's session. On mount, it checks for a stored token, validates it by fetching the profile, and provides user data to the rest of the app. Protected routes redirect unauthenticated users to the login page.

- [ ] **Step 1: Define auth types**

  ```typescript
  // In AuthProvider.tsx or a separate types file
  interface AuthUser {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    themePreference: string | null
    forcePasswordChange: boolean
    role: { name: string; label: string; color: string | null }
  }

  interface AuthContextType {
    user: AuthUser | null
    isAuthenticated: boolean
    isLoading: boolean           // true while checking token on mount
    login: (accessToken: string, refreshToken: string) => Promise<void>
    logout: () => Promise<void>
    updateUser: (data: Partial<AuthUser>) => void
  }
  ```

- [ ] **Step 2: Create AuthProvider**

  `frontend/src/components/providers/AuthProvider.tsx`:

  ```tsx
  'use client'
  import { createContext, useState, useEffect, useCallback } from 'react'
  import { useRouter, usePathname } from 'next/navigation'
  import { useLocale } from 'next-intl'
  import { api, fetchProfile } from '@/lib/api'
  import { useTheme } from 'next-themes'

  const AuthContext = createContext<AuthContextType | undefined>(undefined)

  const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password']

  export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()
    const locale = useLocale()
    const { setTheme } = useTheme()

    // Check if current path is public (strip locale prefix before comparing)
    const isPublicPath = PUBLIC_PATHS.some(p => pathname.endsWith(p))

    useEffect(() => {
      async function init() {
        const token = localStorage.getItem('access_token')
        if (!token) {
          setIsLoading(false)
          if (!isPublicPath) {
            router.replace(`/${locale}/login`)
          }
          return
        }

        try {
          const profile = await fetchProfile()
          setUser(profile)

          // Apply user's theme preference if set
          if (profile.themePreference) {
            setTheme(profile.themePreference)
          }

          // If on a public path while authenticated, redirect to dashboard
          if (isPublicPath) {
            router.replace(`/${locale}/dashboard`)
          }
        } catch {
          // Token invalid/expired — refresh will be attempted by api client
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          if (!isPublicPath) {
            router.replace(`/${locale}/login`)
          }
        } finally {
          setIsLoading(false)
        }
      }

      init()
    }, []) // Run once on mount

    const login = useCallback(async (accessToken: string, refreshToken: string) => {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      const profile = await fetchProfile()
      setUser(profile)
      if (profile.themePreference) {
        setTheme(profile.themePreference)
      }
      router.replace(`/${locale}/dashboard`)
    }, [locale, router, setTheme])

    const logout = useCallback(async () => {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {})
      }
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
      router.replace(`/${locale}/login`)
    }, [locale, router])

    const updateUser = useCallback((data: Partial<AuthUser>) => {
      setUser(prev => prev ? { ...prev, ...data } : null)
    }, [])

    return (
      <AuthContext.Provider value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  export { AuthContext }
  ```

- [ ] **Step 3: Create useAuth hook**

  ```typescript
  // frontend/src/hooks/useAuth.ts
  'use client'
  import { useContext } from 'react'
  import { AuthContext } from '@/components/providers/AuthProvider'

  export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
      throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
  }
  ```

- [ ] **Step 4: Add loading state to AppShell**

  While `isLoading` is true in the auth context, `AppShell` should show a loading skeleton instead of the actual content. This prevents a flash of unauthenticated content.

  ```tsx
  // In AppShell.tsx:
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
        {/* Or a spinner/loading animation */}
      </div>
    )
  }
  ```

- [ ] **Step 5: Protect the (app) layout**

  The `(app)/layout.tsx` already uses AppShell, which uses useAuth. The AuthProvider handles the redirect. But add an explicit check — if `!isAuthenticated && !isLoading`, render nothing (the redirect is already in progress):

  ```tsx
  // In AppShell:
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <LoadingSkeleton />
  if (!isAuthenticated) return null  // redirect is happening
  ```

- [ ] **Step 6: Handle forcePasswordChange**

  If `user.forcePasswordChange` is true after login, redirect to a change-password page instead of the dashboard. For now, redirect to `/login` with a query param or a dedicated route (placeholder). Add a TODO comment noting this needs a dedicated change-password page.

**Verification:**
- Unauthenticated users visiting `/en-US/dashboard` are redirected to `/en-US/login`
- Authenticated users visiting `/en-US/login` are redirected to `/en-US/dashboard`
- After login, user data is available via `useAuth()` throughout the app
- After logout, tokens are cleared and user is redirected to login
- Loading skeleton displays briefly while token is being validated
- Browser refresh preserves authentication state (token in localStorage)

---

## Task 10: Commit + Verification

**Files:** None (verification only)

This task is a comprehensive check that everything from Tasks 1-9 integrates correctly.

- [ ] **Step 1: Build check**

  ```bash
  cd frontend && npm run build
  ```

  Must complete with no errors. Warnings about missing pages are acceptable (some pages are placeholder).

- [ ] **Step 2: Backend build check**

  ```bash
  cd backend && npm run build
  ```

  Must pass. New Prisma model, service, and routes compile correctly.

- [ ] **Step 3: TypeScript check (frontend)**

  ```bash
  cd frontend && npx tsc --noEmit
  ```

  No type errors.

- [ ] **Step 4: Seed database**

  ```bash
  cd backend && npx prisma db seed
  ```

  Verify system_settings table has `default_locale` and `default_theme` rows.

- [ ] **Step 5: Manual smoke test — layout**

  1. Start backend (`npm run dev` in backend/)
  2. Start frontend (`npm run dev` in frontend/)
  3. Navigate to `http://localhost:3000`
  4. Should redirect to `/en-US/login` (or `/en-US/dashboard` if tokens exist)
  5. Verify login page renders centered, no sidebar

- [ ] **Step 6: Manual smoke test — authenticated shell**

  1. Log in (via API or seed user)
  2. Verify sidebar appears on the left with all navigation sections
  3. Click sidebar collapse button — sidebar shrinks to icons only
  4. Refresh page — sidebar stays collapsed (localStorage)
  5. Click expand — sidebar returns to full width

- [ ] **Step 7: Manual smoke test — mobile**

  1. Resize browser to < 768px width (or use DevTools mobile view)
  2. Sidebar should disappear
  3. Hamburger menu button appears in header
  4. Click hamburger — Sheet overlay opens with full sidebar
  5. Click a nav item — Sheet closes, page navigates

- [ ] **Step 8: Manual smoke test — theme**

  1. Click theme toggle in header
  2. Select "Dark" — page switches to dark theme
  3. Select "Light" — page switches to light theme
  4. Select "System" — follows OS preference
  5. Refresh — theme persists

- [ ] **Step 9: Manual smoke test — i18n**

  1. Navigate to `/pt-BR/dashboard`
  2. All navigation labels should be in Portuguese
  3. Navigate to `/en-US/dashboard`
  4. All navigation labels should be in English
  5. Breadcrumbs should also be translated

- [ ] **Step 10: Manual smoke test — API settings**

  ```bash
  curl http://localhost:3001/api/v1/settings/system/public
  ```

  Expected: `{"default_locale":"en-US","default_theme":"system"}`

- [ ] **Step 11: Verify route protection**

  1. Clear localStorage (remove tokens)
  2. Navigate to `/en-US/dashboard`
  3. Should redirect to `/en-US/login`
  4. Navigate to `/en-US/admin/settings`
  5. Should also redirect to `/en-US/login`

- [ ] **Step 12: Commit**

  Stage all new and modified files. Commit with a message like:

  ```
  feat(frontend): add layout shell, sidebar, theme, i18n, shadcn/ui setup

  - Install and configure shadcn/ui with Tailwind CSS v4
  - Add SYSTEM_SETTINGS backend (Prisma model, API routes, seed)
  - Create typed API client with token refresh
  - Build AppShell with collapsible sidebar and responsive mobile Sheet
  - Add header with breadcrumbs, theme toggle, and profile dropdown
  - Enhance theme system to load from SYSTEM_SETTINGS and user profile
  - Expand i18n with navigation keys, formatters, and locale detection
  - Add AuthProvider with route protection and token management
  - Create placeholder pages for all main routes
  ```
