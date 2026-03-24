import { prisma } from "../infrastructure/database/prisma.js"
import type { Bug } from "@prisma/client"
import { NotFoundError, BadRequestError } from "../utils/errors.js"

export interface CreateBugData {
  projectId: string
  title: string
  description?: string
  statusId: string
  priorityId: string
  severityId: string
  sourceId: string
  reportedById: string
  assignedToId?: string
  externalId?: string
  externalUrl?: string
}

export interface UpdateBugData {
  title?: string
  description?: string
  statusId?: string
  priorityId?: string
  severityId?: string
  assignedToId?: string | null
}

export class BugService {
  async create(data: CreateBugData): Promise<Bug> {
    return prisma.bug.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        statusId: data.statusId,
        priorityId: data.priorityId,
        severityId: data.severityId,
        sourceId: data.sourceId,
        reportedById: data.reportedById,
        assignedToId: data.assignedToId,
        externalId: data.externalId,
        externalUrl: data.externalUrl,
      },
    })
  }

  async findById(id: string): Promise<Bug | null> {
    return prisma.bug.findUnique({
      where: { id },
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  async findByProject(projectId: string): Promise<Bug[]> {
    return prisma.bug.findMany({
      where: { projectId },
      include: {
        status: true,
        priority: true,
        severity: true,
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async findByExecution(executionId: string): Promise<Bug[]> {
    return prisma.bug.findMany({
      where: {
        executions: {
          some: { executionId },
        },
      },
      include: {
        status: true,
        priority: true,
        severity: true,
      },
    })
  }

  async update(id: string, data: UpdateBugData): Promise<Bug> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Bug not found")
    }

    return prisma.bug.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        statusId: data.statusId,
        priorityId: data.priorityId,
        severityId: data.severityId,
        assignedToId: data.assignedToId,
      },
    })
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Bug not found")
    }

    await prisma.bug.delete({
      where: { id },
    })
  }

  async linkToExecution(bugId: string, executionId: string): Promise<void> {
    await prisma.bugTestExecution.upsert({
      where: {
        bugId_executionId: { bugId, executionId },
      },
      create: { bugId, executionId },
      update: {},
    })
  }

  async unlinkFromExecution(bugId: string, executionId: string): Promise<void> {
    await prisma.bugTestExecution.delete({
      where: {
        bugId_executionId: { bugId, executionId },
      },
    })
  }

  async getLinkedExecutions(bugId: string): Promise<string[]> {
    const links = await prisma.bugTestExecution.findMany({
      where: { bugId },
      select: { executionId: true },
    })
    return links.map((l) => l.executionId)
  }

  async getStats(projectId: string): Promise<{
    total: number
    open: number
    closed: number
    critical: number
  }> {
    const [total, open, closed, critical] = await Promise.all([
      prisma.bug.count({ where: { projectId } }),
      prisma.bug.count({
        where: {
          projectId,
          status: {
            systemKey: { not: "closed" },
          },
        },
      }),
      prisma.bug.count({
        where: {
          projectId,
          status: {
            systemKey: "closed",
          },
        },
      }),
      prisma.bug.count({
        where: {
          projectId,
          severity: {
            systemKey: "critical",
          },
        },
      }),
    ])

    return { total, open, closed, critical }
  }
}

export const bugService = new BugService()
