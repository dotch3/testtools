import { prisma } from "../infrastructure/database/prisma.js"
import type { Prisma } from "@prisma/client"
import type { TestCase } from "@prisma/client"
import { NotFoundError } from "../utils/errors.js"

export interface TestCaseStep {
  order: number
  action: string
  expectedResult: string
}

export interface CreateTestCaseData {
  suiteId: string
  title: string
  description?: string
  preconditions?: string
  steps?: TestCaseStep[]
  priorityId: string
  typeId: string
  automationScriptRef?: string
  createdById: string
}

export interface UpdateTestCaseData {
  title?: string
  description?: string
  preconditions?: string
  steps?: TestCaseStep[]
  priorityId?: string
  typeId?: string
  automationScriptRef?: string | null
}

export class TestCaseService {
  async create(data: CreateTestCaseData): Promise<TestCase> {
    return prisma.testCase.create({
      data: {
        suiteId: data.suiteId,
        title: data.title,
        description: data.description,
        preconditions: data.preconditions,
        steps: (data.steps ?? []) as unknown as Prisma.InputJsonValue,
        priorityId: data.priorityId,
        typeId: data.typeId,
        automationScriptRef: data.automationScriptRef,
        createdById: data.createdById,
      },
    })
  }

  async findById(id: string): Promise<TestCase | null> {
    return prisma.testCase.findUnique({
      where: { id },
    })
  }

  async findBySuite(suiteId: string): Promise<TestCase[]> {
    return prisma.testCase.findMany({
      where: { suiteId },
      include: {
        priority: true,
        type: true,
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })
  }

  async findByProject(projectId: string): Promise<TestCase[]> {
    return prisma.testCase.findMany({
      where: {
        suite: {
          testPlan: {
            projectId,
          },
        },
      },
      include: {
        suite: {
          include: {
            testPlan: true,
          },
        },
        priority: true,
        type: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async update(id: string, data: UpdateTestCaseData): Promise<TestCase> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test case not found")
    }

    return prisma.testCase.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        preconditions: data.preconditions,
        steps: data.steps as unknown as Prisma.InputJsonValue | undefined,
        priorityId: data.priorityId,
        typeId: data.typeId,
        automationScriptRef: data.automationScriptRef,
      },
    })
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Test case not found")
    }

    await prisma.testCase.delete({
      where: { id },
    })
  }

  async bulkCreate(
    suiteId: string,
    cases: Array<{
      title: string
      description?: string
      preconditions?: string
      steps?: TestCaseStep[]
      priorityId: string
      typeId: string
      createdById: string
    }>
  ): Promise<TestCase[]> {
    const results: TestCase[] = []

    for (const caseData of cases) {
      const created = await this.create({
        ...caseData,
        suiteId,
      })
      results.push(created)
    }

    return results
  }
}

export const testCaseService = new TestCaseService()
