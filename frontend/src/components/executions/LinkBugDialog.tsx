"use client"

import { useState, useEffect } from "react"
import { Search, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Bug {
  id: string
  title: string
  status: { value: string; label: string; color: string }
  priority: { label: string; color: string }
}

interface Execution {
  id: string
  testCase: { id: string; title: string }
}

interface LinkBugDialogProps {
  isOpen: boolean
  execution: Execution | null
  projectId: string
  onClose: () => void
  onComplete: () => void
}

export function LinkBugDialog({
  isOpen,
  execution,
  projectId,
  onClose,
  onComplete,
}: LinkBugDialogProps) {
  const [mode, setMode] = useState<"link" | "create">("link")
  const [bugs, setBugs] = useState<Bug[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBugId, setSelectedBugId] = useState<string>("")
  const [linkedBugIds, setLinkedBugIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newBugTitle, setNewBugTitle] = useState("")
  const [newBugDescription, setNewBugDescription] = useState("")
  const [newBugPriority, setNewBugPriority] = useState("seed-bug_priority-high")

  useEffect(() => {
    if (isOpen && projectId) {
      loadBugs()
    }
  }, [isOpen, projectId])

  useEffect(() => {
    if (!isOpen) {
      setMode("link")
      setSearchQuery("")
      setSelectedBugId("")
      setLinkedBugIds([])
      setNewBugTitle("")
      setNewBugDescription("")
      setNewBugPriority("seed-bug_priority-high")
    }
  }, [isOpen])

  const loadBugs = async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/projects/${projectId}/bugs`)
      const mappedBugs: Bug[] = data.map((b: any) => ({
        id: b.id,
        title: b.title,
        status: b.status
          ? { value: b.status.value, label: b.status.label, color: b.status.color }
          : { value: "open", label: "Open", color: "#ef4444" },
        priority: b.priority
          ? { label: b.priority.label, color: b.priority.color }
          : { label: "Medium", color: "#f59e0b" },
      }))
      setBugs(mappedBugs)
    } catch (err) {
      console.error("Failed to load bugs:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBugs = bugs.filter((bug) =>
    bug.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleBug = (bugId: string) => {
    setLinkedBugIds((prev) =>
      prev.includes(bugId)
        ? prev.filter((id) => id !== bugId)
        : [...prev, bugId]
    )
  }

  const handleSubmit = async () => {
    if (mode === "link" && linkedBugIds.length === 0) return
    if (mode === "create" && !newBugTitle.trim()) return

    setIsSubmitting(true)
    try {
      if (mode === "create") {
        const newBug = await api.post<any>(`/projects/${projectId}/bugs`, {
          title: newBugTitle,
          description: newBugDescription,
          priorityId: newBugPriority,
          statusId: "seed-bug_status-open",
          severityId: "seed-bug_severity-major",
          sourceId: "seed-bug_source-internal",
        })
        linkedBugIds.push(newBug.id)
      }

      for (const bugId of linkedBugIds) {
        await api.post(`/bugs/${bugId}/executions/${execution!.id}`)
      }
      onComplete()
    } catch (err) {
      console.error("Failed to link bug:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!execution) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Bug to Execution</DialogTitle>
          <DialogDescription>
            {execution.testCase.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "link" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("link")}
          >
            Link Existing Bug
          </Button>
          <Button
            variant={mode === "create" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("create")}
          >
            Create New Bug
          </Button>
        </div>

        {mode === "link" ? (
          <div className="grid gap-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search bugs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-[250px] overflow-y-auto rounded-md border">
                  {filteredBugs.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No bugs found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredBugs.map((bug) => (
                        <button
                          key={bug.id}
                          onClick={() => handleToggleBug(bug.id)}
                          className={`w-full p-3 text-left hover:bg-muted/50 ${
                            linkedBugIds.includes(bug.id) ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{bug.title}</div>
                              <div className="flex gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    backgroundColor: `${bug.status.color}20`,
                                    color: bug.status.color,
                                    borderColor: `${bug.status.color}40`,
                                  }}
                                >
                                  {bug.status.label}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    backgroundColor: `${bug.priority.color}20`,
                                    color: bug.priority.color,
                                    borderColor: `${bug.priority.color}40`,
                                  }}
                                >
                                  {bug.priority.label}
                                </Badge>
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                linkedBugIds.includes(bug.id)
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {linkedBugIds.includes(bug.id) && (
                                <svg
                                  className="w-3 h-3 text-primary-foreground"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {linkedBugIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {linkedBugIds.length} bug(s) will be linked
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bug-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bug-title"
                value={newBugTitle}
                onChange={(e) => setNewBugTitle(e.target.value)}
                placeholder="Brief description of the bug"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bug-description">Description</Label>
              <textarea
                id="bug-description"
                value={newBugDescription}
                onChange={(e) => setNewBugDescription(e.target.value)}
                placeholder="Steps to reproduce, expected behavior, actual behavior..."
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bug-priority">Priority</Label>
              <select
                id="bug-priority"
                value={newBugPriority}
                onChange={(e) => setNewBugPriority(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="seed-bug_priority-critical">Critical</option>
                <option value="seed-bug_priority-high">High</option>
                <option value="seed-bug_priority-medium">Medium</option>
                <option value="seed-bug_priority-low">Low</option>
              </select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (mode === "link" && linkedBugIds.length === 0) ||
              (mode === "create" && !newBugTitle.trim())
            }
          >
            {isSubmitting
              ? "Saving..."
              : mode === "link"
              ? `Link ${linkedBugIds.length} Bug(s)`
              : "Create & Link Bug"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
