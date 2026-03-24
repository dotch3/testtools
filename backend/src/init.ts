// backend/src/init.ts
// First-boot initialization — runs once before the server starts accepting requests.
// Creates required filesystem directories for local file storage.
import { mkdirSync } from 'fs'
import { config } from './config.js'
import { logger } from './logger.js'

export async function runInit(): Promise<void> {
  // Create upload directory structure for local storage.
  // Safe to call every boot — mkdirSync with recursive:true is idempotent.
  if (config.STORAGE_PROVIDER === 'local') {
    const dirs = [
      config.STORAGE_PATH,
      config.BACKUP_PATH,
      config.LOG_PATH,
    ]
    for (const dir of dirs) {
      mkdirSync(dir, { recursive: true })
      logger.debug({ action: 'init.mkdir', dir }, `Ensured directory exists: ${dir}`)
    }
  }

  logger.info({ action: 'init.complete' }, 'First-boot init complete')
}
