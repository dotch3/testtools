"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { SuiteTree, type SuiteNode } from "@/components/test-suites/SuiteTree"
import { TestCaseList, type TestCaseRow } from "@/components/test-cases/TestCaseList"
import { Plus } from "lucide-react"

export default function TestPlanDetailPage() {
  const params = useParams()
  const planId = params.id as string
  const [plan, setPlan] = useState<{
    id: string
    name: string
    description?: string
    createdAt: string
  } | null>(null)
  const [suites, setSuites] = useState<SuiteNode[]>([])
  const [selectedSuite, setSelectedSuite] = useState<SuiteNode | null>(null)
  const [cases, setCases] = useState<TestCaseRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPlan()
    loadSuites()
  }, [planId])

  useEffect(() => {
    if (selectedSuite) {
      loadCases(selectedSuite.id)
    }
  }, [selectedSuite])

  const loadPlan = async () => {
    try {
      const data = await api.get(`/test-plans/${planId}`)
      setPlan(data as typeof plan)
    } catch (err) {
      console.error("Failed to load plan:", err)
    }
  }

  const loadSuites = async () => {
    try {
      const data = await api.get<SuiteNode[]>(`/test-plans/${planId}/suites`)
      setSuites(data)
    } catch (err) {
      console.error("Failed to load suites:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCases = async (suiteId: string) => {
    try {
      const data = await api.get<TestCaseRow[]>(`/suites/${suiteId}/cases`)
      setCases(data)
    } catch (err) {
      console.error("Failed to load cases:", err)
    }
  }

  const handleSelectSuite = (suite: SuiteNode) => {
    setSelectedSuite(suite)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!plan) {
    return <div>Test plan not found</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{plan.name}</h1>
        {plan.description && (
          <p className="text-muted-foreground mt-1">{plan.description}</p>
        )}
      </div>

      <Tabs defaultValue="suites">
        <TabsList>
          <TabsTrigger value="suites">Suites</TabsTrigger>
          <TabsTrigger value="cases">All Cases</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="suites" className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Suite
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4 font-medium">Test Suites</div>
              <div className="p-2">
                <SuiteTree
                  suites={suites}
                  selectedSuiteId={selectedSuite?.id}
                  onSelect={handleSelectSuite}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              <div className="border-b p-4 font-medium">
                {selectedSuite
                  ? `Cases in "${selectedSuite.name}"`
                  : "Select a suite to view cases"}
              </div>
              <div className="p-4">
                {selectedSuite ? (
                  <TestCaseList
                    suiteId={selectedSuite.id}
                    cases={cases}
                    isLoading={false}
                    onRefresh={() => loadCases(selectedSuite.id)}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Select a suite from the tree to view its test cases
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cases">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              View all test cases across all suites in this plan.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-muted-foreground">
              Test plan settings coming soon...
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
