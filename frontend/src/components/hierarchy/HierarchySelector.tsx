"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronRight, Folder, FolderKanban, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useProject } from "@/contexts/ProjectContext"
import { api } from "@/lib/api"

interface TestPlan {
  id: string
  name: string
}

interface TestSuite {
  id: string
  name: string
  testPlanId: string
  children?: TestSuite[]
}

interface HierarchySelectorProps {
  onSelect: (planId: string, planName: string, suiteId: string, suiteName: string) => void
}

export function HierarchySelector({ onSelect }: HierarchySelectorProps) {
  const { selectedProject } = useProject()
  const [plans, setPlans] = useState<TestPlan[]>([])
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedPlanName, setSelectedPlanName] = useState<string>("")
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null)
  const [selectedSuiteName, setSelectedSuiteName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSuites, setIsLoadingSuites] = useState(false)

  const loadPlans = useCallback(async () => {
    if (!selectedProject) {
      setPlans([])
      setSuites([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const plansData = await api.get<any[]>(`/projects/${selectedProject.id}/test-plans`)
      setPlans(plansData.map((p: any) => ({ id: p.id, name: p.name })))
    } catch (err) {
      console.error("Failed to load plans:", err)
      setPlans([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject])

  const loadSuites = useCallback(async (planId: string) => {
    setIsLoadingSuites(true)
    setSuites([])
    try {
      const suitesData = await api.get<any[]>(`/test-plans/${planId}/suites`)
      const flattenSuites = (suites: any[]): TestSuite[] => {
        const result: TestSuite[] = []
        const flatten = (items: any[]) => {
          for (const item of items) {
            result.push({ id: item.id, name: item.name, testPlanId: planId })
            if (item.children && item.children.length > 0) {
              flatten(item.children)
            }
          }
        }
        flatten(suites)
        return result
      }
      setSuites(flattenSuites(suitesData))
    } catch (err) {
      console.error("Failed to load suites:", err)
      setSuites([])
    } finally {
      setIsLoadingSuites(false)
    }
  }, [])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId)
    if (plan) {
      setSelectedPlanId(planId)
      setSelectedPlanName(plan.name)
      setSelectedSuiteId(null)
      setSelectedSuiteName("")
      loadSuites(planId)
    }
  }

  const handleSuiteChange = (suiteId: string) => {
    const suite = suites.find((s) => s.id === suiteId)
    if (suite) {
      setSelectedSuiteId(suiteId)
      setSelectedSuiteName(suite.name)
    }
  }

  const handleConfirm = () => {
    if (selectedPlanId && selectedSuiteId) {
      onSelect(selectedPlanId, selectedPlanName, selectedSuiteId, selectedSuiteName)
    }
  }

  const filteredSuites = selectedPlanId
    ? suites.filter((s) => s.testPlanId === selectedPlanId)
    : []

  if (!selectedProject) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Select a project from the header to continue</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No test plans found for this project</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-8">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <h3 className="text-lg font-medium mb-1">Select Context</h3>
            <p className="text-sm text-muted-foreground">
              Choose a test plan and suite to continue
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                <FolderKanban className="h-4 w-4 inline mr-2" />
                Test Plan
              </label>
              <select
                value={selectedPlanId || ""}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select a test plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPlanId && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-sm font-medium mb-2 block">
                  <Folder className="h-4 w-4 inline mr-2" />
                  Test Suite
                </label>
                {isLoadingSuites ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading suites...
                  </div>
                ) : filteredSuites.length > 0 ? (
                  <select
                    value={selectedSuiteId || ""}
                    onChange={(e) => handleSuiteChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Select a test suite</option>
                    {filteredSuites.map((suite) => (
                      <option key={suite.id} value={suite.id}>
                        {suite.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No suites available for this plan
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button
              onClick={handleConfirm}
              disabled={!selectedPlanId || !selectedSuiteId}
              className="w-full"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface HierarchyBreadcrumbProps {
  projectName: string
  planName: string
  suiteName: string
  onChange: () => void
}

export function HierarchyBreadcrumb({
  projectName,
  planName,
  suiteName,
  onChange,
}: HierarchyBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{projectName}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{planName}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{suiteName}</span>
      <Button variant="ghost" size="sm" onClick={onChange} className="ml-2 h-6 text-xs">
        Change
      </Button>
    </div>
  )
}
