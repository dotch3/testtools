import { prisma } from "../database/prisma.js"
import type { Project, ProjectMember } from "@prisma/client"

export interface CreateProjectData {
  name: string
  description?: string
  createdById: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  archivedAt?: Date | null
}

export interface ListProjectsOptions {
  userId: string
  includeArchived?: boolean
  limit?: number
  offset?: number
}

export interface AddMemberData {
  projectId: string
  userId: string
  roleId: string
}

export class ProjectRepository {
  async create(data: CreateProjectData): Promise<Project> {
    const slug = this.generateSlug(data.name)
    return prisma.project.create({
      data: {
        ...data,
        slug,
      },
    })
  }

  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id },
    })
  }

  async findBySlug(slug: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { slug },
    })
  }

  async findMany(options: ListProjectsOptions): Promise<Project[]> {
    return prisma.project.findMany({
      where: {
        members: {
          some: { userId: options.userId },
        },
        archivedAt: options.includeArchived ? undefined : null,
      },
      include: {
        _count: {
          select: {
            members: true,
            testPlans: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    })
  }

  async update(id: string, data: UpdateProjectData): Promise<Project> {
    const updateData: Record<string, unknown> = { ...data }
    if (data.name) {
      updateData.slug = this.generateSlug(data.name)
    }
    return prisma.project.update({
      where: { id },
      data: updateData,
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({
      where: { id },
    })
  }

  async addMember(data: AddMemberData): Promise<ProjectMember> {
    return prisma.projectMember.create({
      data,
    })
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId, userId },
      },
    })
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    roleId: string
  ): Promise<ProjectMember> {
    return prisma.projectMember.update({
      where: {
        projectId_userId: { projectId, userId },
      },
      data: { roleId },
    })
  }

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    return prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            label: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    })
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    })
    return !!member
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    const suffix = Date.now().toString(36)
    return `${base}-${suffix}`
  }
}

export const projectRepository = new ProjectRepository()
