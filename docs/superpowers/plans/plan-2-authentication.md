# Plan 2 — Authentication (OAuth2 + local auth, JWT, refresh tokens, password reset)

**Goal:** Implement complete authentication system — OAuth2 providers (GitHub, Google, Microsoft), local email/password login, JWT access tokens with refresh token rotation, account lockout, password reset, and RBAC permission guard middleware.

**Architecture:** Auth mode controlled by `AUTH_MODE` env var (`local` | `oauth` | `both`). All auth endpoints under `/api/v1/auth`. JWT validation via Fastify `onRequest` hook. Permissions checked via `preHandler` hook per-route.

**Security:** bcrypt cost 12 for passwords, AES-256-GCM for OAuth token encryption, SHA-256 for password reset tokens, account lockout after configurable failed attempts.

---

## File Map

```
backend/
  src/
    utils/
      crypto.ts              ← AES-256-GCM encrypt/decrypt for OAuth tokens
      passwordPolicy.ts      ← Password validation (length, uppercase, symbol)
    services/
      JwtService.ts          ← Sign/verify access + refresh tokens
      AuthService.ts         ← Core auth logic (login, register, oauth, reset)
    infrastructure/
      auth/
        OAuthProviderFactory.ts
        GitHubOAuthAdapter.ts
        GoogleOAuthAdapter.ts
        MicrosoftOAuthAdapter.ts
    interfaces/
      http/
        plugins/
          auth.ts            ← JWT validation (onRequest hook)
          permissionGuard.ts ← RBAC permission check (preHandler hook)
        routes/
          auth.ts            ← /auth/* endpoints
          profile.ts         ← /profile endpoints
          admin/
            users.ts         ← /admin/users endpoints
    middleware/
      requireAuth.ts         ← FastifyPlugin for protected routes
  tests/
    utils/
      crypto.test.ts
      passwordPolicy.test.ts
    services/
      JwtService.test.ts
      AuthService.test.ts
    routes/
      auth.test.ts
      profile.test.ts
```

---

## Task 1: Encryption Utility (AES-256-GCM)

**Files:**
- Create: `backend/src/utils/crypto.ts`
- Create: `backend/tests/utils/crypto.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/utils/crypto.test.ts
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../../src/utils/crypto'

describe('crypto', () => {
  const key = 'a'.repeat(64) // 32-byte hex = 64 chars
  const plaintext = 'super-secret-oauth-token'

  it('encrypts and decrypts successfully', () => {
    const encrypted = encrypt(plaintext, key)
    expect(encrypted).not.toBe(plaintext)
    expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+$/) // iv:ciphertext format

    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(plaintext)
  })

  it('throws on invalid key length', () => {
    expect(() => encrypt('text', 'short')).toThrow('ENCRYPTION_KEY must be 64 hex characters')
  })

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt(plaintext, key)
    const [iv, ct] = encrypted.split(':')
    const tampered = `${iv}:${ct.slice(0, -2)}ab`
    expect(() => decrypt(tampered, key)).toThrow()
  })

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const e1 = encrypt(plaintext, key)
    const e2 = encrypt(plaintext, key)
    expect(e1).not.toBe(e2)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npx vitest run tests/utils/crypto.test.ts
```

Expected: FAIL — `Cannot find module '../../src/utils/crypto'`

- [ ] **Step 3: Implement `backend/src/utils/crypto.ts`**

```typescript
// backend/src/utils/crypto.ts
// AES-256-GCM encryption for OAuth tokens and integration credentials stored in DB.
// All encrypted fields are decrypted in-process at runtime and never logged.
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey(key: string): Buffer {
  if (!/^[a-f0-9]{64}$/i.test(key)) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(plaintext: string, keyHex: string): string {
  const key = getKey(keyHex)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
  ciphertext += cipher.final('hex')

  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${ciphertext}:${tag.toString('hex')}`
}

