// backend/src/infrastructure/database/prisma.ts
// Prisma client singleton.
// Uses DATABASE_POOL_URL for runtime queries when set (Supabase/Neon pooler).
// Falls back to DATABASE_URL if DATABASE_POOL_URL is not configured.
import { PrismaClient } from '@prisma/client'
import { config } from '../../config.js'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// DATABASE_POOL_URL is read directly by Prisma via the schema `url` field.
// No need to pass datasourceUrl here — Prisma resolves it from the env vars.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.LOG_LEVEL === 'debug' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
