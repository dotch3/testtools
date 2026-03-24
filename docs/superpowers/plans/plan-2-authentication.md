# Plan 2 — Authentication Backend (OAuth2 + Local Auth, JWT, Refresh Tokens, Password Reset)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete authentication system — JWT access + refresh tokens, OAuth2 adapters (GitHub, Google, Microsoft), password policy enforcement, account lockout, password reset flow, and RBAC middleware.

**Dependencies:** Plan 1 (infrastructure) must be complete.

**Tech Stack:** Fastify 5, JWT (jsonwebtoken), bcrypt, Nodemailer, Prisma 6.

---

## File Map

```
backend/
  src/
    utils/
      crypto.ts                  -- AES-256-GCM encrypt/decrypt
      passwordPolicy.ts          -- Password validation
    services/
      JwtService.ts             -- JWT creation + verification
      AuthService.ts            -- Login, register, OAuth, password reset
    infrastructure/
      auth/
        types.ts                -- OAuth types
        GitHubOAuthAdapter.ts   -- GitHub OAuth2
        GoogleOAuthAdapter.ts   -- Google OAuth2
        MicrosoftOAuthAdapter.ts -- Microsoft OAuth2
        OAuthProviderFactory.ts -- Factory pattern
    interfaces/
      http/
        plugins/
          auth.ts              -- JWT validation hook
          permissionGuard.ts   -- RBAC middleware
        routes/
          auth.ts              -- /auth/* routes
          profile.ts           -- /profile routes
          admin/
            users.ts          -- /admin/users routes
        middleware/
          requireAuth.ts       -- Auth middleware decorator
        schemas/
          authSchemas.ts       -- Zod schemas for auth
  tests/
    services/
      JwtService.test.ts
      AuthService.test.ts
    routes/
      auth.test.ts
      profile.test.ts
```

---

## Task 1: AES-256-GCM Encryption Utility

**Files:**
- Create: `backend/src/utils/crypto.ts`

- [ ] **Step 1: Create encrypt/decrypt utilities**

  ```typescript
  import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

  const ALGORITHM = 'aes-256-gcm'

  export function encrypt(plaintext: string, key: Buffer): { iv: string; authTag: string; ciphertext: string } {
    const iv = randomBytes(12)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
    ciphertext += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')
    return { iv: iv.toString('hex'), authTag, ciphertext }
  }

  export function decrypt(ciphertext: string, key: Buffer, iv: string, authTag: string): string {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8')
    plaintext += decipher.final('utf8')
    return plaintext
  }
  ```

---

## Task 2: Password Policy Validator

**Files:**
- Create: `backend/src/utils/passwordPolicy.ts`

- [ ] **Step 1: Create password validator**

  ```typescript
  interface PasswordPolicy {
    minLength: number
    requireUppercase: boolean
    requireSymbol: boolean
  }

  export function validatePassword(password: string, policy: PasswordPolicy): string[] {
    const errors: string[] = []
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters`)
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (policy.requireSymbol && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }
    return errors
  }
  ```

---

## Task 3: JWT Token Service

**Files:**
- Create: `backend/src/services/JwtService.ts`

- [ ] **Step 1: Create JWT service**

  ```typescript
  export class JwtService {
    constructor(
      private secret: string,
      private expiresIn: string,
      private refreshExpiresIn: string,
    ) {}

    generateAccessToken(payload: { userId: string; email: string; roleId: string }): string {
      return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn })
    }

    generateRefreshToken(payload: { userId: string; type: 'refresh' }): string {
      return jwt.sign(payload, this.secret, { expiresIn: this.refreshExpiresIn })
    }

    verifyAccessToken(token: string): JwtPayload {
      return jwt.verify(token, this.secret) as JwtPayload
    }

    verifyRefreshToken(token: string): JwtPayload & { type: 'refresh' } {
      return jwt.verify(token, this.secret) as JwtPayload & { type: 'refresh' }
    }
  }
  ```

---

## Task 4: OAuth2 Adapters

**Files:**
- Create: `backend/src/infrastructure/auth/types.ts`
- Create: `backend/src/infrastructure/auth/GitHubOAuthAdapter.ts`
- Create: `backend/src/infrastructure/auth/GoogleOAuthAdapter.ts`
- Create: `backend/src/infrastructure/auth/MicrosoftOAuthAdapter.ts`
- Create: `backend/src/infrastructure/auth/OAuthProviderFactory.ts`

- [ ] **Step 1: Create OAuth types**

  ```typescript
  export interface OAuthProfile {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    provider: 'github' | 'google' | 'microsoft'
  }

  export interface OAuthAdapter {
    getAuthorizationUrl(state: string): string
    exchangeCodeForTokens(code: string): Promise<{ accessToken: string; profile: OAuthProfile }>
  }
  ```

- [ ] **Step 2: Implement adapters for GitHub, Google, Microsoft**

  Each adapter should:
  - Build authorization URL with correct scopes
  - Exchange authorization code for access token
  - Fetch user profile from provider API
  - Return normalized `OAuthProfile`

- [ ] **Step 3: Create factory**

  ```typescript
  export class OAuthProviderFactory {
    static create(provider: 'github' | 'google' | 'microsoft'): OAuthAdapter {
      switch (provider) {
        case 'github': return new GitHubOAuthAdapter(...)
        case 'google': return new GoogleOAuthAdapter(...)
        case 'microsoft': return new MicrosoftOAuthAdapter(...)
      }
    }
  }
  ```

---

## Task 5: Auth Service

**Files:**
- Create: `backend/src/services/AuthService.ts`

- [ ] **Step 1: Create AuthService with all auth methods**

  ```typescript
  export class AuthService {
    async login(email: string, password: string): Promise<LoginResult>
    async register(email: string, password: string, name?: string): Promise<LoginResult>
    async oauthCallback(provider: string, code: string, state: string): Promise<LoginResult>
    async refreshToken(refreshToken: string): Promise<Tokens>
    async revokeRefreshToken(refreshToken: string): Promise<void>
    async forgotPassword(email: string): Promise<void>
    async resetPassword(token: string, newPassword: string): Promise<void>
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>
    async logout(userId: string): Promise<void>
  }
  ```

---

## Task 6: JWT Validation Plugin

**Files:**
- Create: `backend/src/interfaces/http/plugins/auth.ts`

- [ ] **Step 1: Create auth plugin**

  ```typescript
  app.decorateRequest('user', undefined)

  app.addHook('onRequest', async (request, reply) => {
    // Skip auth for public routes
    if (isPublicRoute(request.url)) return

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.slice(7)
    try {
      request.user = jwtService.verifyAccessToken(token)
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' })
    }
  })

  function isPublicRoute(url: string): boolean {
    return (
      url === '/' ||
      url === '/api/v1' ||
      url.startsWith('/api/v1/auth/') ||
      url.startsWith('/docs') ||
      url === '/api/v1/health'
    )
  }
  ```

---

## Task 7: Permission Guard Middleware

**Files:**
- Create: `backend/src/interfaces/http/plugins/permissionGuard.ts`

- [ ] **Step 1: Create permission guard**

  ```typescript
  export function permissionGuard(resource: string, action: string) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userRole = request.user?.roleId
      if (!userRole) return reply.status(401).send({ error: 'Unauthorized' })

      const hasPermission = await checkPermission(userRole, resource, action)
      if (!hasPermission) {
        return reply.status(403).send({ error: 'Forbidden' })
      }
    }
  }
  ```

---

## Task 8: Auth Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/auth.ts`

