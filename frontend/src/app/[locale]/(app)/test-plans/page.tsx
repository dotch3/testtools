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
  Clock,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
}

interface FormErrors {
  name?: string
}

const mockTestPlans: TestPlan[] = [
  {
    id: "1",
    name: "API Regression Suite",
    description: "Full regression suite for REST API endpoints",
    status: "active",
    createdAt: "2024-03-15",
    _count: { suites: 5, cases: 124, executions: 45 },
    latestExecution: { passed: 118, failed: 6, status: "failed" },
  },
  {
    id: "2",
    name: "UI Smoke Tests",
    description: "Critical UI flows smoke test",
    status: "active",
    createdAt: "2024-03-10",
    _count: { suites: 3, cases: 45, executions: 30 },
    latestExecution: { passed: 45, failed: 0, status: "passed" },
  },
  {
    id: "3",
    name: "Login Flow Tests",
    description: "Authentication and authorization test cases",
    status: "active",
    createdAt: "2024-03-05",
    _count: { suites: 2, cases: 28, executions: 20 },
    latestExecution: { passed: 28, failed: 0, status: "passed" },
  },
  {
    id: "4",
    name: "Payment Integration",
    description: "Payment gateway integration tests",
    status: "draft",
    createdAt: "2024-03-01",
    _count: { suites: 1, cases: 15, executions: 0 },
  },
]

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-500/10", text: "text-green-600", label: "Active" },
  draft: { bg: "bg-gray-500/10", text: "text-gray-600", label: "Draft" },
  archived: { bg: "bg-yellow-500/10", text: "text-yellow-600", label: "Archived" },
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
      setFormData({ name: "", description: "" })
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
              <AlertCircle className="h-4 w-4" />
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

function TestPlansSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No test plans yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        Create your first test plan to start organizing and managing your test
        cases effectively.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Create Test Plan
      </Button>
    </div>
  )
}

export default function TestPlansPage() {
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadTestPlans = useCallback(async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setTestPlans(mockTestPlans)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadTestPlans()
  }, [loadTestPlans])

  const handleCreate = async (data: TestPlanFormData) => {
    console.log("Creating:", data)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setTestPlans([
      {
        id: String(Date.now()),
        name: data.name,
        description: data.description,
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
        _count: { suites: 0, cases: 0, executions: 0 },
      },
      ...testPlans,
    ])
    setIsCreateOpen(false)
  }

  const handleDelete = async (plan: TestPlan) => {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return
    setDeletingId(plan.id)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setTestPlans(testPlans.filter((p) => p.id !== plan.id))
    setDeletingId(null)
  }

  const filteredPlans = testPlans.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Plans</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your test plans
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
          Manage and organize your test plans
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
        <EmptyState onCreate={() => setIsCreateOpen(true)} />
      ) : filteredPlans.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
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
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPlans.map((plan) => {
            const status = statusColors[plan.status] || statusColors.draft
            return (
              <div
                key={plan.id}
                className="rounded-lg border bg-card p-6 transition-all hover:shadow-md hover:border-primary/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link
                      href={`/test-plans/${plan.id}`}
                      className="text-lg font-semibold hover:text-primary transition-colors"
                    >
                      {plan.name}
                    </Link>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
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
                      <DropdownMenuItem disabled>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
