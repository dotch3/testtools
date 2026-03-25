"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  AlertCircle,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface TestCaseRow {
  id: string
  title: string
  description?: string
  priority: {
    label: string
    color?: string
  }
  type: {
    label: string
  }
  _count?: {
    executions: number
  }
}

interface TestCaseFormData {
  title: string
  description: string
  priorityId: string
  typeId: string
}

interface TestCaseFormErrors {
  title?: string
  priorityId?: string
  typeId?: string
}

interface TestCaseListProps {
  suiteId: string
  cases: TestCaseRow[]
  isLoading: boolean
  error?: string
  onRefresh: () => void
  onSelect?: (testCase: TestCaseRow) => void
}

function TestCaseFormDialog({
  isOpen,
  onClose,
  onSubmit,
  testCase,
  isSubmitting,
  error,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TestCaseFormData) => Promise<void>
  testCase?: TestCaseRow | null
  isSubmitting: boolean
  error?: string
}) {
  const [formData, setFormData] = useState<TestCaseFormData>({
    title: testCase?.title || "",
    description: testCase?.description || "",
    priorityId: "",
    typeId: "",
  })
  const [errors, setErrors] = useState<TestCaseFormErrors>({})

  const validate = (): boolean => {
    const newErrors: TestCaseFormErrors = {}
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
    if (!validate()) return
    await onSubmit(formData)
  }

  const priorities = [
    { value: "low", label: "Low", color: "#3b82f6" },
    { value: "medium", label: "Medium", color: "#f59e0b" },
    { value: "high", label: "High", color: "#ef4444" },
    { value: "critical", label: "Critical", color: "#dc2626" },
  ]

  const types = [
    { value: "functional", label: "Functional" },
    { value: "integration", label: "Integration" },
    { value: "performance", label: "Performance" },
    { value: "security", label: "Security" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {testCase ? "Edit Test Case" : "Create Test Case"}
            </DialogTitle>
            <DialogDescription>
              {testCase
                ? "Update the test case details."
                : "Add a new test case to this suite."}
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
                placeholder="Verify user login functionality"
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
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
                    if (errors.priorityId)
                      setErrors({ ...errors, priorityId: undefined })
                  }}
                  className={`w-full h-10 px-3 rounded-md border bg-background text-sm ${
                    errors.priorityId ? "border-destructive" : "border-input"
                  }`}
                >
                  <option value="">Select priority</option>
                  {priorities.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {errors.priorityId && (
                  <p className="text-sm text-destructive">{errors.priorityId}</p>
                )}
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
                    if (errors.typeId)
                      setErrors({ ...errors, typeId: undefined })
                  }}
                  className={`w-full h-10 px-3 rounded-md border bg-background text-sm ${
                    errors.typeId ? "border-destructive" : "border-input"
                  }`}
                >
                  <option value="">Select type</option>
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {errors.typeId && (
                  <p className="text-sm text-destructive">{errors.typeId}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : testCase
                  ? "Save Changes"
                  : "Create Test Case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TestCaseSkeleton() {
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
              <TableHead className="text-center">Executions</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-8 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
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
    <div className="rounded-lg border bg-card p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Plus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No test cases yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create your first test case to get started.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Create Test Case
      </Button>
    </div>
  )
}

export function TestCaseList({
  suiteId,
  cases,
  isLoading,
  error,
  onRefresh,
  onSelect,
}: TestCaseListProps) {
  const t = useTranslations("common")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCaseRow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = async (data: TestCaseFormData) => {
    setFormError("")
    setIsSubmitting(true)
    try {
      await api.post(`/suites/${suiteId}/cases`, data)
      setIsCreateOpen(false)
      onRefresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create test case")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: TestCaseFormData) => {
    if (!editingCase) return
    setFormError("")
    setIsSubmitting(true)
    try {
      await api.patch(`/test-cases/${editingCase.id}`, data)
      setEditingCase(null)
      onRefresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update test case")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (testCase: TestCaseRow) => {
    if (
      !confirm(
        `Are you sure you want to delete "${testCase.title}"? This action cannot be undone.`
      )
    ) {
      return
    }
    setDeletingId(testCase.id)
    try {
      await api.delete(`/test-cases/${testCase.id}`)
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete test case")
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return <TestCaseSkeleton />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
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
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Test Case
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            Retry
          </Button>
        </div>
      )}

      {cases.length === 0 && !searchQuery ? (
        <EmptyState onCreate={() => setIsCreateOpen(true)} />
      ) : filteredCases.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No test cases match your search.</p>
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
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Executions</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((testCase) => (
                <TableRow
                  key={testCase.id}
                  className="cursor-pointer"
                  onClick={() => onSelect?.(testCase)}
                >
                  <TableCell className="font-medium">{testCase.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: testCase.priority.color,
                        color: testCase.priority.color,
                      }}
                    >
                      {testCase.priority.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{testCase.type.label}</TableCell>
                  <TableCell className="text-center">
                    {testCase._count?.executions ?? 0}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingCase(testCase)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(testCase)}
                          disabled={deletingId === testCase.id}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === testCase.id ? "Deleting..." : "Delete"}
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

      <TestCaseFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        error={formError}
      />

      <TestCaseFormDialog
        isOpen={!!editingCase}
        onClose={() => setEditingCase(null)}
        onSubmit={handleUpdate}
        testCase={editingCase}
        isSubmitting={isSubmitting}
        error={formError}
      />
    </div>
  )
}
