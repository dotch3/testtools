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
  PlayCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  FolderKanban,
} from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useProject } from "@/contexts/ProjectContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { NoProjectSelected } from "@/components/ui/NoProjectSelected"
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

interface TestPlan {
  id: string
  name: string
  description?: string
  status: string
  statusId?: string
  createdAt: string
  _count: {
    suites: number
    cases: number
    executions: number
  }
  latestExecution?: {
    passed: number
    failed: number
    status: string
  }
}

interface TestPlanFormData {
  name: string
  description: string
  statusId: string
}

interface FormErrors {
  name?: string
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/10", text: "text-green-600", label: "Active" },
  draft: { bg: "bg-gray-500/10", text: "text-gray-600", label: "Draft" },
  archived: { bg: "bg-yellow-500/10", text: "text-yellow-600", label: "Archived" },
  completed: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Completed" },
}

function TestPlansSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function CreateTestPlanDialog({
  onSubmit,
  trigger,
}: {
  onSubmit: (data: TestPlanFormData) => Promise<void>
  trigger?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<TestPlanFormData>({
    name: "",
    description: "",
    statusId: "seed-test_plan_status-active",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = "Test plan name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setIsOpen(false)
      setFormData({ name: "", description: "", statusId: "seed-test_plan_status-active" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test plan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Test Plan</DialogTitle>
            <DialogDescription>
              Create a new test plan to organize your test cases.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder="e.g., API Regression Suite"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose and scope of this test plan..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Test Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditTestPlanDialog({
  plan,
  onSubmit,
  children,
}: {
  plan: TestPlan
  onSubmit: (data: TestPlanFormData) => Promise<void>
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<TestPlanFormData>({
    name: plan.name,
    description: plan.description || "",
    statusId: plan.statusId || "seed-test_plan_status-active",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    setFormData({
      name: plan.name,
      description: plan.description || "",
      statusId: plan.statusId || "seed-test_plan_status-active",
    })
  }, [plan])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = "Test plan name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update test plan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusOptions = [
    { value: "seed-test_plan_status-draft", label: "Draft" },
    { value: "seed-test_plan_status-active", label: "Active" },
    { value: "seed-test_plan_status-completed", label: "Completed" },
    { value: "seed-test_plan_status-archived", label: "Archived" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Test Plan</DialogTitle>
            <DialogDescription>
              Update the test plan details.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder="e.g., API Regression Suite"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the purpose and scope of this test plan..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                value={formData.statusId}
                onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TestPlansPage() {
  const { selectedProject } = useProject()
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadTestPlans = useCallback(async () => {
    if (!selectedProject) {
      setTestPlans([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/projects/${selectedProject.id}/test-plans`)
      setTestPlans(data.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        status: plan.status?.value || plan.statusId?.split('-').pop() || 'draft',
        createdAt: plan.createdAt,
        _count: { 
          suites: plan._count?.suites || 0, 
          cases: plan._count?.cases || 0,
          executions: plan._count?.executions || 0 
        },
        latestExecution: plan.latestExecution,
      })))
    } catch (err) {
      console.error("Failed to load test plans:", err)
      setTestPlans([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject])

  useEffect(() => {
    loadTestPlans()
  }, [loadTestPlans])

  const handleCreate = async (data: TestPlanFormData) => {
    if (!selectedProject) return
    
    const newPlan = await api.post<any>(`/projects/${selectedProject.id}/test-plans`, {
      name: data.name,
      description: data.description,
      statusId: "seed-test_plan_status-active",
    })
    
    setTestPlans([{
      id: newPlan.id,
      name: data.name,
      description: data.description,
      status: "active",
      createdAt: newPlan.createdAt || new Date().toISOString(),
      _count: { suites: 0, cases: 0, executions: 0 },
    }, ...testPlans])
    toast.success("Test plan created successfully")
  }

  const handleUpdate = async (data: TestPlanFormData) => {
    if (!editingPlan) return

    await api.patch<any>(`/test-plans/${editingPlan.id}`, {
      name: data.name,
      description: data.description,
      statusId: data.statusId,
    })

    setTestPlans(testPlans.map((p) =>
      p.id === editingPlan.id
        ? {
            ...p,
            name: data.name,
            description: data.description,
            status: data.statusId.split('-').pop() || 'draft',
            statusId: data.statusId,
          }
        : p
    ))
    setEditingPlan(null)
    toast.success("Test plan updated successfully")
  }

  const handleDelete = async (plan: TestPlan) => {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return
    setDeletingId(plan.id)
    try {
      await api.delete(`/test-plans/${plan.id}`)
      setTestPlans(testPlans.filter((p) => p.id !== plan.id))
      toast.success("Test plan deleted successfully")
    } catch (err) {
      console.error("Failed to delete test plan:", err)
      toast.error("Failed to delete test plan. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPlans = testPlans.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getPlanKey = (plan: TestPlan, index: number) => plan?.id ?? `plan-${index}`

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Plans</h1>
          <p className="text-muted-foreground mt-1">
            Select a project to view test plans
          </p>
        </div>
        <NoProjectSelected description="Please select a project from the header to view and manage test plans." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Plans</h1>
          <p className="text-muted-foreground mt-1">
            {selectedProject.name} / Test Plans
          </p>
        </div>
        <TestPlansSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Plans</h1>
        <p className="text-muted-foreground mt-1">
          {selectedProject.name} / Test Plans
        </p>
      </div>

      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search test plans..."
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
        <CreateTestPlanDialog
          onSubmit={handleCreate}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Test Plan
            </Button>
          }
        />
      </div>

      {filteredPlans.length === 0 && !searchQuery ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<FolderKanban className="h-8 w-8 text-muted-foreground" />}
              title="No test plans yet"
              description="Create your first test plan to start organizing and managing your test cases effectively."
              action={
                <CreateTestPlanDialog
                  onSubmit={handleCreate}
                  trigger={
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Test Plan
                    </Button>
                  }
                />
              }
            />
          </CardContent>
        </Card>
      ) : filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No test plans match your search.
            </p>
            {searchQuery && (
              <Button
                variant="link"
                onClick={() => setSearchQuery("")}
                className="mt-2"
              >
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan, idx) => {
            const status = statusColors[plan.status] || statusColors.draft
            return (
              <Card
                key={getPlanKey(plan, idx)}
                className="transition-all hover:shadow-md hover:border-primary/50 group"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/test-plans/${plan.id}`}
                        className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2"
                      >
                        {plan.name}
                      </Link>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className={`${status.bg} ${status.text} ml-2`}
                    >
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </span>
                    <span>{plan._count.suites} suites</span>
                    <span>{plan._count.cases} cases</span>
                  </div>

                  {plan.latestExecution && (
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 mb-4">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          {plan.latestExecution.passed}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          {plan.latestExecution.failed}
                        </span>
                      </div>
                      <Link
                        href={`/test-plans/${plan.id}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Run <PlayCircle className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <Link href={`/test-plans/${plan.id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <EditTestPlanDialog plan={plan} onSubmit={handleUpdate}>
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setEditingPlan(plan) }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </EditTestPlanDialog>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(plan)}
                          disabled={deletingId === plan.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === plan.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
