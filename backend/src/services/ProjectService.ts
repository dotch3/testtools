import {
  projectRepository,
  type CreateProjectData,
  type UpdateProjectData,
  type AddMemberData,
} from "../infrastructure/repositories/ProjectRepository.js"
import type { Project, ProjectMember } from "@prisma/client"
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/errors.js"

export interface ProjectWithCounts extends Project {
  _count?: {
    members: number
    testPlans: number
  }
}

export class ProjectService {
  async createProject(
    data: CreateProjectData,
    defaultRoleId: string
  ): Promise<Project> {
    const existing = await projectRepository.findBySlug(
      this.generateSlug(data.name)
    )
    if (existing) {
      throw new BadRequestError("A project with this name already exists")
    }

    const project = await projectRepository.create(data)

    await projectRepository.addMember({
      projectId: project.id,
      userId: data.createdById,
      roleId: defaultRoleId,
    })

    return project
  }

  async listProjects(
    userId: string,
    options?: { includeArchived?: boolean; limit?: number; offset?: number }
  ): Promise<ProjectWithCounts[]> {
    return projectRepository.findMany({
      userId,
      ...options,
    })
  }

  async getProject(projectId: string, userId: string): Promise<Project> {
    const project = await projectRepository.findById(projectId)
    if (!project) {
      throw new NotFoundError("Project not found")
    }

    const isMember = await projectRepository.isMember(projectId, userId)
    if (!isMember) {
      throw new ForbiddenError("You don't have access to this project")
    }

    return project
  }

  async updateProject(
    projectId: string,
    userId: string,
    data: UpdateProjectData
  ): Promise<Project> {
    await this.getProject(projectId, userId)
    return projectRepository.update(projectId, data)
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    await this.getProject(projectId, userId)
    await projectRepository.delete(projectId)
  }

  async listMembers(projectId: string, userId: string): Promise<ProjectMember[]> {
    await this.getProject(projectId, userId)
    return projectRepository.listMembers(projectId)
  }

  async addMember(
    projectId: string,
    userId: string,
    data: AddMemberData
  ): Promise<ProjectMember> {
    await this.getProject(projectId, userId)

    const existing = await projectRepository.isMember(data.userId, data.userId)
    if (existing) {
      throw new BadRequestError("User is already a member of this project")
    }

    return projectRepository.addMember(data)
  }

  async removeMember(
    projectId: string,
    requestingUserId: string,
    memberUserId: string
  ): Promise<void> {
    await this.getProject(projectId, requestingUserId)
    await projectRepository.removeMember(projectId, memberUserId)
  }

  async updateMemberRole(
    projectId: string,
    requestingUserId: string,
    memberUserId: string,
    roleId: string
  ): Promise<ProjectMember> {
    await this.getProject(projectId, requestingUserId)
    return projectRepository.updateMemberRole(projectId, memberUserId, roleId)
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }
}

export const projectService = new ProjectService()
