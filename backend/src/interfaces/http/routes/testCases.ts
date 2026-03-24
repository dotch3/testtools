import type { FastifyInstance } from "fastify"
import { testCaseService } from "../../../services/TestCaseService.js"

export async function testCaseRoutes(app: FastifyInstance) {
  app.get<{ Params: { suiteId: string } }>(
    "/suites/:suiteId/cases",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "List test cases in a suite",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { suiteId } = request.params as { suiteId: string }
      return testCaseService.findBySuite(suiteId)
    }
  )

  app.post<{ Params: { suiteId: string } }>(
    "/suites/:suiteId/cases",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Create a test case",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["title", "priorityId", "typeId"],
          properties: {
            title: { type: "string", minLength: 1 },
            description: { type: "string" },
            preconditions: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "number" },
                  action: { type: "string" },
                  expectedResult: { type: "string" },
                },
              },
            },
            priorityId: { type: "string" },
            typeId: { type: "string" },
            automationScriptRef: { type: "string" },
          },
        },
        response: { 201: { type: "object" } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { suiteId } = request.params as { suiteId: string }
      const body = request.body as {
        title: string
        description?: string
        preconditions?: string
        steps?: Array<{ order: number; action: string; expectedResult: string }>
        priorityId: string
        typeId: string
        automationScriptRef?: string
      }

      const testCase = await testCaseService.create({
        suiteId,
        title: body.title,
        description: body.description,
        preconditions: body.preconditions,
        steps: body.steps,
        priorityId: body.priorityId,
        typeId: body.typeId,
        automationScriptRef: body.automationScriptRef,
        createdById: user.userId,
      })

      return reply.status(201).send(testCase)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/cases/:id",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Get test case details",
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
      const testCase = await testCaseService.findById(id)
      if (!testCase) {
        throw new Error("Test case not found")
      }
      return testCase
    }
  )

  app.patch<{ Params: { id: string } }>(
    "/cases/:id",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Update test case",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            preconditions: { type: "string" },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "number" },
                  action: { type: "string" },
                  expectedResult: { type: "string" },
                },
              },
            },
            priorityId: { type: "string" },
            typeId: { type: "string" },
            automationScriptRef: { type: "string", nullable: true },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        title?: string
        description?: string
        preconditions?: string
        steps?: Array<{ order: number; action: string; expectedResult: string }>
        priorityId?: string
        typeId?: string
        automationScriptRef?: string | null
      }

      return testCaseService.update(id, {
        title: body.title,
        description: body.description,
        preconditions: body.preconditions,
        steps: body.steps,
        priorityId: body.priorityId,
        typeId: body.typeId,
        automationScriptRef: body.automationScriptRef,
      })
    }
  )

  app.delete<{ Params: { id: string } }>(
    "/cases/:id",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Delete test case",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      await testCaseService.delete(id)
      return reply.status(204).send()
    }
  )
}
