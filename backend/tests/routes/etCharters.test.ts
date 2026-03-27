import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app'

describe('ET Charters routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  describe('GET /api/v1/suites/:suiteId/et-charters', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/suites/suite-1/et-charters',
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/suites/:suiteId/et-charters', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/suites/suite-1/et-charters',
        payload: { charter: 'Explore login flow' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('PATCH /api/v1/et-charters/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/et-charters/charter-1',
        payload: { charter: 'Updated' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('DELETE /api/v1/et-charters/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/et-charters/charter-1',
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/et-charters/:id/evidence', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/et-charters/charter-1/evidence',
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('DELETE /api/v1/et-charters/:id/evidence/:attachmentId', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/et-charters/charter-1/evidence/att-1',
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/et-charters/:id/copy', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/et-charters/charter-1/copy',
        payload: { targetSuiteId: 'suite-2' },
      })
      expect(response.statusCode).toBe(401)
    })
  })
})
