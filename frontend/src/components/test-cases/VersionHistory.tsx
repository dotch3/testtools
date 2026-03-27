"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { History, RotateCcw, Eye, Loader2 } from "lucide-react"

interface Version {
  id: string
  testCaseId: string
  version: number
  title: string
  description: string | null
  preconditions: string | null
  steps: Array<{ order: number; action: string; expectedResult: string }> | null
  priorityId: string
  typeId: string
  automationScriptRef: string | null
  createdById: string
  createdAt: string
}

interface TestCaseVersionHistoryProps {
  suiteId: string
  caseId: string
  currentVersion: number
  trigger?: React.ReactNode
}

function VersionPreviewDialog({ version, trigger }: { version: Version; trigger: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version {version.version}</DialogTitle>
          <DialogDescription>
            Created on {formatDate(version.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h3 className="font-medium mb-1">Title</h3>
            <p className="text-sm text-muted-foreground">{version.title}</p>
          </div>

          {version.description && (
            <div>
              <h3 className="font-medium mb-1">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{version.description}</p>
            </div>
          )}

          {version.preconditions && (
            <div>
              <h3 className="font-medium mb-1">Preconditions</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{version.preconditions}</p>
            </div>
          )}

          {version.steps && version.steps.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Steps</h3>
              <div className="space-y-2">
                {version.steps.map((step, index) => (
                  <div key={index} className="flex gap-3 p-2 rounded-md bg-muted/50 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {step.order || index + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground text-xs">Action:</span>
                        <p>{step.action}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Expected:</span>
                        <p>{step.expectedResult}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TestCaseVersionHistory({
  suiteId,
  caseId,
  currentVersion,
  trigger,
}: TestCaseVersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadVersions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<Version[]>(`/suites/${suiteId}/cases/${caseId}/versions`)
      setVersions(data)
    } catch (err) {
      console.error("Failed to load versions:", err)
      setError(err instanceof Error ? err.message : "Failed to load versions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadVersions()
    }
  }, [isOpen, suiteId, caseId])

  const handleRestore = async (version: Version) => {
    if (!confirm(`Restore test case to version ${version.version}? This will create a new version with the content from v${version.version}.`)) {
      return
    }

    setIsRestoring(version.version)
    try {
      await api.post(`/suites/${suiteId}/cases/${caseId}/versions/${version.version}/restore`)
      setIsOpen(false)
      window.location.reload()
    } catch (err) {
      console.error("Failed to restore version:", err)
      alert(err instanceof Error ? err.message : "Failed to restore version")
    } finally {
      setIsRestoring(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <History className="mr-2 h-4 w-4" />
      Versions ({versions.length || currentVersion - 1})
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View and restore previous versions of this test case. Current version is {currentVersion}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={loadVersions} className="mt-2">
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : versions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No versions yet</h3>
                <p className="text-sm text-muted-foreground">
                  Version history will be created when you edit this test case.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Version</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead className="w-[150px]">Created</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versions.map((version) => (
                        <TableRow key={version.id}>
                          <TableCell>
                            <Badge variant="outline">
                              v{version.version}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[300px] truncate" title={version.title}>
                              {version.title}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(version.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <VersionPreviewDialog
                                version={version}
                                trigger={
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleRestore(version)}
                                disabled={isRestoring === version.version || version.version === currentVersion}
                                title={version.version === currentVersion ? "Current version" : "Restore this version"}
                              >
                                {isRestoring === version.version ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {versions.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 px-1">
                  {versions.length} version{versions.length !== 1 ? "s" : ""} available. 
                  Restoring a version creates a new version with the restored content.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
