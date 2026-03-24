// Set required env vars before any import triggers config validation
process.env.DATABASE_URL = 'postgresql://x:x@localhost/test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.JWT_SECRET = 'a'.repeat(32)
process.env.ENCRYPTION_KEY = '0'.repeat(64)
process.env.ADMIN_EMAIL = 'admin@test.com'
process.env.ADMIN_PASSWORD = 'Test1234!'

import { describe, it, expect } from 'vitest'

describe('logger', () => {
  it('exports a winston logger instance', async () => {
    const { logger } = await import('../src/logger')
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })
})
