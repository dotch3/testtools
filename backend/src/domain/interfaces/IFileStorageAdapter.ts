// backend/src/domain/interfaces/IFileStorageAdapter.ts
// Abstraction over file storage providers (local, Supabase, S3).
// The concrete implementation is resolved at startup via storageFactory.

export interface IFileStorageAdapter {
  /**
   * Saves a file buffer at the given path.
   * Returns the storage path (local) or object key (cloud).
   */
  save(path: string, buffer: Buffer, mimeType: string): Promise<string>

  /**
   * Deletes a file by its storage path or object key.
   */
  delete(path: string): Promise<void>

  /**
   * Returns a URL to access the file.
   * For local storage: the file is served through the API (/attachments/:id/file).
   * For cloud storage: returns a signed URL valid for a short period.
   */
  getUrl(path: string): Promise<string>
}
