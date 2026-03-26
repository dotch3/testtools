"use client"

import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home, FolderKanban } from "lucide-react"
import { Fragment } from "react"
import { useProject } from "@/contexts/ProjectContext"

export function Breadcrumbs() {
  const t = useTranslations("breadcrumbs")
  const pathname = usePathname()
  const { selectedProject } = useProject()

  const segments = pathname.split("/").filter(Boolean)
  const locale = segments[0]
  const paths = segments.slice(1)

  if (paths.length === 0 || (paths.length === 1 && paths[0] === "dashboard")) {
    return (
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <span>{t("home")}</span>
      </nav>
    )
  }

  const items = paths.map((segment, index) => {
    const href = `/${locale}/${paths.slice(0, index + 1).join("/")}`
    const label = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())

    return { href, label }
  })

  return (
    <nav className="flex items-center gap-1 text-sm">
      {selectedProject && (
        <>
          <Link
            href={`/${locale}/projects/${selectedProject.id}/dashboard`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <FolderKanban className="h-4 w-4" />
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </>
      )}

      <Link
        href={`/${locale}/dashboard`}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => (
        <Fragment key={item.href}>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {index === items.length - 1 ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
