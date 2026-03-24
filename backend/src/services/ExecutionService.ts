import { prisma } from "../infrastructure/database/prisma.js"
import type { TestExecution, EnumValue } from "@prisma/client"
import { NotFoundError, BadRequestError } from "../utils/errors.js"

export interface CreateExecutionData {
  testCaseId: string
  testPlanId: string
  executedById: string
}

export interface UpdateExecutionData {
  statusId?: string
  notes?: string
  durationMs?: number
}

export class ExecutionService {
  async create(data: CreateExecutionData): Promise<TestExecution> {
    const testCase = await prisma.testCase.findUnique({
      where: { id: data.testCaseId },
    })

    if (!testCase) {
      throw new NotFoundError("Test case not found")
    }

    const draftStatus = await this.getDraftStatus()

    return prisma.testExecution.create({
      data: {
        testCaseId: data.testCaseId,
        testPlanId: data.testPlanId,
        executedById: data.executedById,
        statusId: draftStatus.id,
      },
    })
  }

  async findById(id: string): Promise<TestExecution | null> {
    return prisma.testExecution.findUnique({
      where: { id },
      include: {
        testCase: true,
        testPlan: true,
        executedBy: {
          select: { id: true, name: true, email: true },
        },
        bugs: {
          include: {
            bug: true,
          },
        },
      },
    })
  }

  async findByTestPlan(testPlanId: string): Promise<TestExecution[]> {
    return prisma.testExecution.findMany({
      where: { testPlanId },
      include: {
        testCase: {
          select: { id: true, title: true },
        },
        executedBy: {
          select: { id: true, name: true, email: true },
        },
        status: true,
        _count: {
          select: { bugs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async findByTestCase(testCaseId: string): Promise<TestExecution[]> {
    return prisma.testExecution.findMany({
      where: { testCaseId },
      include: {
        testCase: {
          select: { id: true, title: true },
        },
        executedBy: {
          select: { id: true, name: true, email: true },
        },
        status: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  async update(id: string, data: UpdateExecutionData): Promise<TestExecution> {
    const execution = await this.findById(id)
    if (!execution) {
      throw new NotFoundError("Execution not found")
    }

    return prisma.testExecution.update({
      where: { id },
      data: {
        statusId: data.statusId,
        notes: data.notes,
        durationMs: data.durationMs,
        executedAt: data.statusId ? new Date() : undefined,
      },
    })
  }

  async startExecution(id: string): Promise<TestExecution> {
    const inProgressStatus = await this.getInProgressStatus()
    return this.update(id, { statusId: inProgressStatus.id })
  }

  async completeExecution(id: string): Promise<TestExecution> {
    const completedStatus = await this.getCompletedStatus()
    return this.update(id, { statusId: completedStatus.id })
  }

  async linkBug(executionId: string, bugId: string): Promise<void> {
    await prisma.bugTestExecution.upsert({
      where: {
        bugId_executionId: { bugId, executionId },
      },
      create: { bugId, executionId },
      update: {},
    })
  }

  async unlinkBug(executionId: string, bugId: string): Promise<void> {
    await prisma.bugTestExecution.delete({
      where: {
        bugId_executionId: { bugId, executionId },
      },
    })
  }

  private async getDraftStatus(): Promise<EnumValue> {
    const status = await prisma.enumValue.findFirst({
      where: {
        enumType: { name: "execution_status" },
        systemKey: "draft",
      },
    })
    if (!status) throw new Error("Draft status not found")
    return status
  }

  private async getInProgressStatus(): Promise<EnumValue> {
    const status = await prisma.enumValue.findFirst({
      where: {
        enumType: { name: "execution_status" },
        systemKey: "in_progress",
      },
    })
    if (!status) throw new Error("In progress status not found")
    return status
  }

  private async getCompletedStatus(): Promise<EnumValue> {
    const status = await prisma.enumValue.findFirst({
      where: {
        enumType: { name: "execution_status" },
        systemKey: "completed",
      },
    })
    if (!status) throw new Error("Completed status not found")
    return status
  }
}

export const executionService = new ExecutionService()
