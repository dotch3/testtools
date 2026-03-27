import type { FastifyInstance } from "fastify"
import { executionService } from "../../../services/ExecutionService.js"

export async function executionRoutes(app: FastifyInstance) {
  app.get(
    "/test-plans/:testPlanId/executions",
    {
      schema: {
        tags: ["Executions"],
        summary: "List executions for a test plan",
        params: {
          type: "object",
          properties: {
            testPlanId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { testPlanId } = request.params as { testPlanId: string }
      return executionService.findByTestPlan(testPlanId)
    }
  )

  app.post(
    "/executions",
    {
      schema: {
        tags: ["Executions"],
        summary: "Create execution for a test case",
        body: {
          type: "object",
          required: ["testCaseId", "testPlanId"],
          properties: {
            testCaseId: { type: "string" },
            testPlanId: { type: "string" },
            environment: { type: "string" },
            platform: { type: "string" },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const body = request.body as {
        testCaseId: string
        testPlanId: string
        environment?: string
        platform?: string
      }

      const execution = await executionService.create({
        testCaseId: body.testCaseId,
        testPlanId: body.testPlanId,
        executedById: user.userId,
        environment: body.environment,
        platform: body.platform,
      })

      return reply.status(201).send(execution)
    }
  )

  app.post(
    "/suites/:suiteId/cases/:caseId/executions",
    {
      schema: {
        tags: ["Executions"],
        summary: "Create execution for a test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
            caseId: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            testPlanId: { type: "string" },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { caseId, testPlanId } = request.params as { caseId: string; testPlanId: string }

      const execution = await executionService.create({
        testCaseId: caseId,
        testPlanId,
        executedById: user.userId,
      })

      return reply.status(201).send(execution)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/executions/:id",
    {
      schema: {
        tags: ["Executions"],
        summary: "Get execution details",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const execution = await executionService.findById(id)
      if (!execution) {
        throw new Error("Execution not found")
      }
      return execution
    }
  )

  app.post<{ Params: { id: string } }>(
    "/executions/:id/start",
    {
      schema: {
        tags: ["Executions"],
        summary: "Start an execution",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      return executionService.startExecution(id)
    }
  )

  app.post<{ Params: { id: string } }>(
    "/executions/:id/complete",
    {
      schema: {
        tags: ["Executions"],
        summary: "Complete an execution",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      return executionService.completeExecution(id)
    }
  )

  app.patch<{ Params: { id: string } }>(
    "/executions/:id",
    {
      schema: {
        tags: ["Executions"],
        summary: "Update execution",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            statusId: { type: "string" },
            notes: { type: "string" },
            durationMs: { type: "number" },
            environment: { type: "string" },
            platform: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        statusId?: string
        notes?: string
        durationMs?: number
        environment?: string
        platform?: string
      }
      return executionService.update(id, body)
    }
  )

  app.post<{ Params: { id: string; bugId: string } }>(
    "/executions/:id/bugs/:bugId",
    {
      schema: {
        tags: ["Executions"],
        summary: "Link bug to execution",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            bugId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, bugId } = request.params as { id: string; bugId: string }
      await executionService.linkBug(id, bugId)
      return reply.status(204).send()
    }
  )

  app.delete<{ Params: { id: string; bugId: string } }>(
    "/executions/:id/bugs/:bugId",
    {
      schema: {
        tags: ["Executions"],
        summary: "Unlink bug from execution",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            bugId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id, bugId } = request.params as { id: string; bugId: string }
      await executionService.unlinkBug(id, bugId)
      return reply.status(204).send()
    }
  )

  app.post<{ Params: { id: string } }>(
    "/executions/:id/step-results",
    {
      schema: {
        tags: ["Executions"],
        summary: "Add or update step result",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["stepOrder", "status"],
          properties: {
            stepOrder: { type: "integer" },
            status: { type: "string", enum: ["pass", "fail", "blocked", "skipped"] },
            actualResult: { type: "string" },
            notes: { type: "string" },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { id } = request.params as { id: string }
      const body = request.body as {
        stepOrder: number
        status: "pass" | "fail" | "blocked" | "skipped"
        actualResult?: string
        notes?: string
      }

      const stepResult = await executionService.addStepResult({
        executionId: id,
        stepOrder: body.stepOrder,
        status: body.status,
        actualResult: body.actualResult,
        notes: body.notes,
        executedById: user.userId,
      })

      return reply.status(201).send(stepResult)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/executions/:id/step-results",
    {
      schema: {
        tags: ["Executions"],
        summary: "Get step results for an execution",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      return executionService.getStepResults(id)
    }
  )

  app.delete<{ Params: { id: string; stepResultId: string } }>(
    "/executions/:id/step-results/:stepResultId",
    {
      schema: {
        tags: ["Executions"],
        summary: "Delete step result",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
            stepResultId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { stepResultId } = request.params as { id: string; stepResultId: string }
      await executionService.deleteStepResult(stepResultId)
      return reply.status(204).send()
    }
  )
}
