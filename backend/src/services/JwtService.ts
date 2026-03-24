import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

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
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn as any })
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.secret) as AccessTokenPayload
  }

  signRefreshToken(userId: string): string {
    const payload: RefreshTokenPayload = { userId, type: 'refresh' }
    return jwt.sign(payload, this.secret, { expiresIn: this.refreshExpiresIn as any })
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.secret) as RefreshTokenPayload
  }

  static generateTokenId(): string {
    return randomBytes(32).toString('hex')
  }
}
