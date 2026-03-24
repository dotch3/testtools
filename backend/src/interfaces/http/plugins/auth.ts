import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../../../config.js'
import { JwtService } from '../../../services/JwtService.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { userId: string; email: string; roleId: string }
  }
}

export default fp(async (app: FastifyInstance) => {
  const jwtService = new JwtService(
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN,
    config.JWT_REFRESH_EXPIRES_IN,
  )

  app.decorateRequest('user', undefined)

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url === '/') return
    if (request.url === '/api/v1') return
    if (request.url.startsWith('/api/v1/auth/')) return
    if (request.url.startsWith('/docs')) return
    if (request.url === '/api/v1/health') return
    if (request.url.startsWith('/api/v1/frontend-logs')) return

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.slice(7)
    try {
      const payload = jwtService.verifyAccessToken(token)
      request.user = payload
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid or expired token' })
    }
  })
})
