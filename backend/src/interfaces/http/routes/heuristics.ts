import type { FastifyInstance } from "fastify"
import { heuristicService } from "../../../services/HeuristicService.js"

export async function heuristicRoutes(app: FastifyInstance) {
  app.get(
    "/heuristics",
    {
      schema: {
        tags: ["Heuristics"],
        summary: "List all heuristics",
      },
    },
    async () => {
      return heuristicService.findAll()
    }
  )

  app.post(
    "/heuristics",
    {
      schema: {
        tags: ["Heuristics"],
        summary: "Create a heuristic",
        body: {
          type: "object",
          required: ["name", "template"],
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
            template: { type: "string", minLength: 1 },
            elements: {
              type: "object",
              properties: {
                risk: { type: "boolean" },
                coverage: { type: "boolean" },
                time: { type: "boolean" },
                style: { type: "boolean" },
              },
            },
            examples: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  charter: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        name: string
        description?: string
        template: string
        elements?: { risk?: boolean; coverage?: boolean; time?: boolean; style?: boolean }
        examples?: Array<{ charter: string; description?: string }>
      }

      const heuristic = await heuristicService.create({
        name: body.name,
        description: body.description,
        template: body.template,
        elements: body.elements,
        examples: body.examples,
      })

      return reply.status(201).send(heuristic)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/heuristics/:id",
    {
      schema: {
        tags: ["Heuristics"],
        summary: "Get heuristic details",
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
      const heuristic = await heuristicService.findById(id)
      if (!heuristic) throw new Error("Heuristic not found")
      return heuristic
    }
  )

  app.patch<{ Params: { id: string } }>(
    "/heuristics/:id",
    {
      schema: {
        tags: ["Heuristics"],
        summary: "Update heuristic",
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
            template: { type: "string" },
            elements: {
              type: "object",
              properties: {
                risk: { type: "boolean" },
                coverage: { type: "boolean" },
                time: { type: "boolean" },
                style: { type: "boolean" },
              },
            },
            examples: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  charter: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        name?: string
        description?: string
        template?: string
        elements?: { risk?: boolean; coverage?: boolean; time?: boolean; style?: boolean }
        examples?: Array<{ charter: string; description?: string }>
      }

      return heuristicService.update(id, {
        name: body.name,
        description: body.description,
        template: body.template,
        elements: body.elements,
        examples: body.examples,
      })
    }
  )

  app.delete<{ Params: { id: string } }>(
    "/heuristics/:id",
    {
      schema: {
        tags: ["Heuristics"],
        summary: "Delete heuristic",
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
      await heuristicService.delete(id)
      return reply.status(204).send()
    }
  )

  app.post<{ Params: { id: string }; Body: { name: string; description?: string; characteristics?: string[] } }>(
    "/heuristics/:id/personas",
    {
      schema: {
        tags: ["Heuristics", "Personas"],
        summary: "Add persona to heuristic",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1 },
            description: { type: "string" },
            characteristics: { type: "array", items: { type: "string" } },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as { name: string; description?: string; characteristics?: string[] }

      const persona = await heuristicService.addPersona({
        heuristicId: id,
        name: body.name,
        description: body.description,
        characteristics: body.characteristics,
      })

      return reply.status(201).send(persona)
    }
  )

  app.get<{ Params: { id: string } }>(
    "/heuristics/:id/personas",
    {
      schema: {
        tags: ["Heuristics", "Personas"],
        summary: "List personas for heuristic",
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
      return heuristicService.getPersonasByHeuristic(id)
    }
  )

  app.patch<{ Params: { personaId: string } }>(
    "/personas/:personaId",
    {
      schema: {
        tags: ["Personas"],
        summary: "Update persona",
        params: {
          type: "object",
          properties: {
            personaId: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            characteristics: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (request) => {
      const { personaId } = request.params as { personaId: string }
      const body = request.body as {
        name?: string
        description?: string
        characteristics?: string[]
      }

      return heuristicService.updatePersona(personaId, {
        name: body.name,
        description: body.description,
        characteristics: body.characteristics,
      })
    }
  )

  app.delete<{ Params: { personaId: string } }>(
    "/personas/:personaId",
    {
      schema: {
        tags: ["Personas"],
        summary: "Delete persona",
        params: {
          type: "object",
          properties: {
            personaId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { personaId } = request.params as { personaId: string }
      await heuristicService.deletePersona(personaId)
      return reply.status(204).send()
    }
  )

  app.post<{ Params: { charterId: string }; Body: { heuristicId: string } }>(
    "/et-charters/:charterId/heuristics",
    {
      schema: {
        tags: ["ET Charters", "Heuristics"],
        summary: "Link heuristic to ET Charter",
        params: {
          type: "object",
          properties: {
            charterId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["heuristicId"],
          properties: {
            heuristicId: { type: "string" },
          },
        },
        response: { 201: { type: "object", additionalProperties: true } },
      },
    },
    async (request, reply) => {
      const { charterId } = request.params as { charterId: string }
      const { heuristicId } = request.body as { heuristicId: string }

      const link = await heuristicService.linkToCharter(charterId, heuristicId)
      return reply.status(201).send(link)
    }
  )

  app.delete<{ Params: { charterId: string; heuristicId: string } }>(
    "/et-charters/:charterId/heuristics/:heuristicId",
    {
      schema: {
        tags: ["ET Charters", "Heuristics"],
        summary: "Unlink heuristic from ET Charter",
        params: {
          type: "object",
          properties: {
            charterId: { type: "string" },
            heuristicId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { charterId, heuristicId } = request.params as { charterId: string; heuristicId: string }
      await heuristicService.unlinkFromCharter(charterId, heuristicId)
      return reply.status(204).send()
    }
  )

  app.get<{ Params: { charterId: string } }>(
    "/et-charters/:charterId/heuristics",
    {
      schema: {
        tags: ["ET Charters", "Heuristics"],
        summary: "Get heuristics for ET Charter",
        params: {
          type: "object",
          properties: {
            charterId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { charterId } = request.params as { charterId: string }
      return heuristicService.getByCharter(charterId)
    }
  )
}