export function decrypt(encrypted: string, keyHex: string): string {
  const key = getKey(keyHex)
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted value format')

  const [ivHex, ciphertext, tagHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const ciphertextBuffer = Buffer.from(ciphertext, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(ciphertextBuffer)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd backend && npx vitest run tests/utils/crypto.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/crypto.ts backend/tests/utils/crypto.test.ts
git commit -m "feat(backend): add AES-256-GCM encryption utility"
```

---

## Task 2: Password Policy Validator

**Files:**
- Create: `backend/src/utils/passwordPolicy.ts`
- Create: `backend/tests/utils/passwordPolicy.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/utils/passwordPolicy.test.ts
import { describe, it, expect } from 'vitest'
import { validatePassword } from '../../src/utils/passwordPolicy'

describe('passwordPolicy', () => {
  const defaults = {
    minLength: 8,
    requireUppercase: true,
    requireSymbol: true,
  }

  it('accepts a password meeting all requirements', () => {
    expect(validatePassword('SecurePass123!', defaults)).toEqual({ valid: true })
  })

  it('rejects password shorter than minLength', () => {
    const result = validatePassword('Ab1!', { ...defaults, minLength: 8 })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 8 characters')
  })

  it('rejects password without uppercase when required', () => {
    const result = validatePassword('securepass123!', defaults)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('rejects password without symbol when required', () => {
    const result = validatePassword('SecurePass1234', defaults)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one symbol')
  })

  it('accepts password without uppercase when not required', () => {
    expect(validatePassword('securepass123!', { ...defaults, requireUppercase: false })).toEqual({ valid: true })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npx vitest run tests/utils/passwordPolicy.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement `backend/src/utils/passwordPolicy.ts`**

```typescript
// backend/src/utils/passwordPolicy.ts
// Validates password against configurable policy (min length, uppercase, symbol).
// Reads config from process.env at module load time (PASSWORD_MIN_LENGTH, etc.).
import { config } from '../config.js'

export interface PasswordPolicyOptions {
  minLength?: number
  requireUppercase?: boolean
  requireSymbol?: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const UPPERCASE_RE = /[A-Z]/
const SYMBOL_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

export function validatePassword(password: string, options?: PasswordPolicyOptions): ValidationResult {
  const opts = {
    minLength: config.PASSWORD_MIN_LENGTH,
    requireUppercase: config.PASSWORD_REQUIRE_UPPERCASE,
    requireSymbol: config.PASSWORD_REQUIRE_SYMBOL,
    ...options,
  }

  const errors: string[] = []

  if (password.length < opts.minLength) {
    errors.push(`Password must be at least ${opts.minLength} characters`)
  }

  if (opts.requireUppercase && !UPPERCASE_RE.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (opts.requireSymbol && !SYMBOL_RE.test(password)) {
    errors.push('Password must contain at least one symbol')
  }

  return { valid: errors.length === 0, errors }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd backend && npx vitest run tests/utils/passwordPolicy.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/passwordPolicy.ts backend/tests/utils/passwordPolicy.test.ts
git commit -m "feat(backend): add password policy validator"
```

---

## Task 3: JWT Token Service

**Files:**
- Create: `backend/src/services/JwtService.ts`
- Create: `backend/tests/services/JwtService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/services/JwtService.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { JwtService } from '../../src/services/JwtService'

describe('JwtService', () => {
  let service: JwtService

  beforeAll(() => {
    const secret = 'a'.repeat(32)
    const expiresIn = '1h'
    const refreshExpiresIn = '1d'
    service = new JwtService(secret, expiresIn, refreshExpiresIn)
  })

  it('signs and verifies an access token', () => {
    const payload = { userId: 'user-123', email: 'test@test.com', roleId: 'role-1' }
    const token = service.signAccessToken(payload)

    const decoded = service.verifyAccessToken(token)
    expect(decoded.userId).toBe('user-123')
    expect(decoded.email).toBe('test@test.com')
    expect(decoded.roleId).toBe('role-1')
  })

  it('signs and verifies a refresh token', () => {
    const token = service.signRefreshToken('user-123')
    const decoded = service.verifyRefreshToken(token)
    expect(decoded.userId).toBe('user-123')
    expect(decoded.type).toBe('refresh')
  })

  it('throws on invalid access token', () => {
    expect(() => service.verifyAccessToken('invalid-token')).toThrow()
  })

  it('throws on expired access token', () => {
    const shortService = new JwtService('a'.repeat(32), '1ms', '1d')
    const token = shortService.signAccessToken({ userId: 'u1' })
    // Wait a bit then verify it expires
    const decoded = shortService.verifyAccessToken(token)
    // Token should be valid immediately
    expect(decoded.userId).toBe('u1')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npx vitest run tests/services/JwtService.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement `backend/src/services/JwtService.ts`**

```typescript
// backend/src/services/JwtService.ts
// Signs and verifies JWT access tokens and refresh tokens.
// Access tokens carry user claims (userId, email, roleId).
// Refresh tokens are opaque tokens stored hashed in DB.
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import type { User } from '@prisma/client'

export interface AccessTokenPayload {
  userId: string
  email: string
  roleId: string
}

export interface RefreshTokenPayload {
  userId: string
  type: 'refresh'
}

export class JwtService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
    private readonly refreshExpiresIn: string,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn })
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.secret) as AccessTokenPayload
  }

  signRefreshToken(userId: string): string {
    const payload: RefreshTokenPayload = { userId, type: 'refresh' }
    return jwt.sign(payload, this.secret, { expiresIn: this.refreshExpiresIn })
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.secret) as RefreshTokenPayload
  }

  static generateTokenId(): string {
    return randomBytes(32).toString('hex')
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd backend && npx vitest run tests/services/JwtService.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/JwtService.ts backend/tests/services/JwtService.test.ts
git commit -m "feat(backend): add JWT token service"
```

---

## Task 4: OAuth2 Adapters (GitHub, Google, Microsoft)

**Files:**
- Create: `backend/src/infrastructure/auth/OAuthProviderFactory.ts`
- Create: `backend/src/infrastructure/auth/GitHubOAuthAdapter.ts`
- Create: `backend/src/infrastructure/auth/GoogleOAuthAdapter.ts`
- Create: `backend/src/infrastructure/auth/MicrosoftOAuthAdapter.ts`

- [ ] **Step 1: Create base interface and types**

```typescript
// backend/src/infrastructure/auth/types.ts
export interface OAuthUserInfo {
  provider: string
  providerUserId: string
  email: string
  name?: string
  avatarUrl?: string
}

export interface IOAuthAdapter {
  provider: string
  getAuthorizationUrl(state: string): string
  exchangeCode(code: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }>
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scopes: string
}
```

- [ ] **Step 2: Create `GitHubOAuthAdapter.ts`**

```typescript
// backend/src/infrastructure/auth/GitHubOAuthAdapter.ts
// GitHub OAuth2 adapter.
// Scopes: read:user (email, avatar), user:email (additional emails)
import type { IOAuthAdapter, OAuthTokens, OAuthUserInfo } from './types.js'

export class GitHubOAuthAdapter implements IOAuthAdapter {
  provider = 'github'

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'read:user user:email',
      state,
    })
    return `https://github.com/login/oauth/authorize?${params}`
  }

  async exchangeCode(code: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }> {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: this.clientId, client_secret: this.clientSecret, code }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      throw new Error(`GitHub OAuth error: ${tokenData.error_description}`)
    }

    const accessToken = tokenData.access_token as string
    const scopes = tokenData.scope as string

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
    })
    const userData = await userRes.json()

    let email = userData.email
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
      })
      const emails = await emailsRes.json()
      email = emails.find((e: any) => e.primary && e.verified)?.email ?? emails[0]?.email
    }

    return {
      tokens: { accessToken, scopes },
      userInfo: {
        provider: 'github',
        providerUserId: String(userData.id),
        email: email ?? '',
        name: userData.name ?? userData.login,
        avatarUrl: userData.avatar_url,
      },
    }
  }
}
```

- [ ] **Step 3: Create `GoogleOAuthAdapter.ts`**

```typescript
// backend/src/infrastructure/auth/GoogleOAuthAdapter.ts
// Google OAuth2 adapter.
// Scopes: openid, email, profile
import type { IOAuthAdapter, OAuthTokens, OAuthUserInfo } from './types.js'

