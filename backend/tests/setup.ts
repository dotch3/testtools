// Set required env vars before any module loads, so the module-level
// validateConfig(process.env) call in src/config.ts does not throw.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://x:x@localhost/test'
process.env.DATABASE_POOL_URL = process.env.DATABASE_POOL_URL ?? process.env.DATABASE_URL
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'a'.repeat(32)
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? '0'.repeat(64)
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@test.com'
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Test1234!'
// Use stdout-only logging in tests to avoid writing to /logs (read-only on CI/macOS)
process.env.LOG_OUTPUT = process.env.LOG_OUTPUT ?? 'stdout'

// Register tsx CJS hook so that require() calls in tests can resolve .ts files
import 'tsx/cjs'
