"use client"

import { FolderKanban, ChevronDown, Check, Loader2 } from "lucide-react"
import { useProject } from "@/contexts/ProjectContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function ProjectSelector() {
  const { projects, selectedProject, setSelectedProject, isLoading } = useProject()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading projects...</span>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FolderKanban className="h-4 w-4" />
        <span>No projects</span>
      </div>
    )
  }

  if (projects.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <span>{selectedProject?.name}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 px-2 text-sm font-medium"
        >
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <span>{selectedProject?.name || "Select project"}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => setSelectedProject(project)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span>{project.name}</span>
              <span className="text-xs text-muted-foreground">{project.key}</span>
            </div>
            {selectedProject?.id === project.id && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}