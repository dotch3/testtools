"use client"

import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { useState, useEffect } from "react"
import type { Project } from "@/types/project"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateProjectDialog } from "./CreateProjectDialog"
import Link from "next/link"

export function ProjectsTable() {
  const t = useTranslations("common")
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await api.get<Project[]>("/projects")
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async (data: { name: string; description: string }) => {
    try {
      await api.post("/projects", data)
      await loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">{t("loading")}</div>
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateProjectDialog
          onSubmit={handleCreateProject}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("create")}
            </Button>
          }
        />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No projects yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Members</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Test Plans</th>
                <th className="px-4 py-3 text-right text-sm font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {project.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {project._count?.members ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {project._count?.testPlans ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
