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
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

interface TestCase {
  id: string
  title: string
  description?: string
  priority: { value: string; label: string; color: string }
  type: { value: string; label: string }
  suite: { id: string; name: string }
  status: string
  _count: { executions: number }
}

interface CaseFormData {
  title: string
  description: string
  priorityId: string
  typeId: string
  suiteId: string
}

interface FormErrors {
  title?: string
  priorityId?: string
  typeId?: string
}

const mockCases: TestCase[] = [
  { id: "1", title: "Verify user login with valid credentials", description: "Test successful login with correct email and password", priority: { value: "high", label: "High", color: "#ef4444" }, type: { value: "functional", label: "Functional" }, suite: { id: "1", name: "Authentication" }, status: "active", _count: { executions: 15 } },
  { id: "2", title: "Verify login fails with wrong password", description: "Test that login fails gracefully with incorrect password", priority: { value: "high", label: "High", color: "#ef4444" }, type: { value: "functional", label: "Functional" }, suite: { id: "1", name: "Authentication" }, status: "active", _count: { executions: 15 } },
  { id: "3", title: "Verify password reset flow", description: "Test password reset via email link", priority: { value: "medium", label: "Medium", color: "#f59e0b" }, type: { value: "functional", label: "Functional" }, suite: { id: "1", name: "Authentication" }, status: "active", _count: { executions: 8 } },
  { id: "4", title: "Verify API returns correct JSON structure", description: "Test that API responses match expected schema", priority: { value: "medium", label: "Medium", color: "#f59e0b" }, type: { value: "integration", label: "Integration" }, suite: { id: "3", name: "API Endpoints" }, status: "active", _count: { executions: 22 } },
  { id: "5", title: "Verify payment processing with valid card", description: "Test successful payment with valid credit card", priority: { value: "critical", label: "Critical", color: "#dc2626" }, type: { value: "functional", label: "Functional" }, suite: { id: "4", name: "Payment Flow" }, status: "active", _count: { executions: 5 } },
  { id: "6", title: "Verify payment fails with expired card", description: "Test that expired cards are rejected", priority: { value: "high", label: "High", color: "#ef4444" }, type: { value: "functional", label: "Functional" }, suite: { id: "4", name: "Payment Flow" }, status: "active", _count: { executions: 5 } },
  { id: "7", title: "Verify user profile update", description: "Test updating user profile information", priority: { value: "low", label: "Low", color: "#3b82f6" }, type: { value: "functional", label: "Functional" }, suite: { id: "2", name: "User Management" }, status: "active", _count: { executions: 10 } },
  { id: "8", title: "Verify API rate limiting", description: "Test that rate limits are enforced correctly", priority: { value: "low", label: "Low", color: "#3b82f6" }, type: { value: "performance", label: "Performance" }, suite: { id: "3", name: "API Endpoints" }, status: "draft", _count: { executions: 0 } },
]

const priorities = [
  { value: "critical", label: "Critical", color: "#dc2626" },
  { value: "high", label: "High", color: "#ef4444" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "low", label: "Low", color: "#3b82f6" },
]

const types = [
  { value: "functional", label: "Functional" },
  { value: "integration", label: "Integration" },
  { value: "performance", label: "Performance" },
  { value: "security", label: "Security" },
]

