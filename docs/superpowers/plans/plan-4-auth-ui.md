# Plan 4 -- Auth UI: Login, Register, OAuth, Password Reset, Route Protection

**Goal:** Implement the full authentication UI -- login form, registration form, OAuth buttons, password reset flow, and protected routes. Users can log in and access the authenticated app shell from Plan 3.

**Dependencies:** Plan 2 (auth backend) and Plan 3 (frontend core) must be complete.

**Prerequisites:** Next.js 16.2, React 19, shadcn/ui, Tailwind CSS 4, next-intl, next-themes

---

## File Map

```
frontend/
  src/
    app/
      [locale]/
        (auth)/
          login/page.tsx           -- Login page
          register/page.tsx       -- Registration page
          forgot-password/page.tsx -- Forgot password page
          reset-password/page.tsx -- Reset password page (token in URL)
        (app)/
          dashboard/page.tsx       -- Modify: add actual dashboard content
    components/
      auth/
        LoginForm.tsx            -- Login form component
        RegisterForm.tsx         -- Registration form component
        OAuthButtons.tsx         -- GitHub/Google/Microsoft OAuth buttons
        ForgotPasswordForm.tsx   -- Forgot password form
        ResetPasswordForm.tsx    -- Reset password form
        AuthCard.tsx            -- Shared card wrapper for auth forms
        PasswordInput.tsx        -- Password input with show/hide toggle
    hooks/
      useAuth.ts                -- Modify: add login/logout/register methods
    lib/
      api.ts                    -- Modify: add auth API methods
    messages/
      en-US.json               -- Modify: add auth translation keys
      pt-BR.json               -- Modify: add auth translation keys
```

---

## Task 1: Auth API Methods

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add auth API methods**

  Add the following methods to the ApiClient class:

  ```typescript
  // Login
  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: UserProfile }> {
    return this.post('/auth/login', { email, password }, { noAuth: true })
  }

  // Register
  async register(data: { email: string; password: string; name?: string }): Promise<{ accessToken: string; refreshToken: string; user: UserProfile }> {
    return this.post('/auth/register', data, { noAuth: true })
  }

  // Logout
  async logout(refreshToken: string): Promise<void> {
    return this.post('/auth/logout', { refreshToken })
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ success: boolean }> {
    return this.post('/auth/forgot-password', { email }, { noAuth: true })
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    return this.post('/auth/reset-password', { token, newPassword }, { noAuth: true })
  }

  // Change password (authenticated)
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return this.patch('/auth/change-password', { currentPassword, newPassword })
  }
  ```

- [ ] **Step 2: Update types**

  ```typescript
  export interface LoginResponse {
    accessToken: string
    refreshToken: string
    user: UserProfile
  }

  export interface RegisterData {
    email: string
    password: string
    name?: string
  }
  ```

---

## Task 2: Translation Keys

**Files:**
- Modify: `frontend/src/messages/en-US.json`
- Modify: `frontend/src/messages/pt-BR.json`

- [ ] **Add auth translation keys**

  ```json
  {
    "auth": {
      "login": {
        "title": "Sign in",
        "subtitle": "Enter your credentials to access your account",
        "email": "Email address",
        "password": "Password",
        "rememberMe": "Remember me",
        "forgotPassword": "Forgot your password?",
        "submit": "Sign in",
        "noAccount": "Don't have an account?",
        "signUp": "Sign up",
        "invalidCredentials": "Invalid email or password",
        "accountLocked": "Account temporarily locked due to too many failed attempts",
        "success": "Welcome back!"
      },
      "register": {
        "title": "Create an account",
        "subtitle": "Enter your details to get started",
        "name": "Full name",
        "email": "Email address",
        "password": "Password",
        "confirmPassword": "Confirm password",
        "termsAgree": "I agree to the",
        "termsOfService": "Terms of Service",
        "submit": "Create account",
        "hasAccount": "Already have an account?",
        "signIn": "Sign in",
        "passwordMismatch": "Passwords do not match",
        "emailTaken": "An account with this email already exists",
        "success": "Account created successfully!"
      },
      "forgotPassword": {
        "title": "Forgot password?",
        "subtitle": "Enter your email and we'll send you a reset link",
        "email": "Email address",
        "submit": "Send reset link",
        "backToLogin": "Back to sign in",
        "success": "If an account exists with this email, a reset link has been sent",
        "error": "Unable to send reset email. Please try again."
      },
      "resetPassword": {
        "title": "Reset your password",
        "subtitle": "Create a new password for your account",
        "password": "New password",
        "confirmPassword": "Confirm new password",
        "submit": "Reset password",
        "success": "Password reset successfully. You can now sign in.",
        "expired": "This reset link has expired. Please request a new one.",
        "invalid": "This reset link is invalid."
      },
      "oauth": {
        "orContinueWith": "Or continue with",
        "github": "Continue with GitHub",
        "google": "Continue with Google",
        "microsoft": "Continue with Microsoft"
      },
      "passwordPolicy": {
        "minLength": "At least {min} characters",
        "requireUppercase": "At least one uppercase letter",
        "requireLowercase": "At least one lowercase letter",
        "requireNumber": "At least one number",
        "requireSymbol": "At least one special character"
      },
      "validation": {
        "required": "This field is required",
        "invalidEmail": "Please enter a valid email address",
        "passwordTooShort": "Password must be at least {min} characters"
      }
    }
  }
  ```

