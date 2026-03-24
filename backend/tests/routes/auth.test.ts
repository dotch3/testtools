import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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

    it('returns 400 for missing email or password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: '' },
      })
      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 400 for missing refresh token', async () => {
      const response = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh' })
      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 400 for missing email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: {},
      })
      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('returns 400 for missing refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: {},
      })
      expect(response.statusCode).toBe(400)
    })
  })
})
