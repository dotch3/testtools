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

  describe('GET /api/v1/profile/oauth-accounts', () => {
    it('returns 401 without auth', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/profile/oauth-accounts' })
      expect(response.statusCode).toBe(401)
    })
  })
})
