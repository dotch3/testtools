import type { FastifyInstance, FastifyRequest } from "fastify"
import { evidenceService } from "../../../services/EvidenceService.js"
import { logger } from "../../../logger.js"

export async function evidenceRoutes(app: FastifyInstance) {
  app.post(
    "/evidence/upload",
    {
      schema: {
        tags: ["Evidence"],
        summary: "Upload evidence file",
        consumes: ["multipart/form-data"],
      },
    },
    async (request, reply) => {
      const user = request.user!
      const parts = request.parts()
      let file: { filename: string; content: Buffer; mimetype: string } | undefined
      let entityType: "bug" | "test_case" | "test_execution" | undefined
      let entityId: string | undefined
      let projectId: string | undefined = undefined

      for await (const part of parts) {
        if (part.type === "file") {
          const chunks: Buffer[] = []
          for await (const chunk of part.file) {
            chunks.push(chunk)
          }
          file = {
            filename: part.filename,
            content: Buffer.concat(chunks),
            mimetype: part.mimetype || "application/octet-stream",
          }
        } else if (part.type === "field") {
          if (part.fieldname === "entityType") entityType = part.value as "bug" | "test_case" | "test_execution"
          if (part.fieldname === "entityId") entityId = part.value as string
          if (part.fieldname === "projectId") projectId = part.value as string
        }
      }

      if (!file || !entityType || !entityId) {
        logger.error({ file: !!file, entityType, entityId, projectId }, "[Evidence] Missing required fields")
        throw new Error("Missing required fields: file, entityType, entityId")
      }

      logger.info({ entityType, entityId, fileName: file.filename, fileSize: file.content.length }, "[Evidence] Receiving upload request")

      const attachment = await evidenceService.uploadEvidence(
        file,
        entityType,
        entityId,
        projectId,
        user.userId
      )

      logger.info({ attachmentId: attachment.id }, "[Evidence] Upload completed successfully")
      return reply.status(201).send(attachment)
    }
  )

  app.get<{ Params: { attachmentId: string } }>(
    "/evidence/:attachmentId/file",
    {
      schema: {
        tags: ["Evidence"],
        summary: "Download evidence file",
        params: {
          type: "object",
          properties: {
            attachmentId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { attachmentId } = request.params as { attachmentId: string }
      const attachment = await evidenceService.getById(attachmentId)

      if (!attachment || !attachment.data) {
        throw new Error("Attachment not found")
      }

      reply.header("Content-Type", attachment.fileType)
      reply.header("Content-Disposition", `inline; filename="${attachment.fileName}"`)
      return reply.send(attachment.data)
    }
  )

  app.get<{ Params: { attachmentId: string } }>(
    "/evidence/:attachmentId",
    {
      schema: {
        tags: ["Evidence"],
        summary: "Get attachment info",
        params: {
          type: "object",
          properties: {
            attachmentId: { type: "string" },
          },
        },
      },
    },
    async (request) => {
      const { attachmentId } = request.params as { attachmentId: string }
      const attachment = await evidenceService.getById(attachmentId)

      if (!attachment) {
        throw new Error("Attachment not found")
      }

      const { data, ...info } = attachment
      return info
    }
  )
}
