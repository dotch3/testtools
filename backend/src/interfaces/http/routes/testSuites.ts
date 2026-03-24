import type { FastifyInstance } from "fastify"
import { testSuiteService } from "../../../services/TestSuiteService.js"

export async function testSuiteRoutes(app: FastifyInstance) {
  app.get<{ Params: { testPlanId: string } }>(
    "/test-plans/:testPlanId/suites",
    {
      schema: {
        tags: ["Test Suites"],
        summary: "Get suite tree for a test plan",
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
      return testSuiteService.getTree(testPlanId)
    }
  )

  app.post<{ Params: { testPlanId: string } }>(
    "/test-plans/:testPlanId/suites",
    {
      schema: {
        tags: ["Test Suites"],
        summary: "Create a test suite",
        params: {
          type: "object",
          properties: {
            testPlanId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
            parentSuiteId: { type: "string" },
            orderIndex: { type: "number" },
          },
        },
        response: { 201: { type: "object" } },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { testPlanId } = request.params as { testPlanId: string }
      const body = request.body as {
        name: string
        description?: string
        parentSuiteId?: string
        orderIndex?: number
      }

      const suite = await testSuiteService.create({
        testPlanId,
        name: body.name,
        description: body.description,
        parentSuiteId: body.parentSuiteId,
        orderIndex: body.orderIndex,
        createdById: user.userId,
      })

      return reply.status(201).send(suite)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/suites/:id",
    {
      schema: {
        tags: ["Test Suites"],
        summary: "Get suite details",
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
      const suite = await testSuiteService.findById(id)
      if (!suite) {
        throw new Error("Suite not found")
      }
      return suite
    }
  )

  app.patch<{ Params: { id: string } }>(
    "/suites/:id",
    {
      schema: {
        tags: ["Test Suites"],
        summary: "Update test suite",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            parentSuiteId: { type: "string", nullable: true },
            orderIndex: { type: "number" },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        name?: string
        description?: string
        parentSuiteId?: string | null
        orderIndex?: number
      }

      return testSuiteService.update(id, {
        name: body.name,
        description: body.description,
        parentSuiteId: body.parentSuiteId,
        orderIndex: body.orderIndex,
      })
    }
  )

  app.delete<{ Params: { id: string } }>(
    "/suites/:id",
    {
      schema: {
        tags: ["Test Suites"],
        summary: "Delete test suite",
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
      await testSuiteService.delete(id)
      return reply.status(204).send()
    }
  )
}
