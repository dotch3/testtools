import type { FastifyInstance } from "fastify"
import { prisma } from "../../../infrastructure/database/prisma.js"

export async function enumRoutes(app: FastifyInstance) {
  app.get(
    "/enums",
    {
      schema: {
        tags: ["Enums"],
        summary: "Get all enum values grouped by type",
        response: {
          200: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
    },
    async () => {
      const enumTypes = await prisma.enumType.findMany({
        include: {
          values: {
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              value: true,
              label: true,
              color: true,
              icon: true,
              isDefault: true,
              orderIndex: true,
            },
          },
        },
        orderBy: { name: "asc" },
      })

      const result: Record<string, typeof enumTypes[0]["values"]> = {}
      for (const enumType of enumTypes) {
        result[enumType.name] = enumType.values
      }
      return result
    }
  )
}