function CreateCaseDialog({
  onSubmit,
  trigger,
}: {
  onSubmit: (data: CaseFormData) => Promise<void>
  trigger?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<CaseFormData>({
    title: "",
    description: "",
    priorityId: "",
    typeId: "",
    suiteId: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    } else if (formData.title.length < 5) {
      newErrors.title = "Title must be at least 5 characters"
    }
    if (!formData.priorityId) {
      newErrors.priorityId = "Priority is required"
    }
    if (!formData.typeId) {
      newErrors.typeId = "Type is required"
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
      setFormData({ title: "", description: "", priorityId: "", typeId: "", suiteId: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create test case")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Test Case</DialogTitle>
            <DialogDescription>
              Add a new test case to your test suite.
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
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value })
                  if (errors.title) setErrors({ ...errors, title: undefined })
                }}
                placeholder="e.g., Verify user login with valid credentials"
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the test case steps and expected results..."
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
                  value={formData.priorityId}
                  onChange={(e) => {
                    setFormData({ ...formData, priorityId: e.target.value })
                    if (errors.priorityId) setErrors({ ...errors, priorityId: undefined })
                  }}
                  className={`w-full h-10 px-3 rounded-md border bg-background text-sm ${
                    errors.priorityId ? "border-destructive" : "border-input"
                  }`}
                >
                  <option value="">Select priority</option>
                  {priorities.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                {errors.priorityId && <p className="text-sm text-destructive">{errors.priorityId}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <select
                  id="type"
                  value={formData.typeId}
                  onChange={(e) => {
                    setFormData({ ...formData, typeId: e.target.value })
                    if (errors.typeId) setErrors({ ...errors, typeId: undefined })
                  }}
                  className={`w-full h-10 px-3 rounded-md border bg-background text-sm ${
                    errors.typeId ? "border-destructive" : "border-input"
                  }`}
                >
                  <option value="">Select type</option>
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.typeId && <p className="text-sm text-destructive">{errors.typeId}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Test Case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CasesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Suite</TableHead>
              <TableHead className="text-center">Runs</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(8)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <TestTubes className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No test cases yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        Create test cases to verify your application functionality.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Create Test Case
      </Button>
    </div>
  )
}

export default function TestCasesPage() {
  const [cases, setCases] = useState<TestCase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadCases = useCallback(async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setCases(mockCases)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  const handleCreate = async (data: CaseFormData) => {
    console.log("Creating:", data)
    await new Promise((resolve) => setTimeout(resolve, 500))
    const priority = priorities.find((p) => p.value === data.priorityId) || priorities[1]
    const type = types.find((t) => t.value === data.typeId) || types[0]
    setCases([
      {
        id: String(Date.now()),
        title: data.title,
        description: data.description,
        priority: { value: priority.value, label: priority.label, color: priority.color },
        type: { value: type.value, label: type.label },
        suite: { id: "1", name: "New Suite" },
        status: "active",
        _count: { executions: 0 },
      },
      ...cases,
    ])
    setIsCreateOpen(false)
  }

  const handleDelete = async (caseItem: TestCase) => {
    if (!confirm(`Delete "${caseItem.title}"? This cannot be undone.`)) return
    setDeletingId(caseItem.id)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setCases(cases.filter((c) => c.id !== caseItem.id))
    setDeletingId(null)
  }

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = !priorityFilter || c.priority.value === priorityFilter
    return matchesSearch && matchesPriority
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage test cases
          </p>
        </div>
        <CasesSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Cases</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage test cases
        </p>
      </div>

      <div className="flex justify-between gap-4">
        <div className="flex gap-2 flex-1">
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
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">All Priorities</option>
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <CreateCaseDialog
          onSubmit={handleCreate}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Test Case
            </Button>
          }
        />
      </div>

      {filteredCases.length === 0 && !searchQuery && !priorityFilter ? (
        <EmptyState onCreate={() => setIsCreateOpen(true)} />
      ) : filteredCases.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No test cases match your filters.</p>
          <div className="flex justify-center gap-2 mt-2">
            {searchQuery && (
              <Button variant="link" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            )}
            {priorityFilter && (
              <Button variant="link" onClick={() => setPriorityFilter("")}>
                Clear filter
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Suite</TableHead>
                <TableHead className="text-center">Runs</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((caseItem) => (
                <TableRow key={caseItem.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium">{caseItem.title}</p>
                      {caseItem.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {caseItem.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: caseItem.priority.color,
                        color: caseItem.priority.color,
                      }}
                    >
                      {caseItem.priority.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {caseItem.type.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{caseItem.suite.name}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">
                      {caseItem._count.executions}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
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
                          onClick={() => handleDelete(caseItem)}
                          disabled={deletingId === caseItem.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === caseItem.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