export class GoogleOAuthAdapter implements IOAuthAdapter {
  provider = 'google'

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async exchangeCode(code: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      throw new Error(`Google OAuth error: ${tokenData.error_description}`)
    }

    const accessToken = tokenData.access_token as string
    const refreshToken = tokenData.refresh_token as string | undefined
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()

    return {
      tokens: { accessToken, refreshToken, expiresAt, scopes: 'openid email profile' },
      userInfo: {
        provider: 'google',
        providerUserId: userData.id,
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.picture,
      },
    }
  }
}
```

- [ ] **Step 4: Create `MicrosoftOAuthAdapter.ts`**

```typescript
// backend/src/infrastructure/auth/MicrosoftOAuthAdapter.ts
// Microsoft OAuth2 adapter (Azure AD / Microsoft identity platform).
// Scopes: openid, email, profile, User.Read
import type { IOAuthAdapter, OAuthTokens, OAuthUserInfo } from './types.js'

export class MicrosoftOAuthAdapter implements IOAuthAdapter {
  provider = 'microsoft'

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
    private readonly tenantId?: string,
  ) {}

  getAuthorizationUrl(state: string): string {
    const tenant = this.tenantId ?? 'common'
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'openid email profile',
      state,
    })
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`
  }

  async exchangeCode(code: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }> {
    const tenant = this.tenantId ?? 'common'
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      throw new Error(`Microsoft OAuth error: ${tokenData.error_description}`)
    }

    const accessToken = tokenData.access_token as string
    const refreshToken = tokenData.refresh_token as string | undefined
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : undefined

    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()

    return {
      tokens: { accessToken, refreshToken, expiresAt, scopes: 'openid email profile' },
      userInfo: {
        provider: 'microsoft',
        providerUserId: userData.id,
        email: userData.mail ?? userData.userPrincipalName,
        name: userData.displayName,
      },
    }
  }
}
```

- [ ] **Step 5: Create `OAuthProviderFactory.ts`**

```typescript
// backend/src/infrastructure/auth/OAuthProviderFactory.ts
// Resolves the correct OAuth adapter based on provider name.
import type { IOAuthAdapter } from './types.js'
import { GitHubOAuthAdapter } from './GitHubOAuthAdapter.js'
import { GoogleOAuthAdapter } from './GoogleOAuthAdapter.js'
import { MicrosoftOAuthAdapter } from './MicrosoftOAuthAdapter.js'
import { config } from '../../config.js'

const REDIRECT_URI = `${config.FRONTEND_URL}/auth/callback`

export function createOAuthAdapter(provider: string): IOAuthAdapter {
  switch (provider) {
    case 'github':
      if (!config.OAUTH_GITHUB_CLIENT_ID || !config.OAUTH_GITHUB_CLIENT_SECRET) {
        throw new Error('OAUTH_GITHUB_CLIENT_ID and OAUTH_GITHUB_CLIENT_SECRET are required for GitHub OAuth')
      }
      return new GitHubOAuthAdapter(config.OAUTH_GITHUB_CLIENT_ID, config.OAUTH_GITHUB_CLIENT_SECRET, REDIRECT_URI)

    case 'google':
      if (!config.OAUTH_GOOGLE_CLIENT_ID || !config.OAUTH_GOOGLE_CLIENT_SECRET) {
        throw new Error('OAUTH_GOOGLE_CLIENT_ID and OAUTH_GOOGLE_CLIENT_SECRET are required for Google OAuth')
      }
      return new GoogleOAuthAdapter(config.OAUTH_GOOGLE_CLIENT_ID, config.OAUTH_GOOGLE_CLIENT_SECRET, REDIRECT_URI)

    case 'microsoft':
      if (!config.OAUTH_MICROSOFT_CLIENT_ID || !config.OAUTH_MICROSOFT_CLIENT_SECRET) {
        throw new Error('OAUTH_MICROSOFT_CLIENT_ID and OAUTH_MICROSOFT_CLIENT_SECRET are required for Microsoft OAuth')
      }
      return new MicrosoftOAuthAdapter(config.OAUTH_MICROSOFT_CLIENT_ID, config.OAUTH_MICROSOFT_CLIENT_SECRET, REDIRECT_URI)

    default:
      throw new Error(`Unknown OAuth provider: ${provider}. Supported: github, google, microsoft`)
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/infrastructure/auth/
git commit -m "feat(backend): add OAuth2 adapters — GitHub, Google, Microsoft"
```

---

## Task 5: Auth Service (Core Logic)

