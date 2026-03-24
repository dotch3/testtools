"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { api } from "@/lib/api"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export interface TestCaseRow {
  id: string
  title: string
  description?: string
  priority: {
    label: string
    color?: string
  }
  type: {
    label: string
  }
  _count?: {
    executions: number
  }
}

interface TestCaseListProps {
  suiteId: string
  cases: TestCaseRow[]
  isLoading: boolean
  onRefresh: () => void
  onSelect?: (testCase: TestCaseRow) => void
}

export function TestCaseList({
  suiteId,
  cases,
  isLoading,
  onRefresh,
  onSelect,
}: TestCaseListProps) {
  const t = useTranslations("common")

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("create")} Test Case
        </Button>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No test cases in this suite. Create your first test case.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Executions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((testCase) => (
                <TableRow
                  key={testCase.id}
                  className="cursor-pointer"
                  onClick={() => onSelect?.(testCase)}
                >
                  <TableCell className="font-medium">{testCase.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: testCase.priority.color,
                        color: testCase.priority.color,
                      }}
                    >
                      {testCase.priority.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{testCase.type.label}</TableCell>
                  <TableCell className="text-center">
                    {testCase._count?.executions ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
