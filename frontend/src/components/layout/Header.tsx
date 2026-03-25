"use client"

import { Bell, Search, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"
import { ProfileDropdown } from "./ProfileDropdown"
import { Breadcrumbs } from "./Breadcrumbs"
import { AboutDialog } from "./AboutDialog"
import { useState } from "react"

export function Header() {
  const [showAbout, setShowAbout] = useState(false)

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4">
        <div className="flex-1">
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setShowAbout(true)}
          >
            <Info className="h-4 w-4" />
            <span className="sr-only">About</span>
          </Button>

          <ThemeToggle />
          <ProfileDropdown />
        </div>
      </header>

      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  )
}
