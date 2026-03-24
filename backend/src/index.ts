// Server entry point — validates config, runs first-boot init, starts Fastify.
import { config } from './config.js'
import { logger } from './logger.js'
import { buildApp } from './app.js'

async function start() {
  const app = await buildApp()

  try {
    await app.listen({ port: 3001, host: '0.0.0.0' })
    logger.info({ action: 'server.start', port: 3001 }, 'teststool backend started')
  } catch (err) {
    logger.error({ action: 'server.start', error: err }, 'Failed to start server')
    process.exit(1)
  }
}

start()
