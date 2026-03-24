// backend/src/infrastructure/storage/LocalStorageAdapter.ts
import { writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import type { IFileStorageAdapter } from '../../domain/interfaces/IFileStorageAdapter.js'

export class LocalStorageAdapter implements IFileStorageAdapter {
  constructor(private readonly basePath: string) {}

  async save(path: string, buffer: Buffer, _mimeType: string): Promise<string> {
    const fullPath = join(this.basePath, path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, buffer)
    return path
  }

  async delete(path: string): Promise<void> {
    unlinkSync(join(this.basePath, path))
  }

  // Local files are served through GET /api/v1/attachments/:id/file
  // so only the relative path is stored and returned here.
  async getUrl(path: string): Promise<string> {
    return path
  }
}
