"use client"

import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"
import { ProfileDropdown } from "./ProfileDropdown"
import { Breadcrumbs } from "./Breadcrumbs"

export function Header() {
  return (
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

        <ThemeToggle />
        <ProfileDropdown />
      </div>
    </header>
  )
}
