"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import type { Bug, BugStats, CreateBugInput, UpdateBugInput } from "@/types/bug"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Bug as BugIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const priorityColors: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
}

interface BugTableProps {
  projectId: string
  executionId?: string
  onRefresh?: () => void
  onCreateBug?: (bug: Bug) => void
}

export function BugTable({ projectId, executionId, onRefresh, onCreateBug }: BugTableProps) {
  const t = useTranslations("common")
  const [bugs, setBugs] = useState<Bug[]>([])
  const [stats, setStats] = useState<BugStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<UpdateBugInput>({})
  const [createForm, setCreateForm] = useState<CreateBugInput>({
    title: "",
    description: "",
    statusId: "",
    priorityId: "",
    severityId: "",
    sourceId: "",
  })

  const loadBugs = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.get<Bug[]>(`/projects/${projectId}/bugs`)
      setBugs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bugs")
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get<BugStats>(`/projects/${projectId}/bugs/stats`)
      setStats(data)
    } catch (err) {
      console.error("Failed to load bug stats:", err)
    }
  }, [projectId])

  useEffect(() => {
    loadBugs()
    loadStats()
  }, [loadBugs, loadStats])

  const handleCreateBug = async () => {
    try {
      const bug = await api.post<Bug>(`/projects/${projectId}/bugs`, createForm)
      if (executionId) {
        await api.post(`/bugs/${bug.id}/executions/${executionId}`)
      }
      setBugs([bug, ...bugs])
      setIsCreateDialogOpen(false)
      setCreateForm({
        title: "",
        description: "",
        statusId: "",
        priorityId: "",
        severityId: "",
        sourceId: "",
      })
      onCreateBug?.(bug)
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bug")
    }
  }

  const handleUpdateBug = async () => {
    if (!selectedBug) return
    try {
      const updated = await api.patch<Bug>(`/bugs/${selectedBug.id}`, editForm)
      setBugs(bugs.map((b) => (b.id === updated.id ? updated : b)))
      setSelectedBug(updated)
      setIsEditDialogOpen(false)
      setEditForm({})
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bug")
    }
  }

  const handleDeleteBug = async (bug: Bug) => {
    if (!confirm("Are you sure you want to delete this bug?")) return
    try {
      await api.delete(`/bugs/${bug.id}`)
      setBugs(bugs.filter((b) => b.id !== bug.id))
      if (selectedBug?.id === bug.id) {
        setSelectedBug(null)
      }
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bug")
    }
  }

  const filteredBugs = bugs.filter(
    (bug) =>
      bug.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.externalId?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return <div className="text-center py-8">{t("loading")}</div>
  }

  if (error) {
    return <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("create")} Bug
        </Button>
      </div>

      {stats && stats.byStatus && (
        <div className="flex gap-4 text-sm">
          <div className="px-3 py-1.5 rounded-md bg-muted">
            Total: <strong>{stats.total}</strong>
          </div>
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="px-3 py-1.5 rounded-md bg-muted">
              {status}: <strong>{count}</strong>
            </div>
          ))}
        </div>
      )}

      {filteredBugs.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <BugIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No bugs found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first bug to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Priority</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Severity</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Executions</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Reported By</th>
                <th className="px-4 py-3 text-right text-sm font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBugs.map((bug) => (
                <tr key={bug.id} className="border-b">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedBug(bug)}
                      className="text-left hover:underline"
                    >
                      <div className="font-medium">{bug.title}</div>
                      {bug.externalId && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{bug.externalId}</span>
                          {bug.externalUrl && (
                            <a
                              href={bug.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      style={{
                        backgroundColor: `${bug.status.color}20`,
                        color: bug.status.color,
                        borderColor: `${bug.status.color}40`,
                      }}
                      variant="outline"
                    >
                      {bug.status.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={priorityColors[bug.priority.value] || ""}
                      variant="outline"
                    >
                      {bug.priority.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{bug.severity.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {bug._count?.executions ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {bug.reportedBy.name || bug.reportedBy.email}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBug(bug)
                          setEditForm({})
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBug(bug)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selectedBug} onOpenChange={() => setSelectedBug(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bug Details</DialogTitle>
            <DialogDescription>{selectedBug?.title}</DialogDescription>
          </DialogHeader>
          {selectedBug && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    style={{
                      backgroundColor: `${selectedBug.status.color}20`,
                      color: selectedBug.status.color,
                      borderColor: `${selectedBug.status.color}40`,
                    }}
                    variant="outline"
                  >
                    {selectedBug.status.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <Badge
                    className={
                      priorityColors[selectedBug.priority.value] || ""
                    }
                    variant="outline"
                  >
                    {selectedBug.priority.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Severity</p>
                  <p>{selectedBug.severity.label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p>{selectedBug.source.label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reported By</p>
                  <p>{selectedBug.reportedBy.name || selectedBug.reportedBy.email}</p>
                </div>
                {selectedBug.assignedTo && (
                  <div>
                    <p className="text-muted-foreground">Assigned To</p>
                    <p>{selectedBug.assignedTo.name || selectedBug.assignedTo.email}</p>
                  </div>
                )}
              </div>
              {selectedBug.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm mt-1">{selectedBug.description}</p>
                </div>
              )}
              {selectedBug.externalUrl && (
                <div>
                  <a
                    href={selectedBug.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-500 hover:underline"
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View in {selectedBug.source.label}
                  </a>
                </div>
              )}
              {selectedBug.executions && selectedBug.executions.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Linked Executions</p>
                  <div className="space-y-1">
                    {selectedBug.executions.map((exec) => (
                      <div
                        key={exec.id}
                        className="flex items-center justify-between p-2 rounded-md border text-sm"
                      >
                        <span>{exec.testCase.title}</span>
                        <Badge
                          style={{
                            backgroundColor: `${exec.status.color}20`,
                            color: exec.status.color,
                          }}
                          variant="outline"
                        >
                          {exec.status.label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bug</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title ?? selectedBug?.title ?? ""}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description ?? selectedBug?.description ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBug}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Bug</DialogTitle>
            <DialogDescription>Report a new bug from this execution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-title">Title *</Label>
              <Input
                id="create-title"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Brief description of the bug"
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Input
                id="create-description"
                value={createForm.description ?? ""}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                placeholder="Detailed steps to reproduce..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBug} disabled={!createForm.title}>
              Create Bug
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
