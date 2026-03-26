"use client"

import { User, Settings, LogOut, Shield, Mail, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

function getRoleDisplay(role: unknown): string {
  if (typeof role === "string") return role
  if (typeof role === "object" && role !== null && "label" in role) {
    return (role as { label: string }).label
  }
  if (typeof role === "object" && role !== null && "name" in role) {
    return (role as { name: string }).name
  }
  return "User"
}

export function ProfileDropdown() {
  const t = useTranslations()
  const { user, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" className="h-10 w-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Button>
    )
  }

  if (!user) return null

  const initials = (user.name ?? user.email)
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const roleDisplay = getRoleDisplay(user.role)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-10 px-3 hover:bg-accent transition-colors"
        >
          <Avatar className="h-8 w-8 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden lg:flex flex-col items-start">
            <span className="text-sm font-medium leading-none">
              {user.name || "User"}
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5">
              {roleDisplay}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="p-0 pb-2">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/50">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">
                {user.name || "User"}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                  <Shield className="h-3 w-3 mr-1" />
                  {roleDisplay}
                </Badge>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/profile" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            <span>{t("profile.myProfile")}</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/profile" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            <span>Preferences</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>{t("auth.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
