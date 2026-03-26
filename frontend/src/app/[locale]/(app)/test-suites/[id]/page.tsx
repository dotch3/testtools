"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Folder } from "lucide-react"
import { useProject } from "@/contexts/ProjectContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"
import { TestCaseList, type TestCaseRow } from "@/components/test-cases/TestCaseList"

export default function TestSuiteDetailPage() {
  const params = useParams()
  const suiteId = params.id as string
  const { selectedProject } = useProject()
  const [suite, setSuite] = useState<any>(null)
  const [cases, setCases] = useState<TestCaseRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!selectedProject || !suiteId) return
    loadSuite()
  }, [selectedProject, suiteId])

  const loadSuite = async () => {
    setIsLoading(true)
    try {
      const suiteData = await api.get<any>(`/suites/${suiteId}`)
      setSuite(suiteData)
      
      const casesData = await api.get<any[]>(`/suites/${suiteId}/cases`)
      setCases(casesData.map(tc => ({
        id: tc.id,
        title: tc.title,
        description: tc.description,
        priority: tc.priority ? { 
          value: tc.priority.value, 
          label: tc.priority.label, 
          color: tc.priority.color 
        } : { value: 'medium', label: 'Medium', color: '#f59e0b' },
        type: tc.type ? { value: tc.type.value, label: tc.type.label } : { value: 'manual', label: 'Manual' },
        suite: { 
          id: suiteId, 
          name: suiteData.name,
        },
        status: 'active',
        tags: (tc.tags || []).map((t: any) => ({ id: t.id, name: t.name, color: t.color })),
        assignees: (tc.assignees || []).map((a: any) => ({ id: a.id, name: a.name, email: a.email })),
        lastExecution: tc.lastExecution,
        _count: { executions: tc._count?.executions || 0 },
      })))
    } catch (err) {
      console.error("Failed to load suite:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Suite</h1>
          <p className="text-muted-foreground mt-1">
            View test suite details
          </p>
        </div>
        <NoProjectSelected description="Please select a project from the header to view test suite details." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!suite) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/test-suites" className="hover:text-foreground">
            {selectedProject.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>Test Suites</span>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Test suite not found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            This test suite may have been deleted or you may not have access.
          </p>
          <Button asChild>
            <Link href="/test-suites">Back to Test Suites</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/test-suites" className="hover:text-foreground">
            {selectedProject.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>Test Suites</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{suite.name}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{suite.name}</h1>
        {suite.description && (
          <p className="text-muted-foreground mt-1">{suite.description}</p>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Test Cases ({cases.length})</h2>
        </div>
        <div className="p-4">
          <TestCaseList
            suiteId={suiteId}
            cases={cases}
            isLoading={false}
            onRefresh={loadSuite}
          />
        </div>
      </div>
    </div>
  )
}
