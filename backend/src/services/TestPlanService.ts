import { prisma } from "../infrastructure/database/prisma.js"
import type { TestPlan } from "@prisma/client"
import { NotFoundError, BadRequestError } from "../utils/errors.js"

export interface CreateTestPlanData {
  projectId: string
  name: string
  description?: string
  statusId: string
  startDate?: Date
  endDate?: Date
  createdById: string
}

export interface UpdateTestPlanData {
  name?: string
  description?: string
  statusId?: string
  startDate?: Date | null
  endDate?: Date | null
}

export class TestPlanService {
  async create(data: CreateTestPlanData): Promise<TestPlan> {
    return prisma.testPlan.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        statusId: data.statusId,
        startDate: data.startDate,
        endDate: data.endDate,
        createdById: data.createdById,
      },
    })
  }

  async findById(id: string): Promise<TestPlan | null> {
    return prisma.testPlan.findUnique({
      where: { id },
    })
  }

  async findByProject(projectId: string): Promise<TestPlan[]> {
    return prisma.testPlan.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { suites: true, executions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async update(id: string, data: UpdateTestPlanData): Promise<TestPlan> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test plan not found")
    }

    return prisma.testPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        statusId: data.statusId,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    })
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test plan not found")
    }

    await prisma.testPlan.delete({
      where: { id },
    })
  }

  async clone(id: string, createdById: string): Promise<TestPlan> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test plan not found")
    }

    const cloned = await prisma.testPlan.create({
      data: {
        projectId: existing.projectId,
        name: `${existing.name} (Copy)`,
        description: existing.description,
        statusId: existing.statusId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        createdById,
      },
    })

    const suites = await prisma.testSuite.findMany({
      where: { testPlanId: id },
    })

    if (suites.length > 0) {
      const suiteIdMap = new Map<string, string>()

      for (const suite of suites) {
        const newSuite = await prisma.testSuite.create({
          data: {
            testPlanId: cloned.id,
            name: suite.name,
            description: suite.description,
            parentSuiteId: suite.parentSuiteId
              ? suiteIdMap.get(suite.parentSuiteId) ?? null
              : null,
            orderIndex: suite.orderIndex,
            createdById,
          },
        })
        suiteIdMap.set(suite.id, newSuite.id)
      }
    }

    return cloned
  }

  async archive(_id: string): Promise<TestPlan> {
    throw new Error("Archive not implemented - field does not exist in schema")
  }
}

export const testPlanService = new TestPlanService()
