import type { FastifyInstance } from "fastify"
import { testCaseService } from "../../../services/TestCaseService.js"
import { parse } from "csv-parse/sync"

export interface ImportValidationError {
  row: number
  field: string
  message: string
}

export interface ImportResult {
  imported: number
  errors: ImportValidationError[]
}

export async function importRoutes(app: FastifyInstance) {
  app.post<{
    Params: { suiteId: string }
    Body: { csv: string }
  }>(
    "/suites/:suiteId/cases/import",
    {
      schema: {
        tags: ["Test Cases"],
        summary: "Import test cases from CSV",
        params: {
          type: "object",
          properties: {
            suiteId: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["csv"],
          properties: {
            csv: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user!
      const { suiteId } = request.params as { suiteId: string }
      const { csv } = request.body as { csv: string }

      const errors: ImportValidationError[] = []
      const validCases: Array<{
        title: string
        description?: string
        preconditions?: string
        steps?: Array<{ order: number; action: string; expectedResult: string }>
        priorityId: string
        typeId: string
        createdById: string
      }> = []

      try {
        const records = parse(csv, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })

        for (let i = 0; i < records.length; i++) {
          const row = records[i] as Record<string, string>
          const rowNumber = i + 2

          if (!row.title) {
            errors.push({ row: rowNumber, field: "title", message: "Title is required" })
            continue
          }

          if (!row.priorityId) {
            errors.push({ row: rowNumber, field: "priorityId", message: "Priority ID is required" })
            continue
          }

          if (!row.typeId) {
            errors.push({ row: rowNumber, field: "typeId", message: "Type ID is required" })
            continue
          }

          let steps: Array<{ order: number; action: string; expectedResult: string }> | undefined
          if (row.steps) {
            try {
              steps = JSON.parse(row.steps)
            } catch {
              errors.push({ row: rowNumber, field: "steps", message: "Invalid steps JSON format" })
              continue
            }
          }

          validCases.push({
            title: row.title,
            description: row.description,
            preconditions: row.preconditions,
            steps,
            priorityId: row.priorityId,
            typeId: row.typeId,
            createdById: user.userId,
          })
        }

        if (errors.length > 0) {
          return reply.status(400).send({
            message: "Validation failed",
            errors,
            imported: 0,
          })
        }

        if (validCases.length === 0) {
          return reply.status(400).send({
            message: "No valid test cases to import",
            errors: [],
            imported: 0,
          })
        }

        await testCaseService.bulkCreate(suiteId, validCases)

        const result: ImportResult = {
          imported: validCases.length,
          errors: [],
        }

        return reply.status(201).send(result)
      } catch (err) {
        return reply.status(400).send({
          message: "Failed to parse CSV",
          errors: [{ row: 0, field: "csv", message: String(err) }],
          imported: 0,
        })
      }
    }
  )
}