- [ ] **Step 1: Create auth routes**

  - `POST /auth/login` — email + password
  - `POST /auth/register` — email + password + name
  - `GET /auth/oauth/:provider` — redirect to OAuth provider
  - `GET /auth/oauth/:provider/callback` — OAuth callback
  - `POST /auth/refresh` — refresh access token
  - `POST /auth/logout` — revoke refresh token
  - `POST /auth/forgot-password` — send reset email
  - `POST /auth/reset-password` — reset with token
  - `PATCH /auth/change-password` — change password (authenticated)

---

## Task 9: Profile Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/profile.ts`

- [ ] **Step 1: Create profile routes**

  - `GET /profile` — get current user
  - `PATCH /profile` — update name, theme preference
  - `GET /profile/oauth-accounts` — list linked OAuth accounts
  - `DELETE /profile/oauth-accounts/:provider` — unlink OAuth

---

## Task 10: Admin User Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/admin/users.ts`

- [ ] **Step 1: Create admin user routes**

  - `GET /admin/users` — list all users (paginated)
  - `GET /admin/users/:id` — get user by ID
  - `PATCH /admin/users/:id` — update user (role, active status)
  - `DELETE /admin/users/:id` — soft delete user

---

## Task 11: Audit Log Middleware

**Files:**
- Create: `backend/src/interfaces/http/plugins/auditLog.ts`

- [ ] **Step 1: Create audit log plugin**

  Log to `audit_logs` table:
  - User ID (if authenticated)
  - Action (from route schema or path)
  - Resource type
  - Resource ID
  - Request metadata (IP, user agent)
  - Timestamp

---

## Task 12: App Factory Update

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Register all plugins and routes**

  ```typescript
  await app.register(corsPlugin)
  await app.register(swaggerPlugin)
  await app.register(auditLogPlugin)
  await app.register(authPlugin)
  await app.register(permissionGuardPlugin)

  app.get('/', { schema: { hide: true } }, async (_, reply) => reply.redirect('/docs'))
  app.get('/api/v1', { schema: { hide: true } }, async (_, reply) => reply.redirect('/docs'))

  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1' })
  await app.register(profileRoutes, { prefix: '/api/v1' })
  await app.register(adminUsersRoutes, { prefix: '/api/v1' })
  ```

---

## Task 13: Integration Tests

**Files:**
- Create: `backend/tests/routes/auth.test.ts`
- Create: `backend/tests/routes/profile.test.ts`

- [ ] **Step 1: Create integration tests**

  Using Fastify's `inject`:
  - Login with valid credentials returns tokens
  - Login with invalid credentials returns 401
  - Refresh token returns new tokens
  - Protected route without token returns 401
  - Profile endpoint returns user data with valid token

---

## Verification

- [ ] Login with email/password returns access + refresh tokens
- [ ] OAuth redirect works for GitHub, Google, Microsoft
- [ ] Token refresh returns new access token
- [ ] Password reset email is generated
- [ ] Password reset with valid token updates password
- [ ] Protected routes reject requests without valid JWT
- [ ] Admin routes are accessible only to admin role
- [ ] All integration tests pass
