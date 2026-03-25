"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ClipboardList,
  TestTubes,
  PlayCircle,
  Bug,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Activity,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface DashboardStats {
  testPlans: number
  testCases: number
  executionsThisWeek: number
  openBugs: number
}

interface RecentExecution {
  id: string
  testPlan: string
  status: "passed" | "failed" | "pending" | "running"
  passed: number
  failed: number
  date: string
}

const mockStats: DashboardStats = {
  testPlans: 12,
  testCases: 847,
  executionsThisWeek: 156,
  openBugs: 23,
}

const mockRecentExecutions: RecentExecution[] = [
  { id: "1", testPlan: "API Regression Suite", status: "passed", passed: 45, failed: 2, date: "2 hours ago" },
  { id: "2", testPlan: "UI Smoke Tests", status: "failed", passed: 12, failed: 5, date: "5 hours ago" },
  { id: "3", testPlan: "Login Flow Tests", status: "passed", passed: 28, failed: 0, date: "Yesterday" },
  { id: "4", testPlan: "Payment Integration", status: "pending", passed: 0, failed: 0, date: "Today" },
]

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([])

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 800))
      setStats(mockStats)
      setRecentExecutions(mockRecentExecutions)
      setIsLoading(false)
    }
    loadDashboard()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your test management activities
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Test Plans"
          value={stats?.testPlans}
          isLoading={isLoading}
          icon={ClipboardList}
          description="Active plans"
          href="/test-plans"
          color="blue"
        />
        <StatCard
          title="Test Cases"
          value={stats?.testCases}
          isLoading={isLoading}
          icon={TestTubes}
          description="Total cases"
          href="/test-cases"
          color="purple"
        />
        <StatCard
          title="Executions"
          value={stats?.executionsThisWeek}
          isLoading={isLoading}
          icon={PlayCircle}
          description="This week"
          href="/executions"
          color="green"
        />
        <StatCard
          title="Open Bugs"
          value={stats?.openBugs}
          isLoading={isLoading}
          icon={Bug}
          description="Requires attention"
          href="/bugs"
          color="red"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentExecutionsCard
          executions={recentExecutions}
          isLoading={isLoading}
        />
        <ExecutionStatusCard isLoading={isLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <QuickActionCard
          title="Create Test Plan"
          description="Start a new test plan for your project"
          href="/test-plans"
          icon={ClipboardList}
        />
        <QuickActionCard
          title="Run Tests"
          description="Execute test cases and track results"
          href="/executions"
          icon={PlayCircle}
        />
        <QuickActionCard
          title="View Reports"
          description="Analyze test coverage and trends"
          href="/reports/dashboard"
          icon={TrendingUp}
        />
      </div>
    </div>
  )
}

const colorMap = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-500/20" },
  green: { bg: "bg-green-500/10", text: "text-green-600", border: "border-green-500/20" },
  red: { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/20" },
}

function StatCard({
  title,
  value,
  isLoading,
  icon: Icon,
  description,
  href,
  color,
}: {
  title: string
  value?: number
  isLoading: boolean
  icon: React.ComponentType<{ className?: string }>
  description: string
  href: string
  color: keyof typeof colorMap
}) {
  const colors = colorMap[color]

  return (
    <Link href={href}>
      <div className={`rounded-lg border bg-card p-6 transition-all hover:shadow-md hover:border-primary/50 ${isLoading ? "opacity-50" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value?.toLocaleString() ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`rounded-full ${colors.bg} p-3`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function RecentExecutionsCard({
  executions,
  isLoading,
}: {
  executions: RecentExecution[]
  isLoading: boolean
}) {
  const statusColors = {
    passed: "bg-green-500/10 text-green-600 border-green-500/20",
    failed: "bg-red-500/10 text-red-600 border-red-500/20",
    pending: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    running: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  }

  const statusIcons = {
    passed: CheckCircle2,
    failed: XCircle,
    pending: Clock,
    running: Activity,
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Recent Executions</h2>
        <Link href="/executions" className="text-sm text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))
        ) : executions.length === 0 ? (
          <div className="text-center py-8">
            <PlayCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No recent executions</p>
          </div>
        ) : (
          executions.map((execution) => {
            const StatusIcon = statusIcons[execution.status]
            return (
              <div
                key={execution.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{execution.testPlan}</p>
                  <p className="text-xs text-muted-foreground">{execution.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  {execution.status !== "pending" && (
                    <span className="text-xs text-muted-foreground">
                      {execution.passed}/{execution.passed + execution.failed}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusColors[execution.status]}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {execution.status}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function ExecutionStatusCard({ isLoading }: { isLoading: boolean }) {
  const total = 156
  const passed = 142
  const failed = 8
  const pending = 6
  const passRate = Math.round((passed / total) * 100)

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">This Week&apos;s Status</h2>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : (
        <>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-primary">{passRate}%</div>
            <p className="text-sm text-muted-foreground">Pass Rate</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Passed</span>
                </div>
                <span className="font-medium">{passed}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(passed / total) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>Failed</span>
                </div>
                <span className="font-medium">{failed}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${(failed / total) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span>Pending</span>
                </div>
                <span className="font-medium">{pending}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-500 rounded-full transition-all"
                  style={{ width: `${(pending / total) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {failed > 0 && (
            <div className="mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-600">
                    {failed} test{failed > 1 ? "s" : ""} failed
                  </p>
                  <Link
                    href="/bugs"
                    className="text-xs text-red-600 hover:underline"
                  >
                    View and track bugs →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link href={href}>
      <div className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md hover:border-primary/50">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-muted p-3 group-hover:bg-primary/10 transition-colors">
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="font-medium group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  )
}
