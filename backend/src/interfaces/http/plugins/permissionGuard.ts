import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { logger } from '../../../logger.js'

const permissionCache = new Map<string, { permissions: Set<string>; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000

async function getUserPermissions(roleId: string): Promise<Set<string>> {
  const cached = permissionCache.get(roleId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions
  }

  const permissions = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: { select: { resource: true, action: true } } },
  })

  const permSet = new Set<string>(
    permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
  )

  permissionCache.set(roleId, { permissions: permSet, expiresAt: Date.now() + CACHE_TTL })
  return permSet
}

export function permissionGuard(resource: string, action: string) {
  return async function (request: any, reply: any) {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' })
    }

    const userPerms = await getUserPermissions(request.user.roleId)
    const required = `${resource}:${action}`

    if (!userPerms.has(required)) {
      logger.warn({
        action: 'permission.denied',
        userId: request.user.userId,
        resource,
        permissionAction: action,
      })
      return reply.status(403).send({ error: 'Insufficient permissions' })
    }
  }
}

export default fp(async () => {})
