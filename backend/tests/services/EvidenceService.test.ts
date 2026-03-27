import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    attachment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    bug: { findUnique: vi.fn() },
    testCase: { findUnique: vi.fn() },
    testExecution: { findUnique: vi.fn() },
    eTCharter: { findUnique: vi.fn() },
  },
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('test')),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from('test')),
  unlinkSync: vi.fn(),
}))

import { prisma } from '../../src/infrastructure/database/prisma'

const mockAttachment = {
  id: 'att-1',
  fileName: 'screenshot.png',
  fileType: 'image/png',
  fileSizeKb: 100,
  entityType: 'test_case',
  entityId: 'tc-1',
  projectId: 'proj-1',
  storagePath: 'test-cases/tc-1/uuid.png',
  uploadedById: 'user-1',
  createdAt: new Date(),
  data: undefined,
}

describe('EvidenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getByEntity', () => {
    it('returns attachments for an entity', async () => {
      vi.mocked(prisma.attachment.findMany).mockResolvedValue([mockAttachment] as any)

      const { EvidenceService } = await import('../../src/services/EvidenceService')
      const service = new EvidenceService()
      const result = await service.getByEntity('test_case', 'tc-1')

      expect(prisma.attachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'test_case', entityId: 'tc-1' },
        })
      )
      expect(result).toHaveLength(1)
      expect(result[0].fileName).toBe('screenshot.png')
    })

    it('returns empty array when no attachments', async () => {
      vi.mocked(prisma.attachment.findMany).mockResolvedValue([])

      const { EvidenceService } = await import('../../src/services/EvidenceService')
      const service = new EvidenceService()
      const result = await service.getByEntity('bug', 'bug-1')

      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('returns attachment with file data', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(mockAttachment as any)

      const { EvidenceService } = await import('../../src/services/EvidenceService')
      const service = new EvidenceService()
      const result = await service.getById('att-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('att-1')
      expect(result?.data).toBeInstanceOf(Buffer)
    })

    it('returns null when attachment not found', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null)

      const { EvidenceService } = await import('../../src/services/EvidenceService')
      const service = new EvidenceService()
      const result = await service.getById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('deletes attachment record and file', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(mockAttachment as any)
      vi.mocked(prisma.attachment.delete).mockResolvedValue(mockAttachment as any)

      const { EvidenceService } = await import('../../src/services/EvidenceService')
      const service = new EvidenceService()
      await service.delete('att-1')

      expect(prisma.attachment.delete).toHaveBeenCalledWith({ where: { id: 'att-1' } })
    })
  })
})
