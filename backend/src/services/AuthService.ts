import bcrypt from 'bcrypt'
import { createHash, randomBytes } from 'crypto'
import { prisma } from '../infrastructure/database/prisma.js'
import { config } from '../config.js'
import { logger } from '../logger.js'
import { encrypt } from '../utils/crypto.js'
import { validatePassword } from '../utils/passwordPolicy.js'
import type { JwtService } from './JwtService.js'

export interface TokenResult {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; roleId: string; forcePasswordChange: boolean }
}

export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

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

    logger.info('User logged in', { action: 'auth.login', userId: user.id })

    return this.issueTokens(user)
  }

  async oauthCallback(provider: string, code: string): Promise<TokenResult> {
    const { createOAuthAdapter } = await import('../infrastructure/auth/OAuthProviderFactory.js')
    const adapter = createOAuthAdapter(provider)
    const { tokens, userInfo } = await adapter.exchangeCode(code)

    const existingAccount = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId: userInfo.providerUserId } },
    })

    let user: any

    if (existingAccount) {
      const encryptedAccess = encrypt(tokens.accessToken, config.ENCRYPTION_KEY)
      const encryptedRefresh = tokens.refreshToken ? encrypt(tokens.refreshToken, config.ENCRYPTION_KEY) : null

      await prisma.oAuthAccount.update({
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
        await prisma.oAuthAccount.create({
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

    logger.info('User logged in via OAuth', { action: 'auth.oauth_login', provider, userId: user.id })
    return this.issueTokens(user)
  }

  async register(email: string, password: string, name?: string): Promise<any> {
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

    logger.info('User registered', { action: 'auth.register', userId: user.id })
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

    logger.debug('Token refreshed', { action: 'auth.token_refresh', userId: user.id })
    return this.issueTokens(user)
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })
    logger.info('User logged out', { action: 'auth.logout' })
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      logger.warn('Password reset requested for unknown email', { action: 'auth.forgot_password', email, reason: 'user_not_found' })
      return
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 3600000)

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    })

    const { getMailAdapter } = await import('../infrastructure/mail/mailFactory.js')
    const mailAdapter = getMailAdapter()
    if (mailAdapter) {
      const resetUrl = `${config.FRONTEND_URL}/auth/reset-password?token=${token}`
      await mailAdapter.sendPasswordReset(email, resetUrl)
      logger.info('Password reset email sent', { action: 'auth.forgot_password_sent', userId: user.id })
    } else {
      logger.warn('Password reset skipped - SMTP not configured', { action: 'auth.forgot_password_skipped' })
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

    logger.info('Password reset successfully', { action: 'auth.password_reset', userId: stored.userId })
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

    logger.info('Password changed', { action: 'auth.password_change', userId })
  }

  private async issueTokens(user: any): Promise<TokenResult> {
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
