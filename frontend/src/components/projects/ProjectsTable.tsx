"use client"

import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import type { Project } from "@/types/project"
import { useProject } from "@/contexts/ProjectContext"
import { useAuth } from "@/components/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { FolderKanban } from "lucide-react"

interface ProjectFormData {
  name: string
  description: string
}

interface FormErrors {
  name?: string
}

function CreateProjectDialog({
  onSubmit,
  trigger,
}: {
  onSubmit: (data: ProjectFormData) => Promise<void>
  trigger?: React.ReactNode
}) {
  const t = useTranslations("common")
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<ProjectFormData>({ name: "", description: "" })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = "Project name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Project name must be at least 3 characters"
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
      setError(err instanceof Error ? err.message : "Failed to create project")
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
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your test management work.
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
              <Label htmlFor="create-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                placeholder="My Project"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Input
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditProjectDialog({
  project,
  onSubmit,
  trigger,
}: {
  project: Project
  onSubmit: (data: ProjectFormData) => Promise<void>
  trigger?: React.ReactNode
}) {
  const t = useTranslations("common")
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<ProjectFormData>({
    name: project.name,
    description: project.description || "",
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = "Project name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Project name must be at least 3 characters"
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
      setError(err instanceof Error ? err.message : "Failed to update project")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setFormData({ name: project.name, description: project.description || "" })
      setErrors({})
      setError("")
    }
    setIsOpen(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details.
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
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
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

function ProjectsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-lg border">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border bg-destructive/5 p-8 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-medium mb-1">Something went wrong</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  )
}

export function ProjectsTable() {
  const t = useTranslations("common")
  const { refreshProjects } = useProject()
  const { user } = useAuth()
  const isAdmin = user?.role === "Admin"
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      setError("")
      setIsLoading(true)
      const data = await api.get<Project[]>("/projects")
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreateProject = async (data: ProjectFormData) => {
    await api.post("/projects", data)
    await loadProjects()
    await refreshProjects()
    toast.success("Project created successfully")
  }

  const handleUpdateProject = async (id: string, data: ProjectFormData) => {
    await api.patch(`/projects/${id}`, data)
    await loadProjects()
    await refreshProjects()
    toast.success("Project updated successfully")
  }

  const handleDeleteProject = async (project: Project) => {
    setDeletingId(project.id)
    try {
      await api.delete(`/projects/${project.id}`)
      setProjects(projects.filter((p) => p.id !== project.id))
      await refreshProjects()
      toast.success("Project deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project")
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return <ProjectsSkeleton />
  }

  if (error && projects.length === 0) {
    return <ErrorState message={error} onRetry={loadProjects} />
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <CreateProjectDialog
            onSubmit={handleCreateProject}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            }
          />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
          <Button variant="ghost" size="sm" onClick={loadProjects}>
            Retry
          </Button>
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-8 w-8 text-muted-foreground" />}
          title="No projects yet"
          description={isAdmin ? "Create your first project to get started." : "No projects have been created yet."}
          action={
            isAdmin ? (
              <CreateProjectDialog
                onSubmit={handleCreateProject}
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                }
              />
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Members</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Test Plans</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {project.description || <span className="italic">No description</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {project._count?.members ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {project._count?.testPlans ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/projects/${project.id}`} className="flex items-center">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <EditProjectDialog
                          project={project}
                          onSubmit={(data) => handleUpdateProject(project.id, data)}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          }
                        />
                        {isAdmin && (
                          <DropdownMenuItem
                            onClick={() => setDeleteConfirm(project)}
                            disabled={deletingId === project.id}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingId === project.id ? "Deleting..." : "Delete"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}
        title="Delete Project"
        description={deleteConfirm ? `Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.` : ""}
        onConfirm={() => deleteConfirm && handleDeleteProject(deleteConfirm)}
      />
    </div>
  )
}

export { CreateProjectDialog }
