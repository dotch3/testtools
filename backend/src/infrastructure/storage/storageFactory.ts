// backend/src/infrastructure/storage/storageFactory.ts
// Resolves the correct IFileStorageAdapter at startup based on STORAGE_PROVIDER env var.
import type { IFileStorageAdapter } from '../../domain/interfaces/IFileStorageAdapter.js'
import { LocalStorageAdapter } from './LocalStorageAdapter.js'
import { SupabaseStorageAdapter } from './SupabaseStorageAdapter.js'
import { S3StorageAdapter } from './S3StorageAdapter.js'
import { config } from '../../config.js'

export function createStorageAdapter(): IFileStorageAdapter {
  switch (config.STORAGE_PROVIDER) {
    case 'supabase':
      if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required when STORAGE_PROVIDER=supabase')
      }
      return new SupabaseStorageAdapter(config)

    case 's3':
      if (!config.S3_ACCESS_KEY_ID || !config.S3_SECRET_ACCESS_KEY) {
        throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required when STORAGE_PROVIDER=s3')
      }
      return new S3StorageAdapter(config)

    case 'local':
    default:
      return new LocalStorageAdapter(config.STORAGE_PATH)
  }
}

// Singleton — created once at startup
export const storageAdapter: IFileStorageAdapter = createStorageAdapter()
