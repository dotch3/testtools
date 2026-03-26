import {
  LayoutDashboard,
  ClipboardList,
  FlaskConical,
  PlayCircle,
  Bug,
  BarChart3,
  Map,
  Users,
  Shield,
  ListChecks,
  Settings,
  Plug,
  Database,
  Bell,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  titleKey: string
  href: string
  icon: LucideIcon
  iconColor?: string
  badge?: string
}

export interface NavSection {
  titleKey?: string
  items: NavItem[]
  adminOnly?: boolean
}

export const sidebarNavigation: NavSection[] = [
  {
    items: [
      {
        titleKey: "nav.dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        iconColor: "text-icon-blue",
      },
      {
        titleKey: "nav.testPlans",
        href: "/test-plans",
        icon: ClipboardList,
        iconColor: "text-icon-purple",
      },
      {
        titleKey: "nav.testSuites",
        href: "/test-suites",
        icon: FlaskConical,
        iconColor: "text-icon-cyan",
      },
      {
        titleKey: "nav.testCases",
        href: "/test-cases",
        icon: ListChecks,
        iconColor: "text-icon-green",
      },
      {
        titleKey: "nav.executions",
        href: "/executions",
        icon: PlayCircle,
        iconColor: "text-icon-orange",
      },
      {
        titleKey: "nav.bugs",
        href: "/bugs",
        icon: Bug,
        iconColor: "text-destructive",
      },
      {
        titleKey: "nav.notifications",
        href: "/notifications",
        icon: Bell,
        iconColor: "text-icon-pink",
      },
    ],
  },
  {
    titleKey: "nav.reports",
    items: [
      {
        titleKey: "nav.reportsDashboard",
        href: "/reports/dashboard",
        icon: BarChart3,
        iconColor: "text-icon-blue",
      },
      {
        titleKey: "nav.coverage",
        href: "/reports/coverage",
        icon: Map,
        iconColor: "text-icon-purple",
      },
    ],
  },
  {
    titleKey: "nav.admin",
    adminOnly: true,
    items: [
      {
        titleKey: "nav.users",
        href: "/admin/users",
        icon: Users,
        iconColor: "text-icon-blue",
      },
      {
        titleKey: "nav.roles",
        href: "/admin/roles",
        icon: Shield,
        iconColor: "text-icon-purple",
      },
      {
        titleKey: "nav.enums",
        href: "/admin/enums",
        icon: Database,
        iconColor: "text-icon-cyan",
      },
      {
        titleKey: "nav.integrations",
        href: "/admin/integrations",
        icon: Plug,
        iconColor: "text-icon-green",
      },
      {
        titleKey: "nav.settings",
        href: "/admin/settings",
        icon: Settings,
        iconColor: "text-muted-foreground",
      },
    ],
  },
]
