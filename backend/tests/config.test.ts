import { describe, it, expect } from 'vitest'

describe('config', () => {
  it('throws when DATABASE_URL is missing', () => {
    const original = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    expect(() => {
      const { validateConfig } = require('../src/config')
      validateConfig(process.env)
    }).toThrow()
    process.env.DATABASE_URL = original
  })

  it('returns parsed config with defaults', () => {
    const { validateConfig } = require('../src/config')
    const cfg = validateConfig({
      DATABASE_URL: 'postgresql://x:x@localhost/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'a'.repeat(32),
      ENCRYPTION_KEY: '0'.repeat(64),
      ADMIN_EMAIL: 'admin@test.com',
      ADMIN_PASSWORD: 'Test1234!',
    })
    expect(cfg.LOG_LEVEL).toBe('info')
    expect(cfg.STORAGE_PROVIDER).toBe('local')
    expect(cfg.AUTH_MODE).toBe('both')
  })
})
