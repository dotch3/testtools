// backend/src/infrastructure/storage/S3StorageAdapter.ts
// S3-compatible storage adapter — used when STORAGE_PROVIDER=s3.
// Works with AWS S3, Cloudflare R2, and MinIO.
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { IFileStorageAdapter } from '../../domain/interfaces/IFileStorageAdapter.js'
import type { Config } from '../../config.js'

export class S3StorageAdapter implements IFileStorageAdapter {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(cfg: Config) {
    this.bucket = cfg.S3_BUCKET
    this.client = new S3Client({
      region: cfg.S3_REGION,
      // S3_ENDPOINT is required for R2/MinIO; leave empty for AWS S3
      ...(cfg.S3_ENDPOINT ? { endpoint: cfg.S3_ENDPOINT } : {}),
      credentials: {
        accessKeyId: cfg.S3_ACCESS_KEY_ID!,
        secretAccessKey: cfg.S3_SECRET_ACCESS_KEY!,
      },
    })
  }

  async save(path: string, buffer: Buffer, mimeType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: path, Body: buffer, ContentType: mimeType }),
    )
    return path
  }

  async delete(path: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path }))
  }

  async getUrl(path: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: path }),
      { expiresIn: 3600 }, // 1-hour signed URL
    )
  }
}
