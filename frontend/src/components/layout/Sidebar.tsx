"use client"

import { ChevronLeft, ChevronRight, TestTube2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebarState } from "@/hooks/useSidebarState"
import { SidebarNav } from "./SidebarNav"
import { sidebarNavigation } from "@/lib/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { Menu } from "lucide-react"

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapse, setMobileOpen } =
    useSidebarState()
  const [mobileOpen, setLocalMobileOpen] = useState(false)

  return (
    <>
      <aside
        className={`hidden md:flex flex-col border-r bg-card h-screen sticky top-0 transition-all duration-200 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setLocalMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed bottom-4 left-4 z-50"
            onClick={() => setLocalMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-14 items-center border-b px-4">
            <TestTube2 className="h-6 w-6 text-primary" />
            <span className="ml-2 font-semibold">TestTool</span>
          </div>
          <SidebarNav sections={sidebarNavigation} isCollapsed={false} />
        </SheetContent>
      </Sheet>
    </>
  )
}

interface SidebarContentProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

function SidebarContent({
  isCollapsed,
  onToggleCollapse,
}: SidebarContentProps) {
  return (
    <>
      <div
        className={`flex h-14 items-center border-b px-4 ${
          isCollapsed ? "justify-center" : "gap-2"
        }`}
      >
        <TestTube2 className="h-6 w-6 text-primary" />
        {!isCollapsed && (
          <span className="font-semibold text-lg">TestTool</span>
        )}
      </div>

      <SidebarNav sections={sidebarNavigation} isCollapsed={isCollapsed} />

      <div className={`border-t p-2 ${isCollapsed ? "flex justify-center" : ""}`}>
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          onClick={onToggleCollapse}
          className={isCollapsed ? "w-9 h-9" : "w-full justify-start gap-2"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </>
  )
}
