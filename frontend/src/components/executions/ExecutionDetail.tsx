"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { TestExecution, ExecutionStepResult } from "@/types/execution"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Circle,
  Loader2,
  Save,
  Clock,
  User,
  Calendar,
  Monitor,
  Globe,
} from "lucide-react"

interface ExecutionDetailProps {
  executionId: string
  onUpdate?: () => void
}

const stepStatusIcons: Record<string, React.ReactNode> = {
  pass: <CheckCircle className="h-5 w-5 text-green-500" />,
  fail: <XCircle className="h-5 w-5 text-red-500" />,
  blocked: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  skipped: <Circle className="h-5 w-5 text-gray-400" />,
  not_run: <Clock className="h-5 w-5 text-gray-400" />,
}

const statusColors: Record<string, string> = {
  pass: "bg-green-500/10 text-green-600 border-green-500/20",
  fail: "bg-red-500/10 text-red-600 border-red-500/20",
  blocked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  skipped: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  not_run: "bg-gray-500/10 text-gray-600 border-gray-500/20",
}

export function ExecutionDetail({ executionId, onUpdate }: ExecutionDetailProps) {
  const [execution, setExecution] = useState<TestExecution | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingField, setEditingField] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [environment, setEnvironment] = useState("")
  const [platform, setPlatform] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [stepResults, setStepResults] = useState<Record<number, Partial<ExecutionStepResult>>>({})

  useEffect(() => {
    loadExecution()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId])

  const loadExecution = async () => {
    try {
      setIsLoading(true)
      const data = await api.get<TestExecution>(`/executions/${executionId}`)
      setExecution(data)
      setNotes(data.notes || "")
      setEnvironment(data.environment || "")
      setPlatform(data.platform || "")

      const resultsMap: Record<number, Partial<ExecutionStepResult>> = {}
      data.stepResults?.forEach((sr) => {
        resultsMap[sr.stepOrder] = sr
      })
      setStepResults(resultsMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load execution")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveExecution = async () => {
    if (!execution) return

    setIsSaving(true)
    try {
      await api.patch(`/executions/${executionId}`, {
        notes: notes || undefined,
        environment: environment || undefined,
        platform: platform || undefined,
      })
      setEditingField(null)
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  const handleStepStatusChange = async (stepOrder: number, status: "pass" | "fail" | "blocked" | "skipped") => {
    if (!execution) return

    try {
      await api.post(`/executions/${executionId}/step-results`, {
        stepOrder,
        status,
      })
      setStepResults((prev) => ({
        ...prev,
        [stepOrder]: { ...prev[stepOrder], status },
      }))
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update step")
    }
  }

  const handleStepNotesChange = async (stepOrder: number, notes: string) => {
    const current = stepResults[stepOrder] || {}
    setStepResults((prev) => ({
      ...prev,
      [stepOrder]: { ...prev[stepOrder], notes },
    }))

    if (current.status) {
      try {
        await api.post(`/executions/${executionId}/step-results`, {
          stepOrder,
          status: current.status,
          notes,
        })
        onUpdate?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update step")
      }
    }
  }

  const steps = (execution?.testCase?.steps as Array<{ order: number; action: string; expectedResult: string }>) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !execution) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        {error || "Execution not found"}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">{execution.testCase.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Test Plan: {execution.testPlan.name}
            </p>
          </div>
          <Badge variant="outline" className={statusColors[execution.status.value] || statusColors.not_run}>
            {execution.status.label}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{execution.executedBy.name || execution.executedBy.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(execution.executedAt).toLocaleString()}</span>
            </div>
            {platform && (
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span>{platform}</span>
              </div>
            )}
            {environment && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>{environment}</span>
              </div>
            )}
            {execution.durationMs && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{Math.round(execution.durationMs / 1000)}s</span>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">Notes</Label>
              {editingField !== "notes" && (
                <Button variant="ghost" size="sm" onClick={() => setEditingField("notes")}>
                  Edit
                </Button>
              )}
            </div>
            {editingField === "notes" ? (
              <div className="flex gap-2">
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="flex-1"
                />
                <div className="flex flex-col gap-2">
                  <Button size="sm" onClick={handleSaveExecution} disabled={isSaving}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{notes || "No notes"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Steps</CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps defined for this test case.</p>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => {
                const result = stepResults[step.order]
                return (
                  <div
                    key={step.order}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Step {index + 1}
                          </span>
                          {result?.status && (
                            <Badge variant="outline" className={statusColors[result.status]}>
                              {stepStatusIcons[result.status]}
                              <span className="ml-1 capitalize">{result.status}</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{step.action}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Expected: {step.expectedResult}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {(["pass", "fail", "blocked", "skipped"] as const).map((status) => (
                          <Button
                            key={status}
                            variant={result?.status === status ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleStepStatusChange(step.order, status)}
                            className="h-8 w-8 p-0"
                            title={status}
                          >
                            {stepStatusIcons[status]}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {(result?.status === "fail" || result?.status === "blocked") && (
                      <div className="ml-11">
                        <Textarea
                          placeholder="Add notes..."
                          value={result.notes || ""}
                          onChange={(e) => {
                            setStepResults((prev) => ({
                              ...prev,
                              [step.order]: { ...prev[step.order], notes: e.target.value },
                            }))
                          }}
                          onBlur={(e) => handleStepNotesChange(step.order, e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {execution.bugs && execution.bugs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Linked Bugs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {execution.bugs.map((bug) => (
                <div
                  key={bug.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{bug.title}</p>
                    <Badge
                      variant="outline"
                      className="mt-1"
                      style={{
                        backgroundColor: `${bug.status.color}20`,
                        color: bug.status.color,
                      }}
                    >
                      {bug.status.label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}