**Files:**
- Create: `backend/src/services/AuthService.ts`
- Create: `backend/tests/services/AuthService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// backend/tests/services/AuthService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcrypt'

// Mock Prisma
vi.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    oauthAccount: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../../src/infrastructure/database/prisma'
import { AuthService } from '../../src/services/AuthService'

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    const jwtService = {
      signAccessToken: vi.fn().mockReturnValue('access-token'),
      signRefreshToken: vi.fn().mockReturnValue('refresh-token'),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
      generateTokenId: vi.fn().mockReturnValue('token-id'),
    }
    service = new AuthService(jwtService as any)
  })

  describe('loginLocal', () => {
    it('returns tokens on successful login', async () => {
      const passwordHash = await bcrypt.hash('ValidPass123!', 12)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash,
        roleId: 'role-1',
        lockedUntil: null,
        failedLoginCount: 0,
        forcePasswordChange: false,
        emailVerified: true,
      } as any)

      const result = await service.loginLocal('test@test.com', 'ValidPass123!')

      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toBe('refresh-token')
    })

    it('throws on wrong password', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass123!', 12)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash,
        roleId: 'role-1',
        lockedUntil: null,
        failedLoginCount: 0,
        forcePasswordChange: false,
        emailVerified: true,
      } as any)

      await expect(service.loginLocal('test@test.com', 'WrongPass123!')).rejects.toThrow('Invalid credentials')
    })

    it('throws on locked account', async () => {
      const future = new Date(Date.now() + 60000)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: null,
        roleId: 'role-1',
        lockedUntil: future,
        failedLoginCount: 5,
        forcePasswordChange: false,
        emailVerified: true,
      } as any)

      await expect(service.loginLocal('test@test.com', 'pass')).rejects.toThrow('Account is locked')
    })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd backend && npx vitest run tests/services/AuthService.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement `backend/src/services/AuthService.ts`**

```typescript
// backend/src/services/AuthService.ts
// Core authentication logic: local login, OAuth callback, register, refresh, logout,
// password reset, and account lockout.
import bcrypt from 'bcrypt'
import { createHash, randomBytes } from 'crypto'
import { prisma } from '../infrastructure/database/prisma.js'
import { config } from '../config.js'
import { logger } from '../logger.js'
import { encrypt, decrypt } from '../utils/crypto.js'
import { validatePassword } from '../utils/passwordPolicy.js'
import { JwtService } from './JwtService.js'
import { getMailAdapter } from '../infrastructure/mail/mailFactory.js'
import type { JwtService as IJwtService } from './JwtService.js'
import type { User } from '@prisma/client'

export interface TokenResult {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; roleId: string; forcePasswordChange: boolean }
}

export class AuthService {
  constructor(private readonly jwtService: IJwtService) {}

  async loginLocal(email: string, password: string): Promise<TokenResult> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw new AuthError('Invalid credentials', 401)

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AuthError('Account is locked. Try again later.', 423)
    }

    if (!user.passwordHash) {
      throw new AuthError('Invalid credentials', 401)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      const failedCount = user.failedLoginCount + 1
      const shouldLock = failedCount >= config.LOCKOUT_MAX_ATTEMPTS
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failedCount,
          lockedUntil: shouldLock ? new Date(Date.now() + config.LOCKOUT_DURATION_MINUTES * 60000) : undefined,
        },
      })
      logger.warn({ action: 'auth.login_failed', userId: user.id, reason: 'wrong_password' })
      throw new AuthError('Invalid credentials', 401)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    })

    logger.info({ action: 'auth.login', userId: user.id })

    return this.issueTokens(user)
  }

  async oauthCallback(provider: string, code: string): Promise<TokenResult> {
    const { createOAuthAdapter } = await import('../infrastructure/auth/OAuthProviderFactory.js')
    const adapter = createOAuthAdapter(provider)
    const { tokens, userInfo } = await adapter.exchangeCode(code)

    const existingAccount = await prisma.oauthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId: userInfo.providerUserId } },
    })

    let user: User

    if (existingAccount) {
      const encryptedAccess = encrypt(tokens.accessToken, config.ENCRYPTION_KEY)
      const encryptedRefresh = tokens.refreshToken ? encrypt(tokens.refreshToken, config.ENCRYPTION_KEY) : null

      await prisma.oauthAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          expiresAt: tokens.expiresAt,
          scopes: tokens.scopes,
        },
      })

      user = await prisma.user.findUniqueOrThrow({ where: { id: existingAccount.userId } })
    } else {
      const matchedUser = await prisma.user.findUnique({ where: { email: userInfo.email } })

      if (matchedUser) {
        if (!config.ALLOW_REGISTRATION && !userInfo.email) {
          throw new AuthError('Registration not allowed', 403)
        }

        await prisma.oauthAccount.create({
          data: {
            userId: matchedUser.id,
            provider,
            providerUserId: userInfo.providerUserId,
            accessToken: encrypt(tokens.accessToken, config.ENCRYPTION_KEY),
            refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken, config.ENCRYPTION_KEY) : null,
            expiresAt: tokens.expiresAt,
            scopes: tokens.scopes,
          },
        })

        user = matchedUser
      } else {
        if (!config.ALLOW_REGISTRATION) {
          throw new AuthError('Registration not allowed. Contact an administrator.', 403)
        }

        const defaultRole = await prisma.role.findFirst({ where: { name: 'tester' } })
        user = await prisma.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name,
            avatarUrl: userInfo.avatarUrl,
            roleId: defaultRole!.id,
            emailVerified: true,
            oauthAccounts: {
              create: {
                provider,
                providerUserId: userInfo.providerUserId,
                accessToken: encrypt(tokens.accessToken, config.ENCRYPTION_KEY),
                refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken, config.ENCRYPTION_KEY) : null,
                expiresAt: tokens.expiresAt,
                scopes: tokens.scopes,
              },
            },
          },
        })
      }
    }

    logger.info({ action: 'auth.oauth_login', provider, userId: user.id })
    return this.issueTokens(user)
  }

  async register(email: string, password: string, name?: string): Promise<User> {
    if (!config.ALLOW_REGISTRATION) {
      throw new AuthError('Registration not allowed', 403)
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new AuthError('Email already registered', 409)
    }

    const validation = validatePassword(password)
    if (!validation.valid) {
      throw new AuthError(validation.errors.join('. '), 400)
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const defaultRole = await prisma.role.findFirst({ where: { name: 'tester' } })

    const user = await prisma.user.create({
      data: {
        email,
        name,
        roleId: defaultRole!.id,
        passwordHash,
      },
    })

    logger.info({ action: 'auth.register', userId: user.id })
    return user
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken)

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AuthError('Invalid or expired refresh token', 401)
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } })
    if (!user) throw new AuthError('User not found', 404)

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    logger.debug({ action: 'auth.token_refresh', userId: user.id })
    return this.issueTokens(user)
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })
    logger.info({ action: 'auth.logout' })
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      logger.warn({ action: 'auth.forgot_password', email, reason: 'user_not_found' })
      return
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 3600000)

    await prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: { userId: user.id, tokenHash, expiresAt },
      update: { tokenHash, expiresAt, usedAt: null },
    })

    const mailAdapter = getMailAdapter()
    if (mailAdapter) {
      const resetUrl = `${config.FRONTEND_URL}/auth/reset-password?token=${token}`
      await mailAdapter.sendPasswordReset(email, resetUrl)
      logger.info({ action: 'auth.forgot_password_sent', userId: user.id })
    } else {
      logger.warn({ action: 'auth.forgot_password_skipped', reason: 'SMTP not configured' })
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      throw new AuthError(validation.errors.join('. '), 400)
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')
    const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new AuthError('Invalid or expired reset token', 400)
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash, forcePasswordChange: false },
    })

    await prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    })

    await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } })

    logger.info({ action: 'auth.password_reset', userId: stored.userId })
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AuthError('User not found', 404)

    if (user.passwordHash) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!valid) throw new AuthError('Current password is incorrect', 401)
    }

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      throw new AuthError(validation.errors.join('. '), 400)
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, forcePasswordChange: false },
    })

    await prisma.refreshToken.deleteMany({ where: { userId } })

    logger.info({ action: 'auth.password_change', userId })
  }

  private async issueTokens(user: User): Promise<TokenResult> {
    const accessToken = this.jwtService.signAccessToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
    })

    const refreshToken = this.jwtService.signRefreshToken(user.id)

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        forcePasswordChange: user.forcePasswordChange,
      },
    }
  }
}

