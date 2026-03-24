"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import {
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react"

const weeklyData = [
  { day: "Mon", passed: 45, failed: 5, blocked: 2 },
  { day: "Tue", passed: 52, failed: 8, blocked: 1 },
  { day: "Wed", passed: 38, failed: 3, blocked: 4 },
  { day: "Thu", passed: 61, failed: 2, blocked: 0 },
  { day: "Fri", passed: 55, failed: 6, blocked: 3 },
  { day: "Sat", passed: 20, failed: 1, blocked: 0 },
  { day: "Sun", passed: 15, failed: 0, blocked: 0 },
]

const projectStats = [
  { name: "API Tests", passed: 156, failed: 12, total: 180, trend: 5.2 },
  { name: "UI Tests", passed: 89, failed: 8, total: 105, trend: -2.1 },
  { name: "Integration", passed: 45, failed: 3, total: 52, trend: 8.4 },
  { name: "E2E Tests", passed: 28, failed: 2, total: 35, trend: 0 },
]

export function ReportsDashboard() {
  const t = useTranslations("common")
  const [timeRange, setTimeRange] = useState("7d")

  const totalPassed = weeklyData.reduce((sum, d) => sum + d.passed, 0)
  const totalFailed = weeklyData.reduce((sum, d) => sum + d.failed, 0)
  const totalBlocked = weeklyData.reduce((sum, d) => sum + d.blocked, 0)
  const totalTests = totalPassed + totalFailed + totalBlocked
  const passRate = ((totalPassed / totalTests) * 100).toFixed(1)

  const maxValue = Math.max(...weeklyData.map((d) => d.passed + d.failed + d.blocked))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Test Activity</h2>
          <p className="text-sm text-muted-foreground">Last 7 days overview</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPassed}</p>
              <p className="text-sm text-muted-foreground">Passed</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalFailed}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalBlocked}</p>
              <p className="text-sm text-muted-foreground">Blocked</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{passRate}%</p>
              <p className="text-sm text-muted-foreground">Pass Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Weekly Trend</h3>
        </div>
        <div className="flex items-end gap-2 h-48">
          {weeklyData.map((day) => {
            const height = ((day.passed + day.failed + day.blocked) / maxValue) * 100
            return (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full flex flex-col-reverse rounded-t-md overflow-hidden"
                  style={{ height: `${height}%` }}
                >
                  {day.passed > 0 && (
                    <div
                      className="bg-green-500 flex-1"
                      style={{ height: `${(day.passed / (day.passed + day.failed + day.blocked)) * 100}%` }}
                    />
                  )}
                  {day.failed > 0 && (
                    <div
                      className="bg-red-500"
                      style={{ height: `${(day.failed / (day.passed + day.failed + day.blocked)) * 100}%` }}
                    />
                  )}
                  {day.blocked > 0 && (
                    <div
                      className="bg-yellow-500"
                      style={{ height: `${(day.blocked / (day.passed + day.failed + day.blocked)) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{day.day}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-sm text-muted-foreground">Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-sm text-muted-foreground">Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-sm text-muted-foreground">Blocked</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">By Project</h3>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {projectStats.map((project) => (
            <div key={project.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{project.name}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {project.passed}/{project.total}
                  </span>
                  {project.trend !== 0 && (
                    <span
                      className={
                        project.trend > 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {project.trend > 0 ? "+" : ""}
                      {project.trend}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${(project.passed / project.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
