"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  X,
  Folder,
  MoreHorizontal,
  Pencil,
  Trash2,
  TestTubes,
  ChevronRight,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
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

interface TestSuite {
  id: string
  name: string
  description?: string
  projectId: string
  projectName: string
  _count: {
    cases: number
  }
}

interface SuiteFormData {
  name: string
  description: string
  projectId: string
}

interface FormErrors {
  name?: string
  projectId?: string
}

const mockSuites: TestSuite[] = [
  { id: "1", name: "Authentication", description: "Login, logout, and session tests", projectId: "1", projectName: "Web App", _count: { cases: 45 } },
  { id: "2", name: "User Management", description: "User CRUD and profile tests", projectId: "1", projectName: "Web App", _count: { cases: 32 } },
  { id: "3", name: "API Endpoints", description: "REST API integration tests", projectId: "2", projectName: "Mobile App", _count: { cases: 78 } },
  { id: "4", name: "Payment Flow", description: "Payment processing tests", projectId: "1", projectName: "Web App", _count: { cases: 25 } },
  { id: "5", name: "Dashboard", description: "Main dashboard functionality", projectId: "3", projectName: "Admin Portal", _count: { cases: 18 } },
]

function CreateSuiteDialog({
  onSubmit,
  trigger,
}: {
  onSubmit: (data: SuiteFormData) => Promise<void>
  trigger?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<SuiteFormData>({
    name: "",
    description: "",
    projectId: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = "Suite name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters"
    }
    if (!formData.projectId) {
      newErrors.projectId = "Please select a project"
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
      setFormData({ name: "", description: "", projectId: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create suite")
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
            <DialogTitle>Create Test Suite</DialogTitle>
            <DialogDescription>
              Create a new test suite to organize related test cases.
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
              <Label htmlFor="project">
                Project <span className="text-destructive">*</span>
              </Label>
              <select
                id="project"
                value={formData.projectId}
                onChange={(e) => {
                  setFormData({ ...formData, projectId: e.target.value })
                  if (errors.projectId) setErrors({ ...errors, projectId: undefined })
                }}
                className={`w-full h-10 px-3 rounded-md border bg-background text-sm ${
                  errors.projectId ? "border-destructive" : "border-input"
                }`}
              >
                <option value="">Select a project</option>
                <option value="1">Web App</option>
                <option value="2">Mobile App</option>
                <option value="3">Admin Portal</option>
              </select>
              {errors.projectId && (
                <p className="text-sm text-destructive">{errors.projectId}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">
                Suite Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder="e.g., Authentication Tests"
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
                placeholder="Describe the purpose of this test suite..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Suite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SuitesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-20" />
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
        <Folder className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">No test suites yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        Create test suites to organize your test cases by feature or module.
      </p>
      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Create Test Suite
      </Button>
    </div>
  )
}

export default function TestSuitesPage() {
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadSuites = useCallback(async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setSuites(mockSuites)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadSuites()
  }, [loadSuites])

  const handleCreate = async (data: SuiteFormData) => {
    console.log("Creating:", data)
    await new Promise((resolve) => setTimeout(resolve, 500))
    const projectName = ["Web App", "Mobile App", "Admin Portal"].find(
      (_, i) => String(i + 1) === data.projectId
    ) || "Unknown"
    setSuites([
      {
        id: String(Date.now()),
        name: data.name,
        description: data.description,
        projectId: data.projectId,
        projectName,
        _count: { cases: 0 },
      },
      ...suites,
    ])
    setIsCreateOpen(false)
  }

  const handleDelete = async (suite: TestSuite) => {
    if (!confirm(`Delete "${suite.name}"? This cannot be undone.`)) return
    setDeletingId(suite.id)
    await new Promise((resolve) => setTimeout(resolve, 500))
    setSuites(suites.filter((s) => s.id !== suite.id))
    setDeletingId(null)
  }

  const filteredSuites = suites.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Suites</h1>
          <p className="text-muted-foreground mt-1">
            Organize test cases into suites
          </p>
        </div>
        <SuitesSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Suites</h1>
        <p className="text-muted-foreground mt-1">
          Organize test cases into suites
        </p>
      </div>

      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suites..."
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
        <CreateSuiteDialog
          onSubmit={handleCreate}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Suite
            </Button>
          }
        />
      </div>

      {filteredSuites.length === 0 && !searchQuery ? (
        <EmptyState onCreate={() => setIsCreateOpen(true)} />
      ) : filteredSuites.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No suites match your search.</p>
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
        <div className="space-y-2">
          {filteredSuites.map((suite) => (
            <div
              key={suite.id}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card transition-all hover:shadow-sm hover:border-primary/50"
            >
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Folder className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{suite.name}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {suite.projectName}
                  </span>
                </div>
                {suite.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {suite.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <TestTubes className="h-4 w-4" />
                  {suite._count.cases} cases
                </span>
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
                      onClick={() => handleDelete(suite)}
                      disabled={deletingId === suite.id}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingId === suite.id ? "Deleting..." : "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link href={`/test-suites/${suite.id}`}>
                  <Button variant="ghost" size="sm">
                    View <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
