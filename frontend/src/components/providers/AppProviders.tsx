"use client"

import { useSidebarState } from "@/hooks/useSidebarState"
import { AuthProvider } from "./AuthProvider"
import { ProjectProvider } from "@/contexts/ProjectContext"
import { TooltipProvider } from "@/components/ui/tooltip"

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  useSidebarState()

  return (
    <AuthProvider>
      <ProjectProvider>
        <TooltipProvider delayDuration={0}>
          {children}
        </TooltipProvider>
      </ProjectProvider>
    </AuthProvider>
  )
}
