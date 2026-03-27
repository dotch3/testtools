import { prisma } from "../infrastructure/database/prisma.js"
import type { TestSuite, Prisma } from "@prisma/client"
import { NotFoundError, BadRequestError } from "../utils/errors.js"

export interface CreateSuiteData {
  testPlanId: string
  name: string
  description?: string
  parentSuiteId?: string | null
  orderIndex?: number
  createdById: string
}

export interface UpdateSuiteData {
  name?: string
  description?: string
  parentSuiteId?: string | null
  orderIndex?: number
}

export interface SuiteWithChildren extends TestSuite {
  children: SuiteWithChildren[]
  _count?: {
    cases: number
  }
}

export class TestSuiteService {
  async create(data: CreateSuiteData): Promise<TestSuite> {
    if (data.parentSuiteId) {
      const parent = await this.findById(data.parentSuiteId)
      if (!parent) {
        throw new NotFoundError("Parent suite not found")
      }
      if (parent.testPlanId !== data.testPlanId) {
        throw new BadRequestError("Parent suite must belong to the same test plan")
      }
    }

    return prisma.testSuite.create({
      data: {
        testPlanId: data.testPlanId,
        name: data.name,
        description: data.description,
        parentSuiteId: data.parentSuiteId,
        orderIndex: data.orderIndex ?? 0,
        createdById: data.createdById,
      },
    })
  }

  async findById(id: string): Promise<TestSuite | null> {
    return prisma.testSuite.findUnique({
      where: { id },
    })
  }

  async findAll(): Promise<Array<TestSuite & { testPlan?: { id: string; name: string } }>> {
    return prisma.testSuite.findMany({
      include: {
        testPlan: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    })
  }

  async getTree(testPlanId: string): Promise<SuiteWithChildren[]> {
    const suites = await prisma.testSuite.findMany({
      where: { testPlanId },
      include: {
        _count: {
          select: { cases: true },
        },
      },
      orderBy: { orderIndex: "asc" },
    })

    return this.buildTree(suites)
  }

  private buildTree(suites: Array<TestSuite & { _count?: { cases: number } }>): SuiteWithChildren[] {
    const map = new Map<string, SuiteWithChildren>()
    const roots: SuiteWithChildren[] = []

    suites.forEach((suite) => {
      map.set(suite.id, { ...suite, children: [] })
    })

    suites.forEach((suite) => {
      const node = map.get(suite.id)!
      if (suite.parentSuiteId) {
        const parent = map.get(suite.parentSuiteId)
        if (parent) {
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  async update(id: string, data: UpdateSuiteData): Promise<TestSuite> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Suite not found")
    }

    if (data.parentSuiteId !== undefined && data.parentSuiteId !== null) {
      if (data.parentSuiteId === id) {
        throw new BadRequestError("Suite cannot be its own parent")
      }

      const descendants = await this.getDescendantIds(id)
      if (descendants.includes(data.parentSuiteId)) {
        throw new BadRequestError("Cannot move suite under its own descendant")
      }
    }

    return prisma.testSuite.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        parentSuiteId: data.parentSuiteId,
        orderIndex: data.orderIndex,
      },
    })
  }

  async delete(id: string): Promise<void> {
    const suite = await this.findById(id)
    if (!suite) {
      throw new NotFoundError("Suite not found")
    }

    const childSuites = await prisma.testSuite.count({
      where: { parentSuiteId: id },
    })

    if (childSuites > 0) {
      throw new BadRequestError("Cannot delete suite with child suites. Delete children first.")
    }

    const caseCount = await prisma.testCase.count({
      where: { suiteId: id },
    })

    if (caseCount > 0) {
      throw new BadRequestError("Cannot delete suite with test cases. Move or delete cases first.")
    }

    await prisma.testSuite.delete({
      where: { id },
    })
  }

  async moveSuite(id: string, newParentId: string | null, newOrderIndex: number): Promise<TestSuite> {
    return this.update(id, {
      parentSuiteId: newParentId,
      orderIndex: newOrderIndex,
    })
  }

  private async getDescendantIds(suiteId: string): Promise<string[]> {
    const descendants: string[] = []
    const queue: string[] = [suiteId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const children = await prisma.testSuite.findMany({
        where: { parentSuiteId: currentId },
        select: { id: true },
      })

      children.forEach((child: { id: string }) => {
        descendants.push(child.id)
        queue.push(child.id)
      })
    }

    return descendants
  }

  async copy(id: string, targetPlanId: string, createdById: string): Promise<TestSuite> {
    const original = await this.findById(id)
    if (!original) {
      throw new NotFoundError("Suite not found")
    }

    const copiedSuite = await prisma.testSuite.create({
      data: {
        testPlanId: targetPlanId,
        name: `${original.name} (Copy)`,
        description: original.description,
        orderIndex: original.orderIndex,
        createdById,
        copiedFromId: original.id,
      },
    })

    const originalCases = await prisma.testCase.findMany({
      where: { suiteId: id },
    })

    for (const originalCase of originalCases) {
      await prisma.testCase.create({
        data: {
          suiteId: copiedSuite.id,
          title: originalCase.title,
          description: originalCase.description,
          preconditions: originalCase.preconditions,
          steps: originalCase.steps as Prisma.InputJsonValue,
          priorityId: originalCase.priorityId,
          typeId: originalCase.typeId,
          automationScriptRef: originalCase.automationScriptRef,
          createdById,
          copiedFromId: originalCase.id,
        },
      })
    }

    return copiedSuite
  }

  async move(id: string, targetPlanId: string): Promise<TestSuite> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new NotFoundError("Suite not found")
    }

    return prisma.testSuite.update({
      where: { id },
      data: {
        testPlanId: targetPlanId,
      },
    })
  }
}

export const testSuiteService = new TestSuiteService()
