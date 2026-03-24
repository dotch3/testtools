"use client"

import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ExecutionTable } from "@/components/executions/ExecutionTable"

function ExecutionsContent() {
  const searchParams = useSearchParams()
  const testPlanId = searchParams.get("testPlan")

  if (!testPlanId) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Select a test plan to view its executions.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          You can access executions from a test plan&apos;s detail page.
        </p>
      </div>
    )
  }

  return <ExecutionTable testPlanId={testPlanId} />
}

export default function ExecutionsPage() {
  const t = useTranslations("common")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executions</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage test executions
        </p>
      </div>
      <Suspense fallback={<div className="text-center py-8">{t("loading")}</div>}>
        <ExecutionsContent />
      </Suspense>
    </div>
  )
}
