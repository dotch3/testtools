import {
  LayoutDashboard,
  ClipboardList,
  TestTubes,
  PlayCircle,
  Bug,
  BarChart3,
  Map,
  Users,
  Shield,
  ListTodo,
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
      },
      {
        titleKey: "nav.testPlans",
        href: "/test-plans",
        icon: ClipboardList,
      },
      {
        titleKey: "nav.testSuites",
        href: "/test-suites",
        icon: TestTubes,
      },
      {
        titleKey: "nav.testCases",
        href: "/test-cases",
        icon: ListTodo,
      },
      {
        titleKey: "nav.executions",
        href: "/executions",
        icon: PlayCircle,
      },
      {
        titleKey: "nav.bugs",
        href: "/bugs",
        icon: Bug,
      },
      {
        titleKey: "nav.notifications",
        href: "/notifications",
        icon: Bell,
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
      },
      {
        titleKey: "nav.coverage",
        href: "/reports/coverage",
        icon: Map,
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
      },
      {
        titleKey: "nav.roles",
        href: "/admin/roles",
        icon: Shield,
      },
      {
        titleKey: "nav.enums",
        href: "/admin/enums",
        icon: Database,
      },
      {
        titleKey: "nav.integrations",
        href: "/admin/integrations",
        icon: Plug,
      },
      {
        titleKey: "nav.settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
]
