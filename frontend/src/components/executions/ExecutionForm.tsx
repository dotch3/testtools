"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2 } from "lucide-react"

interface TestCase {
  id: string
  title: string
}

interface ExecutionFormProps {
  testPlanId: string
  onSuccess?: () => void
}

export function ExecutionForm({ testPlanId, onSuccess }: ExecutionFormProps) {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [isLoadingCases, setIsLoadingCases] = useState(true)
  const [selectedCaseId, setSelectedCaseId] = useState("")
  const [environment, setEnvironment] = useState("")
  const [platform, setPlatform] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadTestCases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testPlanId])

  const loadTestCases = async () => {
    try {
      setIsLoadingCases(true)
      const cases = await api.get<any[]>(`/test-plans/${testPlanId}/cases`)
      setTestCases(cases)
    } catch {
      setError("Failed to load test cases")
    } finally {
      setIsLoadingCases(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCaseId) return

    setIsSubmitting(true)
    setError("")

    try {
      await api.post("/executions", {
        testCaseId: selectedCaseId,
        testPlanId,
        environment: environment || undefined,
        platform: platform || undefined,
      })
      setSelectedCaseId("")
      setEnvironment("")
      setPlatform("")
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create execution")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Create Execution</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="testCase">Test Case</Label>
            {isLoadingCases ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading test cases...
              </div>
            ) : (
              <select
                id="testCase"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">Select a test case</option>
                {testCases.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Input
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g., Chrome, Windows"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Input
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="e.g., staging, prod"
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting || !selectedCaseId} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Execution
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}