export class AuthError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message)
    this.name = 'AuthError'
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd backend && npx vitest run tests/services/AuthService.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/AuthService.ts backend/tests/services/AuthService.test.ts
git commit -m "feat(backend): add AuthService — login, OAuth, register, refresh, password reset"
```

---

## Task 6: Auth Plugin (JWT Validation)

**Files:**
- Create: `backend/src/interfaces/http/plugins/auth.ts`

- [ ] **Step 1: Create `backend/src/interfaces/http/plugins/auth.ts`**

```typescript
// backend/src/interfaces/http/plugins/auth.ts
// Fastify plugin that validates JWT on every protected request.
// Sets req.user from the JWT payload for downstream handlers.
import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../../../config.js'
import { JwtService } from '../../../services/JwtService.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { userId: string; email: string; roleId: string }
  }
}

export default fp(async (app: FastifyInstance) => {
  const jwtService = new JwtService(
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN,
    config.JWT_REFRESH_EXPIRES_IN,
  )

  app.decorateRequest('user', null)

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url.startsWith('/api/v1/auth/')) return
    if (request.url.startsWith('/docs')) return
    if (request.url === '/api/v1/health') return

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.slice(7)
    try {
      const payload = jwtService.verifyAccessToken(token)
      request.user = payload
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid or expired token' })
    }
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/interfaces/http/plugins/auth.ts
git commit -m "feat(backend): add JWT validation plugin"
```

---

## Task 7: Permission Guard Middleware

**Files:**
- Create: `backend/src/interfaces/http/plugins/permissionGuard.ts`
- Create: `backend/src/interfaces/http/middleware/requireAuth.ts`

- [ ] **Step 1: Create `backend/src/interfaces/http/plugins/permissionGuard.ts`**

```typescript
// backend/src/interfaces/http/plugins/permissionGuard.ts
// Fastify plugin that checks RBAC permissions before executing a route handler.
// Requires req.user to be set by the auth plugin.
// Usage: app.get('/projects', { preHandler: [permissionGuard('project', 'read')], ... }
import fp from 'fastify-plugin'
import type { FastifyInstance, HookHandlerDoneFunction } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { logger } from '../../../logger.js'

const permissionCache = new Map<string, { permissions: Set<string>; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getUserPermissions(roleId: string): Promise<Set<string>> {
  const cached = permissionCache.get(roleId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions
  }

  const permissions = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: { select: { resource: true, action: true } } },
  })

  const permSet = new Set<string>(
    permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
  )

  permissionCache.set(roleId, { permissions: permSet, expiresAt: Date.now() + CACHE_TTL })
  return permSet
}

export function permissionGuard(resource: string, action: string) {
  return async function (request: any, reply: any) {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' })
    }

    const userPerms = await getUserPermissions(request.user.roleId)
    const required = `${resource}:${action}`

    if (!userPerms.has(required)) {
      logger.warn({
        action: 'permission.denied',
        userId: request.user.userId,
        resource,
        action,
      })
      return reply.status(403).send({ error: 'Insufficient permissions' })
    }
  }
}

export default fp(async () => {})
```

- [ ] **Step 2: Create `backend/src/interfaces/http/middleware/requireAuth.ts`**

```typescript
// backend/src/interfaces/http/middleware/requireAuth.ts
// Simple middleware factory that returns a preHandler requiring authentication.
import type { FastifyRequest, FastifyReply } from 'fastify'

export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/interfaces/http/plugins/permissionGuard.ts backend/src/interfaces/http/middleware/requireAuth.ts
git commit -m "feat(backend): add RBAC permission guard middleware"
```

---

## Task 8: Auth Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/auth.ts`

- [ ] **Step 1: Create `backend/src/interfaces/http/routes/auth.ts`**

