import { describe, it, expect } from 'vitest'

describe('prisma client', () => {
  it('exports a PrismaClient instance', async () => {
    const { prisma } = await import('../src/infrastructure/database/prisma')
    expect(prisma).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
  })
})
