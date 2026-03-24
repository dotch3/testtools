"use client"

import {
  ClipboardList,
  TestTubes,
  PlayCircle,
  Bug,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"

export default function DashboardPage() {
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
          value="0"
          icon={ClipboardList}
          description="Active plans"
        />
        <StatCard
          title="Test Cases"
          value="0"
          icon={TestTubes}
          description="Total cases"
        />
        <StatCard
          title="Executions"
          value="0"
          icon={PlayCircle}
          description="This week"
        />
        <StatCard
          title="Bugs"
          value="0"
          icon={Bug}
          description="Open bugs"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RecentExecutionsCard />
        <ExecutionStatusCard />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  )
}

function RecentExecutionsCard() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Recent Executions</h2>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center py-8">
          No recent executions
        </p>
      </div>
    </div>
  )
}

function ExecutionStatusCard() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="font-semibold mb-4">Execution Status</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm">Passed</span>
          </div>
          <span className="font-medium">0%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm">Failed</span>
          </div>
          <span className="font-medium">0%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Pending</span>
          </div>
          <span className="font-medium">0%</span>
        </div>
      </div>
    </div>
  )
}