---

## Task 3: Auth Card Component

**Files:**
- Create: `frontend/src/components/auth/AuthCard.tsx`

- [ ] **Create shared card wrapper**

  ```tsx
  'use client'
  import { useTranslations } from 'next-intl'
  import { Shield } from 'lucide-react'

  interface AuthCardProps {
    children: React.ReactNode
    titleKey: string
    subtitleKey: string
  }

  export function AuthCard({ children, titleKey, subtitleKey }: AuthCardProps) {
    const t = useTranslations('auth')

    return (
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t(titleKey)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(subtitleKey)}
          </p>
        </div>
        {children}
      </div>
    )
  }
  ```

---

## Task 4: Password Input Component

**Files:**
- Create: `frontend/src/components/auth/PasswordInput.tsx`

- [ ] **Create password input with show/hide toggle**

  ```tsx
  'use client'
  import { useState } from 'react'
  import { Eye, EyeOff } from 'lucide-react'
  import { Input } from '@/components/ui/input'
  import { Button } from '@/components/ui/button'

  interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string
  }

  export function PasswordInput({ className, error, ...props }: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={className}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="sr-only">
            {showPassword ? 'Hide password' : 'Show password'}
          </span>
        </Button>
        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
  ```

---

## Task 5: OAuth Buttons Component

**Files:**
- Create: `frontend/src/components/auth/OAuthButtons.tsx`

- [ ] **Create OAuth provider buttons**

  ```tsx
  'use client'
  import { useTranslations } from 'next-intl'
  import { useRouter } from 'next/navigation'
  import { Button } from '@/components/ui/button'
  import { Separator } from '@/components/ui/separator'
  import { Github, Chrome, Windows } from 'lucide-react'

  interface OAuthButtonsProps {
    onProviderClick: (provider: 'github' | 'google' | 'microsoft') => void
    isLoading?: boolean
  }

  export function OAuthButtons({ onProviderClick, isLoading }: OAuthButtonsProps) {
    const t = useTranslations('auth.oauth')

    return (
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t('orContinueWith')}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          <Button
            variant="outline"
            onClick={() => onProviderClick('github')}
            disabled={isLoading}
          >
            <Github className="mr-2 h-4 w-4" />
            {t('github')}
          </Button>

          <Button
            variant="outline"
            onClick={() => onProviderClick('google')}
            disabled={isLoading}
          >
            <Chrome className="mr-2 h-4 w-4" />
            {t('google')}
          </Button>

          <Button
            variant="outline"
            onClick={() => onProviderClick('microsoft')}
            disabled={isLoading}
          >
            <Windows className="mr-2 h-4 w-4" />
            {t('microsoft')}
          </Button>
        </div>
      </div>
    )
  }
  ```

---

## Task 6: Login Page

**Files:**
- Modify: `frontend/src/app/[locale]/(auth)/login/page.tsx`

