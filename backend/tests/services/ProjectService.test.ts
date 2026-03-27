import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProjectService } from '../../src/services/ProjectService'
import { BadRequestError, ForbiddenError, NotFoundError } from '../../src/utils/errors'

vi.mock('../../src/infrastructure/repositories/ProjectRepository', () => ({
  projectRepository: {
    findBySlug: vi.fn(),
    create: vi.fn(),
    addMember: vi.fn(),
    findMany: vi.fn(),
    findById: vi.fn(),
    isMember: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listMembers: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
  },
}))

import { projectRepository } from '../../src/infrastructure/repositories/ProjectRepository'

const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  slug: 'test-project',
  description: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  isArchived: false,
}

describe('ProjectService', () => {
  let service: ProjectService

  beforeEach(() => {
    service = new ProjectService()
    vi.clearAllMocks()
  })

  describe('createProject', () => {
    it('creates a project and adds creator as member', async () => {
      vi.mocked(projectRepository.findBySlug).mockResolvedValue(null)
      vi.mocked(projectRepository.create).mockResolvedValue(mockProject)
      vi.mocked(projectRepository.addMember).mockResolvedValue({} as any)

      const result = await service.createProject(
        { name: 'Test Project', createdById: 'user-1' },
        'role-admin'
      )

      expect(projectRepository.create).toHaveBeenCalledOnce()
      expect(projectRepository.addMember).toHaveBeenCalledWith({
        projectId: mockProject.id,
        userId: 'user-1',
        roleId: 'role-admin',
      })
      expect(result).toEqual(mockProject)
    })

    it('throws BadRequestError if slug already exists', async () => {
      vi.mocked(projectRepository.findBySlug).mockResolvedValue(mockProject)

      await expect(
        service.createProject({ name: 'Test Project', createdById: 'user-1' }, 'role-admin')
      ).rejects.toThrow(BadRequestError)
    })
  })

  describe('getProject', () => {
    it('returns project for member', async () => {
      vi.mocked(projectRepository.findById).mockResolvedValue(mockProject)
      vi.mocked(projectRepository.isMember).mockResolvedValue(true)

      const result = await service.getProject('proj-1', 'user-1')
      expect(result).toEqual(mockProject)
    })

    it('throws NotFoundError if project not found', async () => {
      vi.mocked(projectRepository.findById).mockResolvedValue(null)

      await expect(service.getProject('proj-1', 'user-1')).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError if user is not a member', async () => {
      vi.mocked(projectRepository.findById).mockResolvedValue(mockProject)
      vi.mocked(projectRepository.isMember).mockResolvedValue(false)

      await expect(service.getProject('proj-1', 'user-2')).rejects.toThrow(ForbiddenError)
    })
  })

  describe('deleteProject', () => {
    it('deletes project when user is a member', async () => {
      vi.mocked(projectRepository.findById).mockResolvedValue(mockProject)
      vi.mocked(projectRepository.isMember).mockResolvedValue(true)
      vi.mocked(projectRepository.delete).mockResolvedValue(mockProject)

      await service.deleteProject('proj-1', 'user-1')
      expect(projectRepository.delete).toHaveBeenCalledWith('proj-1')
    })
  })

  describe('updateProject', () => {
    it('updates project fields', async () => {
      const updated = { ...mockProject, name: 'Updated Name' }
      vi.mocked(projectRepository.findById).mockResolvedValue(mockProject)
      vi.mocked(projectRepository.isMember).mockResolvedValue(true)
      vi.mocked(projectRepository.update).mockResolvedValue(updated)

      const result = await service.updateProject('proj-1', 'user-1', { name: 'Updated Name' })
      expect(result.name).toBe('Updated Name')
    })
  })
})
