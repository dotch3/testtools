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
        response: { 201: { type: "object" } },
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
}