- [ ] **Create login form**

  ```tsx
  'use client'
  import { useState } from 'react'
  import { useTranslations } from 'next-intl'
  import { useRouter } from 'next/navigation'
  import { useAuth } from '@/hooks/useAuth'
  import { AuthCard } from '@/components/auth/AuthCard'
  import { LoginForm } from '@/components/auth/LoginForm'
  import { OAuthButtons } from '@/components/auth/OAuthButtons'

  export default function LoginPage() {
    const t = useTranslations('auth.login')
    const router = useRouter()
    const { login } = useAuth()
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(data: { email: string; password: string }) {
      setIsLoading(true)
      try {
        const response = await api.login(data.email, data.password)
        await login(response.accessToken, response.refreshToken)
        router.push('/dashboard')
      } catch (error) {
        // Error is handled by the form
      } finally {
        setIsLoading(false)
      }
    }

    function handleOAuth(provider: 'github' | 'google' | 'microsoft') {
      // Redirect to backend OAuth endpoint
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/${provider}`
    }

    return (
      <AuthCard titleKey="login.title" subtitleKey="login.subtitle">
        <LoginForm onSubmit={handleSubmit} isLoading={isLoading} />
        <OAuthButtons onProviderClick={handleOAuth} isLoading={isLoading} />
      </AuthCard>
    )
  }
  ```

- [ ] **Create LoginForm component**

  ```tsx
  // frontend/src/components/auth/LoginForm.tsx
  'use client'
  import { useTranslations } from 'next-intl'
  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { z } from 'zod'
  import { Button } from '@/components/ui/button'
  import { Input } from '@/components/ui/input'
  import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
  import Link from 'next/link'

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })

  type LoginData = z.infer<typeof loginSchema>

  interface LoginFormProps {
    onSubmit: (data: LoginData) => Promise<void>
    isLoading: boolean
  }

  export function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
    const t = useTranslations('auth.login')
    const tVal = useTranslations('auth.validation')

    const form = useForm<LoginData>({
      resolver: zodResolver(loginSchema),
      defaultValues: { email: '', password: '' },
    })

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('email')}</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('password')}</FormLabel>
                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : t('submit')}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('signUp')}
            </Link>
          </p>
        </form>
      </Form>
    )
  }
  ```

---

## Task 7: Register Page

**Files:**
- Create: `frontend/src/app/[locale]/(auth)/register/page.tsx`
- Create: `frontend/src/components/auth/RegisterForm.tsx`

- [ ] **Create registration form and page**

  Follow the same pattern as LoginForm but include:
  - Name field
  - Confirm password field
  - Password strength indicator
  - Terms checkbox

---

## Task 8: Forgot Password Page

**Files:**
- Create: `frontend/src/app/[locale]/(auth)/forgot-password/page.tsx`
- Create: `frontend/src/components/auth/ForgotPasswordForm.tsx`

- [ ] **Create forgot password form**

  - Email input
  - Submit button
  - Success/error message display
  - Link back to login

---

## Task 9: Reset Password Page

**Files:**
- Create: `frontend/src/app/[locale]/(auth)/reset-password/page.tsx`
- Create: `frontend/src/components/auth/ResetPasswordForm.tsx`

- [ ] **Create reset password form**

  - Read token from URL params
  - New password + confirm password fields
  - Submit calls resetPassword API
  - Success redirects to login

---

## Task 10: Update Dashboard Page

**Files:**
- Modify: `frontend/src/app/[locale]/(app)/dashboard/page.tsx`

- [ ] **Add simple dashboard content**

  ```tsx
  'use client'
  import { useAuth } from '@/hooks/useAuth'
  import { useTranslations } from 'next-intl'

  export default function DashboardPage() {
    const { user } = useAuth()
    const t = useTranslations('nav')

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('dashboard')}
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>

        {/* Placeholder cards for future dashboard widgets */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Test Plans</p>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Test Cases</p>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Executions</p>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">Bugs</p>
            <p className="text-2xl font-bold">0</p>
          </div>
        </div>
      </div>
    )
  }
  ```

---

## Task 11: Additional Form Components

**Files:**
- Create: `frontend/src/components/ui/form.tsx` (react-hook-form integration)
- Create: `frontend/src/components/ui/input.tsx` (if not from shadcn)
- Create: `frontend/src/components/ui/label.tsx` (if not from shadcn)

- [ ] **Install react-hook-form and zod**

  ```bash
  cd frontend
  npm install react-hook-form @hookform/resolvers zod
  ```

- [ ] **Create form components**

  Follow shadcn/ui patterns for Form, FormField, FormItem, FormLabel, FormControl, FormMessage

---

## Verification

- [ ] Login page renders at `/en-US/login` and `/pt-BR/login`
- [ ] Login form validates email and password
- [ ] Login submits to API and stores tokens
- [ ] OAuth buttons redirect to backend OAuth endpoints
- [ ] Forgot password sends reset email
- [ ] Reset password validates token and updates password
- [ ] Register page creates new user
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Authenticated users on login page redirect to dashboard
- [ ] Dashboard shows user name
- [ ] All text is translated (no hardcoded strings)
