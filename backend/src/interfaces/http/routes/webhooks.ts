import type { FastifyInstance } from "fastify"

export async function webhookRoutes(app: FastifyInstance) {
  app.post<{
    Params: { integrationId: string }
    Body: {
      action: string
      test_case_id?: string
      test_plan_id?: string
      branch?: string
      commit_sha?: string
      repository?: string
    }
  }>(
    "/webhooks/:integrationId/github",
    {
      schema: {
        tags: ["Webhooks"],
        summary: "GitHub webhook receiver",
        params: {
          type: "object",
          properties: {
            integrationId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        action?: string
        test_case_id?: string
        test_plan_id?: string
        branch?: string
        commit_sha?: string
        repository?: string
      }

      if (body.action === "workflow_run" && body.test_case_id && body.test_plan_id) {
        return reply.send({
          success: true,
          message: "GitHub workflow webhook received - create execution manually with test_case_id and test_plan_id",
          received: {
            test_case_id: body.test_case_id,
            test_plan_id: body.test_plan_id,
            branch: body.branch,
            commit_sha: body.commit_sha,
          },
        })
      }

      return reply.send({ success: true, message: "Webhook processed" })
    }
  )

  app.post<{
    Params: { integrationId: string }
    Body: {
      build_id: string
      build_status: string
      test_case_id?: string
      test_plan_id?: string
    }
  }>(
    "/webhooks/:integrationId/jenkins",
    {
      schema: {
        tags: ["Webhooks"],
        summary: "Jenkins webhook receiver",
        params: {
          type: "object",
          properties: {
            integrationId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        build_id?: string
        build_status?: string
        test_case_id?: string
        test_plan_id?: string
      }

      if (body.test_case_id && body.test_plan_id) {
        return reply.send({
          success: true,
          message: "Jenkins webhook received - create execution manually with test_case_id and test_plan_id",
          received: {
            build_id: body.build_id,
            build_status: body.build_status,
            test_case_id: body.test_case_id,
            test_plan_id: body.test_plan_id,
          },
        })
      }

      return reply.send({ success: true, message: "Webhook processed" })
    }
  )

  app.post<{
    Body: {
      event: string
      project_key: string
      summary: string
      description?: string
      severity?: string
      issuetype?: string
    }
  }>(
    "/webhooks/jira",
    {
      schema: {
        tags: ["Webhooks"],
        summary: "Generic Jira webhook receiver",
      },
    },
    async (request, reply) => {
      const body = request.body as {
        event?: string
        project_key?: string
        summary?: string
        description?: string
        severity?: string
        issuetype?: string
      }

      if (body.event === "jira:issue_created" && body.project_key) {
        return reply.send({
          success: true,
          message: "Jira issue sync initiated",
        })
      }

      return reply.send({ success: true, message: "Webhook processed" })
    }
  )
}
