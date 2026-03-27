import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import { prisma } from '../../../../infrastructure/database/prisma.js'
import { validatePassword } from '../../../../utils/passwordPolicy.js'
import { permissionGuard } from '../../plugins/permissionGuard.js'
import { getMailAdapter } from '../../../../infrastructure/mail/mailFactory.js'
import { logger } from '../../../../logger.js'

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

  app.post<{ Body: { email: string; name?: string; roleId: string } }>(
    '/admin/users/invite',
    {
      preHandler: [permissionGuard('user', 'create')],
      schema: {
        tags: ['Admin'],
        summary: 'Invite user by email',
        body: {
          type: 'object',
          required: ['email', 'roleId'],
          properties: {
            email: { type: 'string' },
            name: { type: 'string' },
            roleId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, name, roleId } = request.body

      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return reply.status(400).send({ error: 'User with this email already exists' })
      }

      const tempPassword = randomBytes(16).toString('hex')
      const passwordHash = await bcrypt.hash(tempPassword, 12)

      const user = await prisma.user.create({
        data: {
          email,
          name,
          roleId,
          passwordHash,
          forcePasswordChange: true,
        },
      })

      try {
        const mailAdapter = getMailAdapter()
        if (mailAdapter) {
          await mailAdapter.sendWelcome(email, name || undefined)
          logger.info({ action: 'user.invited', userId: user.id, email })
        } else {
          logger.warn({ action: 'user.invited_no_mail', userId: user.id, email })
        }
      } catch (err) {
        logger.error({ action: 'user.invite_failed', userId: user.id, error: String(err) })
      }

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

  app.patch<{ Params: { id: string }; Body: { name?: string; email?: string; roleId?: string; forcePasswordChange?: boolean; locked?: boolean } }>(
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
            name: { type: 'string' },
            email: { type: 'string' },
            roleId: { type: 'string' },
            forcePasswordChange: { type: 'boolean' },
            locked: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const data: any = {}
      if (request.body.name) data.name = request.body.name
      if (request.body.email) data.email = request.body.email
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
        include: { role: true },
      })
      return reply.send({ id: user.id, email: user.email, name: user.name, roleId: user.roleId })
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
