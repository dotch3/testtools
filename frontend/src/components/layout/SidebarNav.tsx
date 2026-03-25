"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavSection } from "@/lib/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AboutDialog } from "./AboutDialog"

interface SidebarNavProps {
  sections: NavSection[]
  isCollapsed: boolean
}

export function SidebarNav({ sections, isCollapsed }: SidebarNavProps) {
  const t = useTranslations()
  const pathname = usePathname()
  const [showAbout, setShowAbout] = useState(false)

  return (
    <>
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-2">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.titleKey && !isCollapsed && (
                <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(section.titleKey)}
                </h4>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                const isAbout = item.href === "/about"

                if (isAbout) {
                  return (
                    <button
                      key={item.href}
                      onClick={() => setShowAbout(true)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isCollapsed ? "justify-center px-2" : "",
                        "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      title={isCollapsed ? t(item.titleKey) : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{t(item.titleKey)}</span>}
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                    title={isCollapsed ? t(item.titleKey) : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{t(item.titleKey)}</span>}
                  </Link>
                )
              })}
              {idx < sections.length - 1 && !isCollapsed && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  )
}
