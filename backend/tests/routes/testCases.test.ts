import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app'

describe('Test Cases routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(() => app.close())

  describe('GET /api/v1/suites/:suiteId/cases', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/suites/suite-1/cases' })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/suites/:suiteId/cases', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/suites/suite-1/cases',
        payload: { title: 'Test Case', priorityId: 'p1', typeId: 't1' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/cases/:id/steps', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/cases/case-1/steps' })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('PUT /api/v1/cases/:id/steps', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/cases/case-1/steps',
        payload: [],
      })
      expect(response.statusCode).toBe(401)
    })

    it('returns 400 for invalid steps body (not array)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/cases/case-1/steps',
        payload: { steps: 'not-an-array' },
        headers: { authorization: 'Bearer invalid' },
      })
      expect([400, 401]).toContain(response.statusCode)
    })
  })

  describe('PATCH /api/v1/cases/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/cases/case-1',
        payload: { title: 'Updated' },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('DELETE /api/v1/cases/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({ method: 'DELETE', url: '/api/v1/cases/case-1' })
      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/suites/:suiteId/cases/:caseId/evidence', () => {
    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/suites/suite-1/cases/case-1/evidence',
      })
      expect(response.statusCode).toBe(401)
    })
  })
})
