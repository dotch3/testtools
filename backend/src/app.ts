// Fastify application factory.
// Registers plugins and routes. Exported as a factory so tests can call buildApp().
import Fastify from 'fastify'
import swaggerPlugin from './interfaces/http/plugins/swagger.js'
import corsPlugin from './interfaces/http/plugins/cors.js'
import { healthRoutes } from './interfaces/http/routes/health.js'
import { logger } from './logger.js'

// Fastify requires fatal and trace methods; wrap the Winston logger to provide them.
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
    disableRequestLogging: false,
  })

  // Plugins
  await app.register(corsPlugin)
  await app.register(swaggerPlugin)

  // Routes — all prefixed with /api/v1
  await app.register(healthRoutes, { prefix: '/api/v1' })

  return app
}