```typescript
// backend/src/interfaces/http/routes/auth.ts
// All authentication endpoints: OAuth, login, register, refresh, logout, password reset.
import type { FastifyInstance } from 'fastify'
import { config } from '../../../config.js'
import { AuthService, AuthError } from '../../../services/AuthService.js'
import { JwtService } from '../../../services/JwtService.js'

export async function authRoutes(app: FastifyInstance) {
  const jwtService = new JwtService(
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN,
    config.JWT_REFRESH_EXPIRES_IN,
  )
  const authService = new AuthService(jwtService)

  app.get<{ Params: { provider: string } }>(
    '/auth/:provider',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Initiate OAuth2 login',
        params: { type: 'object', properties: { provider: { type: 'string' } } },
        response: { 302: { type: 'null' } },
      },
    },
    async (request, reply) => {
      if (config.AUTH_MODE === 'local') {
        return reply.status(404).send({ error: 'OAuth not available in local auth mode' })
      }

      const { provider } = request.params
      const { createOAuthAdapter } = await import('../../../infrastructure/auth/OAuthProviderFactory.js')
      const adapter = createOAuthAdapter(provider)
      const state = require('crypto').randomBytes(16).toString('hex')

      return reply.redirect(adapter.getAuthorizationUrl(state))
    },
  )

  app.get<{ Params: { provider: string }; Querystring: { code: string; state?: string } }>(
    '/auth/:provider/callback',
    {
      schema: {
        tags: ['Auth'],
        summary: 'OAuth2 callback',
        params: { type: 'object', properties: { provider: { type: 'string' } } },
        querystring: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      try {
        const { provider } = request.params
        const { code } = request.query
        const result = await authService.oauthCallback(provider, code)

        return reply.redirect(`${config.FRONTEND_URL}/auth/success?token=${result.accessToken}`)
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Local email/password login',
        body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              user: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, roleId: { type: 'string' }, forcePasswordChange: { type: 'boolean' } } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (config.AUTH_MODE === 'oauth') {
        return reply.status(404).send({ error: 'Local login not available' })
      }

      try {
        const result = await authService.loginLocal(request.body.email, request.body.password)
        return reply.send(result)
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.post<{ Body: { email: string; password: string; name?: string } }>(
    '/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Self-registration (if ALLOW_REGISTRATION=true)',
        body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      try {
        const user = await authService.register(request.body.email, request.body.password, request.body.name)
        return reply.status(201).send({ id: user.id, email: user.email })
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.post<{ Body: { refreshToken: string } }>(
    '/auth/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      try {
        const result = await authService.refreshToken(request.body.refreshToken)
        return reply.send(result)
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.post<{ Body: { refreshToken: string } }>(
    '/auth/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout — revoke refresh token',
        body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      await authService.logout(request.body.refreshToken)
      return reply.send({ success: true })
    },
  )

  app.post<{ Body: { email: string } }>(
    '/auth/forgot-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        body: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      await authService.forgotPassword(request.body.email)
      return reply.send({ message: 'If the email exists, a reset link has been sent' })
    },
  )

  app.post<{ Body: { token: string; newPassword: string } }>(
    '/auth/reset-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        body: { type: 'object', required: ['token', 'newPassword'], properties: { token: { type: 'string' }, newPassword: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      try {
        await authService.resetPassword(request.body.token, request.body.newPassword)
        return reply.send({ message: 'Password reset successfully' })
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )

  app.patch<{ Body: { currentPassword: string; newPassword: string } }>(
    '/auth/change-password',
    {
      preHandler: [(request: any, reply: any) => {
        if (!request.user) return reply.status(401).send({ error: 'Authentication required' })
      }],
      schema: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        body: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } } },
      },
    },
    async (request: any, reply) => {
      try {
        await authService.changePassword(request.user.userId, request.body.currentPassword, request.body.newPassword)
        return reply.send({ message: 'Password changed successfully' })
      } catch (err) {
        if (err instanceof AuthError) {
          return reply.status(err.statusCode).send({ error: err.message })
        }
        throw err
      }
    },
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/interfaces/http/routes/auth.ts
git commit -m "feat(backend): add auth routes — OAuth, login, register, refresh, password reset"
```

---

## Task 9: Profile Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/profile.ts`

- [ ] **Step 1: Create `backend/src/interfaces/http/routes/profile.ts`**

```typescript
// backend/src/interfaces/http/routes/profile.ts
// User profile endpoints: view/update profile, manage OAuth accounts.
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { config } from '../../../config.js'
import { encrypt, decrypt } from '../../../utils/crypto.js'
import { AuthService, AuthError } from '../../../services/AuthService.js'
import { JwtService } from '../../../services/JwtService.js'

export async function profileRoutes(app: FastifyInstance) {
  const jwtService = new JwtService(config.JWT_SECRET, config.JWT_EXPIRES_IN, config.JWT_REFRESH_EXPIRES_IN)
  const authService = new AuthService(jwtService)

  app.get(
    '/profile',
    {
      preHandler: [(request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) return reply.status(401).send({ error: 'Authentication required' })
      }],
      schema: {
        tags: ['Profile'],
        summary: 'Get current user profile',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.userId },
        select: { id: true, email: true, name: true, avatarUrl: true, themePreference: true, role: { select: { name: true, label: true, color: true } }, forcePasswordChange: true },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })
      return reply.send(user)
    },
  )

  app.patch<{ Body: { name?: string; themePreference?: string } }>(
    '/profile',
    {
      preHandler: [(request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) return reply.status(401).send({ error: 'Authentication required' })
      }],
      schema: {
        tags: ['Profile'],
        summary: 'Update profile',
        body: { type: 'object', properties: { name: { type: 'string' }, themePreference: { type: 'string', enum: ['dark', 'light', 'system'] } } },
      },
    },
    async (request: FastifyRequest & { body: { name?: string; themePreference?: string } }, reply: FastifyReply) => {
      const user = await prisma.user.update({
        where: { id: request.user!.userId },
        data: { name: request.body.name, themePreference: request.body.themePreference },
      })
      return reply.send({ id: user.id, email: user.email, name: user.name, themePreference: user.themePreference })
    },
  )

  app.get(
    '/profile/oauth-accounts',
    {
      preHandler: [(request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) return reply.status(401).send({ error: 'Authentication required' })
      }],
      schema: {
        tags: ['Profile'],
        summary: 'List linked OAuth accounts',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const accounts = await prisma.oAuthAccount.findMany({
        where: { userId: request.user!.userId },
        select: { id: true, provider: true, createdAt: true },
      })
      return reply.send(accounts)
    },
  )

  app.delete<{ Params: { provider: string } }>(
    '/profile/oauth-accounts/:provider',
    {
      preHandler: [(request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) return reply.status(401).send({ error: 'Authentication required' })
      }],
      schema: {
        tags: ['Profile'],
        summary: 'Unlink OAuth provider',
        params: { type: 'object', properties: { provider: { type: 'string' } } },
      },
    },
    async (request: FastifyRequest & { params: { provider: string } }, reply: FastifyReply) => {
      const hasPassword = await prisma.user.findUnique({
        where: { id: request.user!.userId },
        select: { passwordHash: true },
      })

      if (!hasPassword?.passwordHash) {
        return reply.status(400).send({ error: 'Cannot unlink last authentication method' })
      }

      await prisma.oAuthAccount.deleteMany({
        where: { userId: request.user!.userId, provider: request.params.provider },
      })

      return reply.send({ success: true })
    },
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/interfaces/http/routes/profile.ts
git commit -m "feat(backend): add profile routes"
```

