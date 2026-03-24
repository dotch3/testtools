# Plan 4 — Auth UI: Login, Register, OAuth, Password Reset, Route Protection

**Goal:** Implement the full authentication UI — login form, registration form, OAuth buttons, password reset flow, and protected routes.

**Dependencies:** Plan 2 (auth backend) and Plan 3 (frontend core) must be complete.

---

## File Map

```
frontend/src/app/[locale]/(auth)/
  login/page.tsx, register/page.tsx, forgot-password/page.tsx, reset-password/page.tsx
frontend/src/components/auth/
  AuthCard.tsx, LoginForm.tsx, RegisterForm.tsx, OAuthButtons.tsx
  ForgotPasswordForm.tsx, ResetPasswordForm.tsx, PasswordInput.tsx
```

---

## Task 1: Auth API Methods

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Add auth methods**

  ```typescript
  async login(email, password): Promise<{ accessToken, refreshToken, user }>
  async register(data): Promise<{ accessToken, refreshToken, user }>
  async logout(refreshToken): Promise<void>
  async forgotPassword(email): Promise<{ success }>
  async resetPassword(token, newPassword): Promise<{ success }>
  async changePassword(current, newPassword): Promise<{ success }>
  ```

---

## Task 2: Translation Keys

**Files:**
- Modify: `frontend/src/messages/en-US.json`
- Modify: `frontend/src/messages/pt-BR.json`

- [ ] **Add auth keys**

  ```json
  {
    "auth": {
      "login": { "title": "Sign in", "email": "...", "password": "...", ... },
      "register": { ... },
      "forgotPassword": { ... },
      "resetPassword": { ... },
      "oauth": { "orContinueWith": "...", "github": "...", "google": "...", "microsoft": "..." },
      "validation": { "required": "...", "invalidEmail": "..." }
    }
  }
  ```

---

## Task 3: Auth Card Component

**Files:**
- Create: `frontend/src/components/auth/AuthCard.tsx`

- [ ] **Create shared card**

  Centered card with app icon, title, subtitle, and children.

---

## Task 4: Password Input

**Files:**
- Create: `frontend/src/components/auth/PasswordInput.tsx`

- [ ] **Input with show/hide toggle**

---

## Task 5: OAuth Buttons

**Files:**
- Create: `frontend/src/components/auth/OAuthButtons.tsx`

- [ ] **GitHub, Google, Microsoft buttons**

  Separator with "Or continue with" text, then OAuth buttons.

---

## Task 6: Login Page

**Files:**
- Create: `frontend/src/components/auth/LoginForm.tsx`
- Create: `frontend/src/app/[locale]/(auth)/login/page.tsx`

- [ ] **Login form with email, password, forgot password link, OAuth buttons**

---

## Task 7: Register Page

**Files:**
- Create: `frontend/src/components/auth/RegisterForm.tsx`
- Create: `frontend/src/app/[locale]/(auth)/register/page.tsx`

- [ ] **Register form with name, email, password, confirm password**

---

## Task 8: Forgot/Reset Password Pages

**Files:**
- Create: `frontend/src/app/[locale]/(auth)/forgot-password/page.tsx`
- Create: `frontend/src/app/[locale]/(auth)/reset-password/page.tsx`

- [ ] **Forgot password: email input, send reset link**
- [ ] **Reset password: token from URL, new password input**

---

## Task 9: Dashboard Update

**Files:**
- Modify: `frontend/src/app/[locale]/(app)/dashboard/page.tsx`

- [ ] **Add simple dashboard content with placeholder cards**

---

## Verification

- [ ] Login page renders at `/en-US/login` and `/pt-BR/login`
- [ ] Login submits to API and stores tokens
- [ ] OAuth buttons redirect to backend OAuth endpoints
- [ ] Protected routes redirect to login when unauthenticated
- [ ] All text is translated
