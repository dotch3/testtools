import Fastify from 'fastify'
import swaggerPlugin from './interfaces/http/plugins/swagger.js'
import corsPlugin from './interfaces/http/plugins/cors.js'
import authPlugin from './interfaces/http/plugins/auth.js'
import auditLogPlugin from './interfaces/http/plugins/auditLog.js'
import { healthRoutes } from './interfaces/http/routes/health.js'
import { authRoutes } from './interfaces/http/routes/auth.js'
import { profileRoutes } from './interfaces/http/routes/profile.js'
import { projectRoutes } from './interfaces/http/routes/projects.js'
import { adminUsersRoutes } from './interfaces/http/routes/admin/users.js'
import { logger } from './logger.js'

const fastifyLogger = Object.assign(Object.create(Object.getPrototypeOf(logger)), logger, {
  fatal: logger.error.bind(logger),
  trace: logger.debug.bind(logger),
  child: (bindings: Record<string, unknown>) => {
    const child = logger.child(bindings) as typeof logger & { fatal: typeof logger.error; trace: typeof logger.debug }
    child.fatal = child.error.bind(child)
    child.trace = child.debug.bind(child)
    return child
  },
})

export async function buildApp() {
  const app = Fastify({
    loggerInstance: fastifyLogger,
    disableRequestLogging: true,
  })

  await app.register(corsPlugin)
  await app.register(swaggerPlugin)
  await app.register(auditLogPlugin)
  await app.register(authPlugin)

  app.get('/', {
    schema: { hide: true },
  }, async (_, reply) => {
    return reply.redirect('/docs')
  })

  app.get('/api/v1', {
    schema: { hide: true },
  }, async (_, reply) => {
    return reply.redirect('/docs')
  })

  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1' })
  await app.register(profileRoutes, { prefix: '/api/v1' })
  await app.register(projectRoutes, { prefix: '/api/v1' })
  await app.register(adminUsersRoutes, { prefix: '/api/v1' })

  return app
}
