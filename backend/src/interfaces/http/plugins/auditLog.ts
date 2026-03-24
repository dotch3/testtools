import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { logger } from '../../../logger.js'

export default fp(async (app: FastifyInstance) => {
  app.addHook('onResponse', async (request: any, reply: any) => {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    if (!writeMethods.includes(request.method)) return
    if (request.url.startsWith('/auth/') && request.url !== '/auth/change-password') return

    const entityMatch = request.url.match(/\/(projects|test-plans|suites|cases|executions|bugs|attachments|settings|admin\/users)\//)
    if (!entityMatch) return

    const entityType = entityMatch[1].replace('admin/', '')
    const entityId = extractEntityId(request.url)

    try {
      await prisma.auditLog.create({
        data: {
          userId: request.user?.userId ?? null,
          action: `${request.method.toLowerCase()}_${entityType}`,
          entityType,
          entityId,
          payload: { method: request.method, url: request.url, statusCode: reply.statusCode },
          ipAddress: request.ip,
        },
      })
    } catch (err) {
      logger.error('Failed to write audit log', { action: 'audit_log.error', err })
    }
  })
})

function extractEntityId(url: string): string | null {
  const parts = url.split('/')
  const uuids = parts.filter((p) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p))
  return uuids[uuids.length - 1] ?? null
}
