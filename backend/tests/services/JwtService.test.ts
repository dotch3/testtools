import { describe, it, expect, beforeAll } from 'vitest'
import { JwtService } from '../../src/services/JwtService'

describe('JwtService', () => {
  let service: JwtService

  beforeAll(() => {
    service = new JwtService('a'.repeat(32), '1h', '7d')
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

  it('throws on invalid refresh token', () => {
    expect(() => service.verifyRefreshToken('invalid-token')).toThrow()
  })

  it('throws on tampered access token', () => {
    const token = service.signAccessToken({ userId: 'u1', email: 'e@e.com', roleId: 'r1' })
    const tampered = token.slice(0, -5) + 'xxxxx'
    expect(() => service.verifyAccessToken(tampered)).toThrow()
  })

  it('generates unique token IDs', () => {
    const id1 = JwtService.generateTokenId()
    const id2 = JwtService.generateTokenId()
    expect(id1).not.toBe(id2)
    expect(id1.length).toBe(64)
  })
})
