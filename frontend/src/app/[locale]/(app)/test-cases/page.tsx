"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  TestTubes,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { HierarchySelector, HierarchyBreadcrumb } from "@/components/hierarchy/HierarchySelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationInfo,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { AssigneeDialog } from "@/components/test-cases/AssigneeDialog"


interface TestCase {
  id: string
  title: string
  description?: string
  preconditions?: string
  notes?: string
  steps?: Array<{ order: number; action: string; expectedResult: string }>
  priority: { value: string; label: string; color: string }
  type: { value: string; label: string }
  suite: { id: string; name: string; testPlan?: { id: string; name: string } }
  status: string
  tags: Array<{ id: string; name: string; color: string }>
  assignees: Assignee[]
  lastExecution?: {
    status: { value: string; label: string; color: string }
    executedAt: string
  }
  _count: { executions: number }
}

interface Assignee {
  id: string
  name?: string
  email: string
}

interface HierarchySelection {
  planId: string
  planName: string
  suiteId: string
  suiteName: string
}

const priorityColors: Record<string, string> = {
  critical: "border-red-500 text-red-500",
  high: "border-orange-500 text-orange-500",
  medium: "border-yellow-500 text-yellow-500",
  low: "border-blue-500 text-blue-500",
}

const statusColors: Record<string, string> = {
  pass: "bg-green-500/10 text-green-600 border-green-500/20",
  fail: "bg-red-500/10 text-red-600 border-red-500/20",
  blocked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  not_run: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  skipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
}

const ITEMS_PER_PAGE = 20

function TestCasesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function TestCasesPage() {
  const { selectedProject } = useProject()
  const [cases, setCases] = useState<TestCase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [hierarchySelection, setHierarchySelection] = useState<HierarchySelection | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const formatTestCaseId = (id: string) => {
    return `TC-${id.substring(0, 8).toUpperCase()}`
  }

  const loadCases = useCallback(async () => {
    if (!hierarchySelection) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      })
      
      const data = await api.get<any[]>(`/suites/${hierarchySelection.suiteId}/cases?${params}`)
      
      const mappedCases: TestCase[] = data.map((tc: any) => ({
        id: tc.id,
        title: tc.title,
        description: tc.description || "",
        preconditions: tc.preconditions,
        steps: tc.steps || [],
        priority: tc.priority 
          ? { value: tc.priority.value, label: tc.priority.label, color: tc.priority.color }
          : { value: "medium", label: "Medium", color: "#f59e0b" },
        type: tc.type 
          ? { value: tc.type.value, label: tc.type.label }
          : { value: "manual", label: "Manual" },
        suite: { 
          id: hierarchySelection.suiteId, 
          name: hierarchySelection.suiteName, 
          testPlan: { id: hierarchySelection.planId, name: hierarchySelection.planName } 
        },
        status: "active",
        tags: (tc.tags || []).map((t: any) => ({ id: t.id, name: t.name, color: t.color || "#6b7280" })),
        assignees: (tc.assignees || []).map((a: any) => ({ id: a.id, name: a.name, email: a.email })),
        lastExecution: tc.lastExecution,
        _count: { executions: tc._count?.executions || 0 },
      }))
      
      setCases(mappedCases)
      setTotalCount(data.length === ITEMS_PER_PAGE ? (currentPage * ITEMS_PER_PAGE) + 1 : (currentPage - 1) * ITEMS_PER_PAGE + data.length)
    } catch (err) {
      console.error("Failed to load cases:", err)
      setError(err instanceof Error ? err.message : "Failed to load test cases")
      setCases([])
    } finally {
      setIsLoading(false)
    }
  }, [hierarchySelection, currentPage])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  const handleHierarchySelect = (planId: string, planName: string, suiteId: string, suiteName: string) => {
    setHierarchySelection({ planId, planName, suiteId, suiteName })
    setCurrentPage(1)
  }

  const handleCreateCase = async (data: { title: string; priorityId: string; typeId: string; description?: string; preconditions?: string; notes?: string; steps?: Array<{ action: string; expectedResult: string }> }) => {
    if (!hierarchySelection) return
    
    setIsCreating(true)
    try {
      await api.post(`/suites/${hierarchySelection.suiteId}/cases`, {
        title: data.title,
        priorityId: data.priorityId,
        typeId: data.typeId,
        description: data.description,
        preconditions: data.preconditions,
        notes: data.notes,
        steps: data.steps,
      })
      loadCases()
    } catch (err) {
      console.error("Failed to create case:", err)
      throw err
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm("Are you sure you want to delete this test case?")) return
    
    try {
      await api.delete(`/cases/${caseId}`)
      setCases(cases.filter(c => c.id !== caseId))
      toast.success("Test case deleted successfully")
    } catch (err) {
      console.error("Failed to delete case:", err)
      toast.error(err instanceof Error ? err.message : "Failed to delete test case")
    }
  }

  const handleAssigneesChange = (caseId: string, newAssignees: Assignee[]) => {
    setCases(cases.map(c => c.id === caseId ? { ...c, assignees: newAssignees } : c))
  }

  const filteredCases = cases.filter((c) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return c.title.toLowerCase().includes(query) || 
           c.description?.toLowerCase().includes(query)
  })

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
          <p className="text-muted-foreground mt-1">
            Select a project to view test cases
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a project from the header to continue</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hierarchySelection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
          <p className="text-muted-foreground mt-1">
            Select a test plan and suite to view cases
          </p>
        </div>
        <HierarchySelector onSelect={handleHierarchySelect} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
        <div className="mt-1">
          <HierarchyBreadcrumb
            projectName={selectedProject.name}
            planName={hierarchySelection.planName}
            suiteName={hierarchySelection.suiteName}
            onChange={() => setHierarchySelection(null)}
          />
        </div>
      </div>

      <div className="flex justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search test cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        
        <CreateCaseDialog 
          onSubmit={handleCreateCase}
          isCreating={isCreating}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Test Case
            </Button>
          }
        />
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <TestCasesSkeleton />
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<TestTubes className="h-8 w-8 text-muted-foreground" />}
              title="No test cases yet"
              description={searchQuery ? "No test cases match your search" : "Create your first test case to get started"}
              action={!searchQuery && (
                <CreateCaseDialog 
                  onSubmit={handleCreateCase}
                  isCreating={isCreating}
                  trigger={
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Test Case
                    </Button>
                  }
                />
              )}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCases.map((caseItem) => {
              const status = caseItem.lastExecution?.status
              return (
                <Card
                  key={caseItem.id}
                  className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer group"
                  onClick={() => {
                    // TODO: Open test case detail/edit
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatTestCaseId(caseItem.id)}
                          </span>
                        </div>
                        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {caseItem.title}
                        </h3>
                        {caseItem.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {caseItem.description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCase(caseItem.id)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          priorityColors[caseItem.priority.value] || "border-gray-500 text-gray-500"
                        }`}
                      >
                        {caseItem.priority.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {caseItem.type.label}
                      </Badge>
                      {status && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            statusColors[status.value] || statusColors.not_run
                          }`}
                        >
                          {status.label}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {caseItem.assignees.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className="flex -space-x-1">
                              {caseItem.assignees.slice(0, 2).map((assignee) => (
                                <Avatar
                                  key={assignee.id}
                                  className="h-5 w-5 border border-background"
                                >
                                  <AvatarFallback className="text-[8px]">
                                    {(assignee.name || assignee.email).charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {caseItem.assignees.length > 2 && (
                              <span>+{caseItem.assignees.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span>Unassigned</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{caseItem._count.executions} executions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationInfo currentPage={currentPage} totalPages={totalPages} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CreateCaseDialog({
  onSubmit,
  isCreating,
  trigger,
}: {
  onSubmit: (data: { title: string; priorityId: string; typeId: string; description?: string; preconditions?: string; notes?: string; steps?: Array<{ action: string; expectedResult: string }> }) => Promise<void>
  isCreating: boolean
  trigger: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [preconditions, setPreconditions] = useState("")
  const [notes, setNotes] = useState("")
  const [priorityId, setPriorityId] = useState("seed-test_priority-medium")
  const [typeId, setTypeId] = useState("seed-test_type-manual")
  const [steps, setSteps] = useState<Array<{ action: string; expectedResult: string }>>([
    { action: "", expectedResult: "" }
  ])
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isOpen) {
      setTitle("")
      setDescription("")
      setPreconditions("")
      setNotes("")
      setPriorityId("seed-test_priority-medium")
      setTypeId("seed-test_type-manual")
      setSteps([{ action: "", expectedResult: "" }])
      setError("")
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    if (!priorityId) {
      setError("Priority is required")
      return
    }
    if (!typeId) {
      setError("Type is required")
      return
    }

    const validSteps = steps
      .filter(s => s.action.trim() || s.expectedResult.trim())
      .map((s, i) => ({ ...s, order: i + 1 }))
    try {
      await onSubmit({ 
        title: title.trim(), 
        priorityId, 
        typeId,
        description: description.trim() || undefined,
        preconditions: preconditions.trim() || undefined,
        notes: notes.trim() || undefined,
        steps: validSteps.length > 0 ? validSteps : undefined,
      })
      toast.success("Test case created successfully")
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test case")
    }
  }

  const addStep = () => {
    setSteps([...steps, { action: "", expectedResult: "" }])
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
    }
  }

  const updateStep = (index: number, field: "action" | "expectedResult", value: string) => {
    const newSteps = [...steps]
    newSteps[index][field] = value
    setSteps(newSteps)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Test Case</DialogTitle>
            <DialogDescription>
              Add a new test case to this suite
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Verify login with valid credentials"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this test case validates..."
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preconditions">Preconditions</Label>
              <textarea
                id="preconditions"
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
                placeholder="Any setup or prerequisites needed..."
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes / Observations</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes, observations, or attachments references..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">
                  Priority <span className="text-destructive">*</span>
                </Label>
                <select
                  id="priority"
                  value={priorityId}
                  onChange={(e) => setPriorityId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="seed-test_priority-low">Low</option>
                  <option value="seed-test_priority-medium">Medium</option>
                  <option value="seed-test_priority-high">High</option>
                  <option value="seed-test_priority-critical">Critical</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="type"
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="seed-test_type-manual">Manual</option>
                  <option value="seed-test_type-automated">Automated</option>
                  <option value="seed-test_type-exploratory">Exploratory</option>
                  <option value="seed-test_type-regression">Regression</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Test Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1 h-3 w-3" /> Add Step
                </Button>
              </div>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center mt-2">
                      {index + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        value={step.action}
                        onChange={(e) => updateStep(index, "action", e.target.value)}
                        placeholder="Action (e.g., Enter username)"
                        className="text-sm"
                      />
                      <Input
                        value={step.expectedResult}
                        onChange={(e) => updateStep(index, "expectedResult", e.target.value)}
                        placeholder="Expected result"
                        className="text-sm"
                      />
                    </div>
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Test Case"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
