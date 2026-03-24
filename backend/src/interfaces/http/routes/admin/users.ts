import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcrypt'
import { prisma } from '../../../../infrastructure/database/prisma.js'
import { validatePassword } from '../../../../utils/passwordPolicy.js'
import { permissionGuard } from '../../plugins/permissionGuard.js'

export async function adminUsersRoutes(app: FastifyInstance) {

  app.get<{ Querystring: { roleId?: string; search?: string } }>(
    '/admin/users',
    {
      preHandler: [permissionGuard('user', 'read')],
      schema: {
        tags: ['Admin'],
        summary: 'List all users',
        querystring: {
          type: 'object',
          properties: {
            roleId: { type: 'string' },
            search: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { roleId, search } = request.query
      const users = await prisma.user.findMany({
        where: {
          ...(roleId ? { roleId } : {}),
          ...(search ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          lastLoginAt: true,
          lockedUntil: true,
          createdAt: true,
          role: { select: { name: true, label: true, color: true } },
        },
      })
      return reply.send(users)
    },
  )

  app.post<{ Body: { email: string; password?: string; name?: string; roleId: string } }>(
    '/admin/users',
    {
      preHandler: [permissionGuard('user', 'create')],
      schema: {
        tags: ['Admin'],
        summary: 'Create user (admin only)',
        body: {
          type: 'object',
          required: ['email', 'roleId'],
          properties: {
            email: { type: 'string' },
            password: { type: 'string' },
            name: { type: 'string' },
            roleId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, name, roleId } = request.body

      if (password) {
        const validation = validatePassword(password)
        if (!validation.valid) {
          return reply.status(400).send({ error: validation.errors.join('. ') })
        }
      }

      const passwordHash = password ? await bcrypt.hash(password, 12) : null

      const user = await prisma.user.create({
        data: {
          email,
          name,
          roleId,
          passwordHash,
          forcePasswordChange: !!password,
        },
      })

      return reply.status(201).send({ id: user.id, email: user.email })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/admin/users/:id',
    {
      preHandler: [permissionGuard('user', 'read')],
      schema: {
        tags: ['Admin'],
        summary: 'Get user by ID',
        params: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          emailVerified: true,
          lastLoginAt: true,
          lockedUntil: true,
          forcePasswordChange: true,
          createdAt: true,
          role: true,
        },
      })
      if (!user) return reply.status(404).send({ error: 'User not found' })
      return reply.send(user)
    },
  )

  app.patch<{ Params: { id: string }; Body: { roleId?: string; forcePasswordChange?: boolean; locked?: boolean } }>(
    '/admin/users/:id',
    {
      preHandler: [permissionGuard('user', 'update')],
      schema: {
        tags: ['Admin'],
        summary: 'Update user (admin only)',
        params: { type: 'object', properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            roleId: { type: 'string' },
            forcePasswordChange: { type: 'boolean' },
            locked: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const data: any = {}
      if (request.body.roleId) data.roleId = request.body.roleId
      if (typeof request.body.forcePasswordChange === 'boolean') data.forcePasswordChange = request.body.forcePasswordChange
      if (typeof request.body.locked === 'boolean') {
        data.lockedUntil = request.body.locked
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : null
      }

      const user = await prisma.user.update({
        where: { id: request.params.id },
        data,
      })
      return reply.send({ id: user.id, email: user.email })
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/admin/users/:id',
    {
      preHandler: [permissionGuard('user', 'delete')],
      schema: {
        tags: ['Admin'],
        summary: 'Deactivate user (admin only)',
        params: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      await prisma.user.update({
        where: { id: request.params.id },
        data: { lockedUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      })
      return reply.send({ success: true })
    },
  )

  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/unlock',
    {
      preHandler: [permissionGuard('user', 'update')],
      schema: {
        tags: ['Admin'],
        summary: 'Manually unlock user account',
        params: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { lockedUntil: null, failedLoginCount: 0 },
      })
      return reply.send({ success: true, userId: user.id })
    },
  )
}
