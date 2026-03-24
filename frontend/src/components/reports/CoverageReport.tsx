"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import {
  PieChart,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  FileText,
} from "lucide-react"

const coverageData = {
  overall: {
    requirements: 45,
    covered: 38,
    partiallyCovered: 5,
    uncovered: 2,
    percentage: 84,
  },
  byModule: [
    {
      name: "Authentication",
      requirements: 12,
      covered: 11,
      partiallyCovered: 1,
      uncovered: 0,
    },
    {
      name: "User Management",
      requirements: 8,
      covered: 8,
      partiallyCovered: 0,
      uncovered: 0,
    },
    {
      name: "Test Plans",
      requirements: 15,
      covered: 12,
      partiallyCovered: 2,
      uncovered: 1,
    },
    {
      name: "Executions",
      requirements: 10,
      covered: 7,
      partiallyCovered: 2,
      uncovered: 1,
    },
  ],
  criticalPath: [
    { id: 1, name: "User Login", status: "covered", priority: "critical" },
    { id: 2, name: "Create Test Plan", status: "covered", priority: "critical" },
    { id: 3, name: "Add Test Cases", status: "covered", priority: "high" },
    { id: 4, name: "Run Execution", status: "partially", priority: "critical" },
    { id: 5, name: "Generate Report", status: "uncovered", priority: "medium" },
    { id: 6, name: "Export Data", status: "covered", priority: "low" },
  ],
}

export function CoverageReport() {
  const t = useTranslations("common")
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  const totalRequirements =
    coverageData.overall.covered +
    coverageData.overall.partiallyCovered +
    coverageData.overall.uncovered
  const fullyCovered = (coverageData.overall.covered / totalRequirements) * 100
  const partiallyCovered =
    (coverageData.overall.partiallyCovered / totalRequirements) * 100
  const uncovered = (coverageData.overall.uncovered / totalRequirements) * 100

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Requirements Coverage</h2>
        <p className="text-sm text-muted-foreground">
          Track which requirements have test case coverage
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Overall Coverage</h3>
            <span className="ml-auto text-2xl font-bold text-primary">
              {coverageData.overall.percentage}%
            </span>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  className="text-muted"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  className="text-green-500"
                  strokeWidth="12"
                  strokeDasharray={`${fullyCovered * 2.51} 251`}
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  className="text-yellow-500"
                  strokeWidth="12"
                  strokeDasharray={`${partiallyCovered * 2.51} 251`}
                  strokeDashoffset={`-${fullyCovered * 2.51}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {coverageData.overall.covered + coverageData.overall.partiallyCovered}
                  </p>
                  <p className="text-sm text-muted-foreground">/ {totalRequirements}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-sm text-muted-foreground">Covered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-sm text-muted-foreground">Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-sm text-muted-foreground">Missing</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">By Module</h3>
          </div>

          <div className="space-y-3">
            {coverageData.byModule.map((module) => (
              <div
                key={module.name}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedModule === module.name
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() =>
                  setSelectedModule(selectedModule === module.name ? null : module.name)
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{module.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {module.covered}/{module.requirements}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500"
                    style={{ width: `${(module.covered / module.requirements) * 100}%` }}
                  />
                  <div
                    className="bg-yellow-500"
                    style={{
                      width: `${(module.partiallyCovered / module.requirements) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${(module.uncovered / module.requirements) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Critical Path Coverage</h3>
          </div>
        </div>
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground border-b">
                <th className="pb-2 font-medium">Requirement</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {coverageData.criticalPath.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{item.name}</td>
                  <td className="py-3">
                    {item.status === "covered" && (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Covered
                      </span>
                    )}
                    {item.status === "partially" && (
                      <span className="inline-flex items-center gap-1 text-yellow-600">
                        <Clock className="h-4 w-4" />
                        Partial
                      </span>
                    )}
                    {item.status === "uncovered" && (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.priority === "critical"
                          ? "bg-red-100 text-red-700"
                          : item.priority === "high"
                            ? "bg-orange-100 text-orange-700"
                            : item.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
