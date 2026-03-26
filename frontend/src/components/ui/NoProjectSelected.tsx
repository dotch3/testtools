"use client"

import { ChevronRight, FolderKanban } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useProject } from "@/contexts/ProjectContext"

interface NoProjectSelectedProps {
  title?: string
  description?: string
}

export function NoProjectSelected({
  title = "No Project Selected",
  description = "Please select a project from the header to continue.",
}: NoProjectSelectedProps) {
  const { selectedProject } = useProject()

  if (selectedProject) return null

  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FolderKanban className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          {description}
        </p>
        <Button asChild>
          <Link href="/projects/select">
            <ChevronRight className="mr-2 h-4 w-4" />
            Select Project
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
