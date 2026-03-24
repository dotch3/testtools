"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { TestExecution } from "@/types/execution"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Bug,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const statusIcons: Record<string, React.ReactNode> = {
  passed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  blocked: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  pending: <Clock className="h-4 w-4 text-gray-500" />,
  running: <Play className="h-4 w-4 text-blue-500" />,
}

const statusBadgeColors: Record<string, string> = {
  passed: "bg-green-500/10 text-green-600 border-green-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  blocked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  pending: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  running: "bg-blue-500/10 text-blue-600 border-blue-500/20",
}

interface ExecutionTableProps {
  testPlanId: string
  projectId?: string
  onRefresh?: () => void
}

export function ExecutionTable({ testPlanId, projectId, onRefresh }: ExecutionTableProps) {
  const t = useTranslations("common")
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")

  useEffect(() => {
    loadExecutions()
  }, [testPlanId])

  const loadExecutions = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<TestExecution[]>(`/test-plans/${testPlanId}/executions`)
      setExecutions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load executions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartExecution = async (execution: TestExecution) => {
    try {
      await api.post(`/executions/${execution.id}/start`)
      await loadExecutions()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start execution")
    }
  }

  const handleCompleteExecution = async (execution: TestExecution, status: string) => {
    try {
      await api.patch(`/executions/${execution.id}`, { statusId: status })
      await api.post(`/executions/${execution.id}/complete`)
      await loadExecutions()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete execution")
    }
  }

  const filteredExecutions = executions.filter((e) => {
    if (selectedStatus === "all") return true
    return e.status.value === selectedStatus
  })

  const stats = {
    total: executions.length,
    passed: executions.filter((e) => e.status.value === "passed").length,
    failed: executions.filter((e) => e.status.value === "failed").length,
    blocked: executions.filter((e) => e.status.value === "blocked").length,
    pending: executions.filter((e) => e.status.value === "pending").length,
    running: executions.filter((e) => e.status.value === "running").length,
  }

  if (isLoading) {
    return <div className="text-center py-8">{t("loading")}</div>
  }

  if (error) {
    return <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedStatus === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedStatus("all")}
        >
          All ({stats.total})
        </Button>
        <Button
          variant={selectedStatus === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedStatus("pending")}
        >
          <Clock className="mr-1 h-3 w-3" /> Pending ({stats.pending})
        </Button>
        <Button
          variant={selectedStatus === "running" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedStatus("running")}
        >
          <Play className="mr-1 h-3 w-3" /> Running ({stats.running})
        </Button>
        <Button
          variant={selectedStatus === "passed" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedStatus("passed")}
        >
          <CheckCircle className="mr-1 h-3 w-3" /> Passed ({stats.passed})
        </Button>
        <Button
          variant={selectedStatus === "failed" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedStatus("failed")}
        >
          <XCircle className="mr-1 h-3 w-3" /> Failed ({stats.failed})
        </Button>
        <Button
          variant={selectedStatus === "blocked" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedStatus("blocked")}
        >
          <AlertCircle className="mr-1 h-3 w-3" /> Blocked ({stats.blocked})
        </Button>
      </div>

      {filteredExecutions.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No executions yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Run test cases to create executions.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Test Case</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Executed By</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Bugs</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExecutions.map((execution) => (
                <tr key={execution.id} className="border-b">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedExecution(execution)}
                      className="text-left hover:underline"
                    >
                      {execution.testCase.title}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={statusBadgeColors[execution.status.value] || ""}
                      variant="outline"
                    >
                      {statusIcons[execution.status.value]}
                      <span className="ml-1">{execution.status.label}</span>
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {execution.executedBy.name || execution.executedBy.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(execution.executedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {execution._count?.bugs ? (
                      <Link
                        href={`/bugs?execution=${execution.id}`}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Bug className="mr-1 h-3 w-3" />
                        {execution._count.bugs}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {execution.status.value === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartExecution(execution)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      {execution.status.value === "running" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCompleteExecution(execution, "passed")
                            }
                          >
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCompleteExecution(execution, "failed")
                            }
                          >
                            <XCircle className="h-3 w-3 text-red-500" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedExecution(execution)}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selectedExecution} onOpenChange={() => setSelectedExecution(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execution Details</DialogTitle>
            <DialogDescription>
              {selectedExecution?.testCase.title}
            </DialogDescription>
          </DialogHeader>
          {selectedExecution && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    className={
                      statusBadgeColors[selectedExecution.status.value] || ""
                    }
                    variant="outline"
                  >
                    {selectedExecution.status.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Executed By</p>
                  <p>{selectedExecution.executedBy.name || selectedExecution.executedBy.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Executed At</p>
                  <p>{new Date(selectedExecution.executedAt).toLocaleString()}</p>
                </div>
                {selectedExecution.durationMs && (
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p>{Math.round(selectedExecution.durationMs / 1000)}s</p>
                  </div>
                )}
              </div>
              {selectedExecution.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1">{selectedExecution.notes}</p>
                </div>
              )}
              {selectedExecution.bugs && selectedExecution.bugs.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Linked Bugs</p>
                  <div className="space-y-2">
                    {selectedExecution.bugs.map((bug) => (
                      <Link
                        key={bug.id}
                        href={`/bugs/${bug.id}`}
                        className="block p-2 rounded-md border hover:bg-muted/50"
                      >
                        <p className="font-medium text-sm">{bug.title}</p>
                        <Badge
                          className="mt-1"
                          style={{
                            backgroundColor: `${bug.status.color}20`,
                            color: bug.status.color,
                            borderColor: `${bug.status.color}40`,
                          }}
                          variant="outline"
                        >
                          {bug.status.label}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {projectId && (
                <div className="flex justify-end">
                  <Link href={`/bugs?project=${projectId}&execution=${selectedExecution.id}`}>
                    <Button variant="outline" size="sm">
                      <Bug className="mr-2 h-3 w-3" />
                      Create Bug
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
