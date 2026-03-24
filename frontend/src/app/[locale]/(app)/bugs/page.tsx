"use client"

import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { BugTable } from "@/components/bugs/BugTable"

function BugsContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get("project")
  const executionId = searchParams.get("execution")

  if (!projectId) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Select a project to view its bugs.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          You can access bugs from a project&apos;s detail page.
        </p>
      </div>
    )
  }

  return <BugTable projectId={projectId} executionId={executionId ?? undefined} />
}

export default function BugsPage() {
  const t = useTranslations("common")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bugs</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage bugs from test executions
        </p>
      </div>
      <Suspense fallback={<div className="text-center py-8">{t("loading")}</div>}>
        <BugsContent />
      </Suspense>
    </div>
  )
}