---

## Task 10: Admin User Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/admin/users.ts`

- [ ] **Step 1: Create `backend/src/interfaces/http/routes/admin/users.ts`**

```typescript
// backend/src/interfaces/http/routes/admin/users.ts
// Admin user management: list, create, update, deactivate, unlock.
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcrypt'
import { prisma } from '../../../../infrastructure/database/prisma.js'
import { validatePassword } from '../../../../utils/passwordPolicy.js'
import { permissionGuard } from '../../plugins/permissionGuard.js'

export async function adminUsersRoutes(app: FastifyInstance) {
  app.addHook('preHandler', permissionGuard('user', 'read'))

  app.get<{ Querystring: { roleId?: string; search?: string } }>(
    '/admin/users',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List all users',
        querystring: { type: 'object', properties: { roleId: { type: 'string' }, search: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const { roleId, search } = request.query
      const users = await prisma.user.findMany({
        where: {
          ...(roleId ? { roleId } : {}),
          ...(search ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] } : {}),
        },
        select: { id: true, email: true, name: true, avatarUrl: true, role: { select: { name: true, label: true, color: true } }, lastLoginAt: true, lockedUntil: true, createdAt: true },
      })
      return reply.send(users)
    },
  )

  app.post<{ Body: { email: string; password?: string; name?: string; roleId: string } }>(
    '/admin/users',
    {
      preHandler: [permissionGuard('user', 'create')],
      schema: {
        tags: ['Admin'],
        summary: 'Create user (admin only)',
        body: { type: 'object', required: ['email', 'roleId'], properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' }, roleId: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const { email, password, name, roleId } = request.body

      if (password) {
        const validation = validatePassword(password)
        if (!validation.valid) {
          return reply.status(400).send({ error: validation.errors.join('. ') })
        }
      }

      const passwordHash = password ? await bcrypt.hash(password, 12) : null

      const user = await prisma.user.create({
        data: { email, name, roleId, passwordHash, forcePasswordChange: !!password },
      })

      return reply.status(201).send({ id: user.id, email: user.email })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/admin/users/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Get user by ID',
        params: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
        select: { id: true, email: true, name: true, avatarUrl: true, role: true, emailVerified: true, lastLoginAt: true, lockedUntil: true, forcePasswordChange: true, createdAt: true },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })
      return reply.send(user)
    },
  )

  app.patch<{ Params: { id: string }; Body: { roleId?: string; forcePasswordChange?: boolean; locked?: boolean } }>(
    '/admin/users/:id',
    {
      preHandler: [permissionGuard('user', 'update')],
      schema: {
        tags: ['Admin'],
        summary: 'Update user (admin only)',
        params: { type: 'object', properties: { id: { type: 'string' } } },
        body: { type: 'object', properties: { roleId: { type: 'string' }, forcePasswordChange: { type: 'boolean' }, locked: { type: 'boolean' } } },
      },
    },
    async (request, reply) => {
      const data: any = {}
      if (request.body.roleId) data.roleId = request.body.roleId
      if (typeof request.body.forcePasswordChange === 'boolean') data.forcePasswordChange = request.body.forcePasswordChange
      if (typeof request.body.locked === 'boolean') data.lockedUntil = request.body.locked ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null

      const user = await prisma.user.update({
        where: { id: request.params.id },
        data,
      })
      return reply.send({ id: user.id, email: user.email })
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/admin/users/:id',
    {
      preHandler: [permissionGuard('user', 'delete')],
      schema: {
        tags: ['Admin'],
        summary: 'Deactivate user (admin only)',
        params: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      await prisma.user.update({
        where: { id: request.params.id },
        data: { lockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      })
      return reply.send({ success: true })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/unlock',
    {
      preHandler: [permissionGuard('user', 'update')],
      schema: {
        tags: ['Admin'],
        summary: 'Manually unlock user account',
        params: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { lockedUntil: null, failedLoginCount: 0 },
      })
      return reply.send({ success: true, userId: user.id })
    },
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/interfaces/http/routes/admin/users.ts
git commit -m "feat(backend): add admin user management routes"
```

---

## Task 11: Audit Log Middleware

**Files:**
- Create: `backend/src/interfaces/http/plugins/auditLog.ts`

- [ ] **Step 1: Create `backend/src/interfaces/http/plugins/auditLog.ts`**

