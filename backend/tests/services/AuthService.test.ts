import { describe, it, expect, beforeEach, vi } from 'vitest'
import bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import { AuthService } from '../../src/services/AuthService'
import { JwtService } from '../../src/services/JwtService'

vi.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    oAuthAccount: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    role: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('../../src/infrastructure/mail/mailFactory', () => ({
  getMailAdapter: vi.fn().mockReturnValue({
    sendPasswordReset: vi.fn(),
  }),
}))

vi.mock('../../src/config.js', () => ({
  config: {
    ALLOW_REGISTRATION: true,
    LOCKOUT_MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REQUIRE_UPPERCASE: true,
    PASSWORD_REQUIRE_SYMBOL: true,
    ENCRYPTION_KEY: 'a'.repeat(64),
    FRONTEND_URL: 'http://localhost:3000',
  },
}))

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { prisma } from '../../src/infrastructure/database/prisma'

describe('AuthService', () => {
  let service: AuthService
  let mockJwtService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockJwtService = {
      signAccessToken: vi.fn().mockReturnValue('mock-access-token'),
      signRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
    }
    service = new AuthService(mockJwtService)
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

      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBe('mock-refresh-token')
      expect(mockJwtService.signAccessToken).toHaveBeenCalledWith({
        userId: 'user-1',
        email: 'test@test.com',
        roleId: 'role-1',
      })
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

    it('throws on nonexistent user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      await expect(service.loginLocal('nonexistent@test.com', 'pass')).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('creates a new user when registration is allowed', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.role.findFirst).mockResolvedValue({ id: 'role-tester', name: 'tester' } as any)
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-new',
        email: 'new@test.com',
        name: 'New User',
        roleId: 'role-tester',
      } as any)

      const user = await service.register('new@test.com', 'SecurePass123!', 'New User')

      expect(user.email).toBe('new@test.com')
      expect(prisma.user.create).toHaveBeenCalled()
    })

    it('throws when email already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any)

      await expect(service.register('existing@test.com', 'SecurePass123!')).rejects.toThrow('Email already registered')
    })

    it('throws when registration is disabled', async () => {
      vi.resetModules()
      vi.doMock('../../src/config.js', () => ({
        config: { ALLOW_REGISTRATION: false },
      }))

      const { AuthService: AuthService2 } = await import('../../src/services/AuthService')
      const service2 = new AuthService2(mockJwtService)

      await expect(service2.register('new@test.com', 'SecurePass123!')).rejects.toThrow('Registration not allowed')
    })
  })

  describe('refreshToken', () => {
    it('returns new tokens on valid refresh token', async () => {
      mockJwtService.verifyRefreshToken.mockReturnValue({ userId: 'user-1' })
      const tokenHash = createHash('sha256').update('valid-refresh').digest('hex')
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        roleId: 'role-1',
        forcePasswordChange: false,
      } as any)

      const result = await service.refreshToken('valid-refresh')

      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBe('mock-refresh-token')
    })

    it('throws on expired refresh token', async () => {
      mockJwtService.verifyRefreshToken.mockReturnValue({ userId: 'user-1' })
      const tokenHash = createHash('sha256').update('expired-refresh').digest('hex')
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      } as any)

      await expect(service.refreshToken('expired-refresh')).rejects.toThrow('Invalid or expired refresh token')
    })
  })

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      await service.logout('token-to-revoke')

      expect(prisma.refreshToken.updateMany).toHaveBeenCalled()
    })
  })

  describe('changePassword', () => {
    it('changes password successfully', async () => {
      const passwordHash = await bcrypt.hash('OldPass123!', 12)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        passwordHash,
      } as any)

      await service.changePassword('user-1', 'OldPass123!', 'NewPass456!')

      expect(prisma.user.update).toHaveBeenCalled()
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    })

    it('throws on wrong current password', async () => {
      const passwordHash = await bcrypt.hash('CorrectOldPass123!', 12)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        passwordHash,
      } as any)

      await expect(service.changePassword('user-1', 'WrongOldPass123!', 'NewPass456!')).rejects.toThrow('Current password is incorrect')
    })
  })
})
