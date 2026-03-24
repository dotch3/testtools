// backend/src/infrastructure/storage/SupabaseStorageAdapter.ts
// Supabase Storage adapter — used when STORAGE_PROVIDER=supabase.
import { createClient } from '@supabase/supabase-js'
import type { IFileStorageAdapter } from '../../domain/interfaces/IFileStorageAdapter.js'
import type { Config } from '../../config.js'

export class SupabaseStorageAdapter implements IFileStorageAdapter {
  private readonly bucket: string
  private readonly client: ReturnType<typeof createClient>

  constructor(cfg: Config) {
    this.bucket = cfg.SUPABASE_STORAGE_BUCKET
    this.client = createClient(cfg.SUPABASE_URL!, cfg.SUPABASE_SERVICE_KEY!)
  }

  async save(path: string, buffer: Buffer, mimeType: string): Promise<string> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, buffer, { contentType: mimeType, upsert: true })
    if (error) throw new Error(`Supabase upload failed: ${error.message}`)
    return path
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path])
    if (error) throw new Error(`Supabase delete failed: ${error.message}`)
  }

  async getUrl(path: string): Promise<string> {
    const { data } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, 3600) // 1-hour signed URL
    if (!data?.signedUrl) throw new Error('Failed to generate signed URL')
    return data.signedUrl
  }
}