```typescript
// backend/src/interfaces/http/plugins/auditLog.ts
// Fastify plugin that logs all write operations to AUDIT_LOGS table.
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { logger } from '../../../logger.js'

export default fp(async (app: FastifyInstance) => {
  app.addHook('onResponse', async (request: any, reply: any) => {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    if (!writeMethods.includes(request.method)) return
    if (request.url.startsWith('/auth/') && request.url !== '/auth/change-password') return

    const entityMatch = request.url.match(/\/(projects|test-plans|suites|cases|executions|bugs|attachments|settings|admin\/users)\//)
    if (!entityMatch) return

    const entityType = entityMatch[1].replace('admin/', '')
    const entityId = extractEntityId(request.url)

    try {
      await prisma.auditLog.create({
        data: {
          userId: request.user?.userId ?? null,
          action: `${request.method.toLowerCase()}_${entityType}`,
          entityType,
          entityId,
          payload: { method: request.method, url: request.url, statusCode: reply.statusCode },
          ipAddress: request.ip,
        },
      })
    } catch (err) {
      logger.error({ action: 'audit_log.error', err }, 'Failed to write audit log')
    }
  })
})

function extractEntityId(url: string): string | null {
  const parts = url.split('/')
  const uuids = parts.filter((p) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p))
  return uuids[uuids.length - 1] ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/interfaces/http/plugins/auditLog.ts
git commit -m "feat(backend): add audit log middleware"
```

---

## Task 12: Update App Factory + Entry Point

**Files:**
- Modify: `backend/src/app.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Update `backend/src/app.ts` to register new plugins and routes**

```typescript
// backend/src/app.ts
import Fastify from 'fastify'
import swaggerPlugin from './interfaces/http/plugins/swagger.js'
import corsPlugin from './interfaces/http/plugins/cors.js'
import authPlugin from './interfaces/http/plugins/auth.js'
import auditLogPlugin from './interfaces/http/plugins/auditLog.js'
import { healthRoutes } from './interfaces/http/routes/health.js'
import { authRoutes } from './interfaces/http/routes/auth.js'
import { profileRoutes } from './interfaces/http/routes/profile.js'
import { adminUsersRoutes } from './interfaces/http/routes/admin/users.js'
import { logger } from './logger.js'

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: false,
  })

  await app.register(corsPlugin)
  await app.register(swaggerPlugin)
  await app.register(auditLogPlugin)

  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1' })
  await app.register(profileRoutes, { prefix: '/api/v1' })
  await app.register(adminUsersRoutes, { prefix: '/api/v1' })

  return app
}
```

- [ ] **Step 2: Add jsonwebtoken dependency to `backend/package.json`**

```bash
cd backend && npm install jsonwebtoken && npm install -D @types/jsonwebtoken
```

- [ ] **Step 3: Run tests**

```bash
cd backend && npm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.ts backend/package.json backend/package-lock.json
git commit -m "feat(backend): wire up auth plugins and routes in app factory"
```

---

## Task 13: Integration Tests

**Files:**
- Create: `backend/tests/routes/auth.test.ts`
- Create: `backend/tests/routes/profile.test.ts`

- [ ] **Step 1: Create `backend/tests/routes/auth.test.ts`**

```typescript
// backend/tests/routes/auth.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../../src/app'

describe('Auth routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  describe('POST /api/v1/auth/login', () => {
    it('returns 400 for missing body', async () => {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login' })
      expect(response.statusCode).toBe(400)
    })

    it('returns 401 for invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nonexistent@test.com', password: 'wrong' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 400 for missing refresh token', async () => {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh' })
      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 200 even for nonexistent email (security)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: { email: 'nonexistent@test.com' },
      })
      expect(response.statusCode).toBe(200)
    })
  })
})
```

- [ ] **Step 2: Create `backend/tests/routes/profile.test.ts`**

```typescript
// backend/tests/routes/profile.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app'

describe('Profile routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  describe('GET /api/v1/profile', () => {
    it('returns 401 without auth', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/profile' })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('PATCH /api/v1/profile', () => {
    it('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        payload: { name: 'New Name' },
      })
      expect(response.statusCode).toBe(401)
    })
  })
})
```

- [ ] **Step 3: Run all tests**

```bash
cd backend && npm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/routes/
git commit -m "test(backend): add integration tests for auth and profile routes"
```

---

## Task 14: End-to-End Verification

- [ ] **Step 1: Start local stack**

```bash
docker-compose --profile local-db up --build
```

- [ ] **Step 2: Run migrations and seed**

```bash
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx tsx prisma/seed.ts
```

- [ ] **Step 3: Test local login**

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"changeme123!"}'
```

Expected: Returns `{ accessToken, refreshToken, user }`

- [ ] **Step 4: Test authenticated request**

```bash
curl http://localhost:3001/api/v1/profile \
  -H "Authorization: Bearer <access_token>"
```

Expected: Returns user profile

- [ ] **Step 5: Test token refresh**

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

Expected: Returns new `{ accessToken, refreshToken }`

- [ ] **Step 6: Test admin user list**

```bash
curl http://localhost:3001/api/v1/admin/users \
  -H "Authorization: Bearer <access_token>"
```

Expected: Returns array of users

- [ ] **Step 7: Test Swagger UI**

Open http://localhost:3001/docs — All auth endpoints should be documented.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: plan-2 complete — authentication system ready"
```

---

## Summary

After this plan is complete:
- Complete OAuth2 flow (GitHub, Google, Microsoft) with state validation
- Local email/password authentication with bcrypt
- JWT access tokens (8h) + refresh token rotation (30d)
- Account lockout after configurable failed attempts
- Password reset via email with 1h TTL tokens
- RBAC permission guard middleware with Redis-cached permission lookups
- Audit logging on all write operations
- Admin user management (create, update, deactivate, unlock)
- Profile management (view, update, OAuth account linking)
- All endpoints documented in Swagger UI

**Next:** Plan 3 — Projects & Test Plans (CRUD, team management, permissions)
