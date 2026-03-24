import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

export async function profileRoutes(app: FastifyInstance) {

  app.get(
    '/profile',
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ['Profile'],
        summary: 'Get current user profile',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          themePreference: true,
          forcePasswordChange: true,
          role: { select: { name: true, label: true, color: true } },
        },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })
      return reply.send(user)
    },
  )

  app.patch<{ Body: { name?: string; themePreference?: string } }>(
    '/profile',
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ['Profile'],
        summary: 'Update profile',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            themePreference: { type: 'string', enum: ['dark', 'light', 'system'] },
          },
        },
      },
    },
    async (request: FastifyRequest & { body: { name?: string; themePreference?: string } }, reply: FastifyReply) => {
      const user = await prisma.user.update({
        where: { id: request.user!.userId },
        data: {
          name: request.body.name,
          themePreference: request.body.themePreference,
        },
      })
      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        themePreference: user.themePreference,
      })
    },
  )

  app.get(
    '/profile/oauth-accounts',
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ['Profile'],
        summary: 'List linked OAuth accounts',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const accounts = await prisma.oAuthAccount.findMany({
        where: { userId: request.user!.userId },
        select: { id: true, provider: true, createdAt: true },
      })
      return reply.send(accounts)
    },
  )

  app.delete<{ Params: { provider: string } }>(
    '/profile/oauth-accounts/:provider',
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ['Profile'],
        summary: 'Unlink OAuth provider',
        params: { type: 'object', properties: { provider: { type: 'string' } } },
      },
    },
    async (request: FastifyRequest & { params: { provider: string } }, reply: FastifyReply) => {
      const hasPassword = await prisma.user.findUnique({
        where: { id: request.user!.userId },
        select: { passwordHash: true },
      })

      if (!hasPassword?.passwordHash) {
        return reply.status(400).send({ error: 'Cannot unlink last authentication method' })
      }

      await prisma.oAuthAccount.deleteMany({
        where: { userId: request.user!.userId, provider: request.params.provider },
      })

      return reply.send({ success: true })
    },
  )
}
