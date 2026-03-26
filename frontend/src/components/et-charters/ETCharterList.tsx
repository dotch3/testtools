"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Compass,
  AlertCircle,
  Loader2,
  Copy,
  Move,
  User,
  Calendar,
  Clock,
  Bug,
  FileText,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HeuristicPicker } from "@/components/heuristics/HeuristicList"
import { useProject } from "@/contexts/ProjectContext"

interface TestCase {
  id: string
  title: string
  description?: string
  priority: { value: string; label: string; color: string }
  type: { value: string; label: string }
  suite: { id: string; name: string }
  status: string
  tags: Array<{ id: string; name: string; color: string }>
  assignees: Array<{ id: string; name?: string; email: string }>
  lastExecution?: { status: { value: string; label: string; color: string }; executedAt: string }
  _count: { executions: number }
}

interface User {
  id: string
  name?: string
  email: string
}

interface Heuristic {
  id: string
  name: string
  template: string
  personas: Array<{ id: string; name: string; description?: string }>
}

interface ETCharter {
  id: string
  charter: string
  areas: string[]
  startDate?: string
  testerId?: string
  tester?: { id: string; name?: string; email: string }
  duration?: string
  testDesignPercentage?: number
  bugInvestigationPercentage?: number
  sessionSetupPercentage?: number
  charterVsOpportunity?: number
  dataFiles: string[]
  testNotes: Array<{ action: string; bullets: string[] }>
  opportunities: Array<{ action: string; bullets: string[] }>
  bugs: Array<{ name: string; steps: string[]; expected: string; actual: string }>
  issues: Array<{ description: string }>
  createdAt: string
  updatedAt: string
  linkedHeuristics: Array<{ heuristic: Heuristic }>
  _count: { bugs: number; testCases: number }
}

interface ETCharterListProps {
  suiteId: string
  suiteName: string
  cases: TestCase[]
  onRefresh: () => void
}

const priorityColors: Record<string, string> = {
  critical: "border-red-500 text-red-500",
  high: "border-orange-500 text-orange-500",
  medium: "border-yellow-500 text-yellow-500",
  low: "border-blue-500 text-blue-500",
}

const statusColors: Record<string, string> = {
  pass: "bg-green-500/10 text-green-600 border-green-500/20",
  fail: "bg-red-500/10 text-red-600 border-red-500/20",
  blocked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  not_run: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  skipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
}

const durationOptions = [
  { value: "short", label: "Short (30-60 mins)" },
  { value: "normal", label: "Normal (60-90 mins)" },
  { value: "long", label: "Long (90-120 mins)" },
]

export function ETCharterList({ suiteId, suiteName, cases, onRefresh }: ETCharterListProps) {
  const [charters, setCharters] = useState<ETCharter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingCharter, setEditingCharter] = useState<ETCharter | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copyMoveCharter, setCopyMoveCharter] = useState<{ charter: ETCharter; mode: "copy" | "move" } | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [expandedCharter, setExpandedCharter] = useState<string | null>(null)

  const loadCharters = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/suites/${suiteId}/et-charters`)
      const mappedCharters: ETCharter[] = data.map((c: any) => ({
        id: c.id,
        charter: c.charter,
        areas: c.areas || [],
        startDate: c.startDate,
        testerId: c.testerId,
        tester: c.tester,
        duration: c.duration,
        testDesignPercentage: c.testDesignPercentage,
        bugInvestigationPercentage: c.bugInvestigationPercentage,
        sessionSetupPercentage: c.sessionSetupPercentage,
        charterVsOpportunity: c.charterVsOpportunity,
        dataFiles: c.dataFiles || [],
        testNotes: c.testNotes || [],
        opportunities: c.opportunities || [],
        bugs: c.bugs || [],
        linkedHeuristics: c.linkedHeuristics || [],
        issues: c.issues || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        _count: { bugs: c._count?.bugs || 0, testCases: c._count?.testCases || 0 },
      }))
      setCharters(mappedCharters)
    } catch (err) {
      console.error("Failed to load ET Charters:", err)
    } finally {
      setIsLoading(false)
    }
  }, [suiteId])

  const loadUsers = useCallback(async () => {
    const { selectedProject } = useProject()
    try {
      let data
      if (selectedProject) {
        data = await api.get<User[]>(`/projects/${selectedProject.id}/members`)
        data = data.map((m: any) => ({ id: m.user.id, name: m.user.name, email: m.user.email }))
      } else {
        data = await api.get<User[]>("/users")
      }
      setUsers(data)
    } catch (err) {
      console.error("Failed to load users:", err)
    }
  }, [])

  useEffect(() => {
    loadCharters()
    loadUsers()
  }, [loadCharters, loadUsers])

  const handleCreateCharter = async (data: {
    charter: string
    areas?: string[]
    startDate?: string
    testerId?: string
    duration?: string
    testDesignPercentage?: number
    bugInvestigationPercentage?: number
    sessionSetupPercentage?: number
    charterVsOpportunity?: number
    dataFiles?: string[]
    testNotes?: Array<{ action: string; bullets: string[] }>
    opportunities?: Array<{ action: string; bullets: string[] }>
    bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
    issues?: Array<{ description: string }>
  }) => {
    setIsCreating(true)
    try {
      await api.post(`/suites/${suiteId}/et-charters`, {
        charter: data.charter,
        areas: data.areas,
        startDate: data.startDate,
        testerId: data.testerId,
        duration: data.duration,
        testDesignPercentage: data.testDesignPercentage,
        bugInvestigationPercentage: data.bugInvestigationPercentage,
        sessionSetupPercentage: data.sessionSetupPercentage,
        charterVsOpportunity: data.charterVsOpportunity,
        dataFiles: data.dataFiles,
        testNotes: data.testNotes,
        opportunities: data.opportunities,
        bugs: data.bugs,
        issues: data.issues,
      })
      setIsCreateOpen(false)
      loadCharters()
      onRefresh()
    } catch (err) {
      console.error("Failed to create charter:", err)
      alert(err instanceof Error ? err.message : "Failed to create ET Charter")
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateCharter = async (data: {
    charter: string
    areas?: string[]
    startDate?: string
    testerId?: string
    duration?: string
    testDesignPercentage?: number
    bugInvestigationPercentage?: number
    sessionSetupPercentage?: number
    charterVsOpportunity?: number
    dataFiles?: string[]
    testNotes?: Array<{ action: string; bullets: string[] }>
    opportunities?: Array<{ action: string; bullets: string[] }>
    bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
    issues?: Array<{ description: string }>
  }) => {
    if (!editingCharter) return
    try {
      await api.patch(`/et-charters/${editingCharter.id}`, {
        charter: data.charter,
        areas: data.areas,
        startDate: data.startDate,
        testerId: data.testerId,
        duration: data.duration,
        testDesignPercentage: data.testDesignPercentage,
        bugInvestigationPercentage: data.bugInvestigationPercentage,
        sessionSetupPercentage: data.sessionSetupPercentage,
        charterVsOpportunity: data.charterVsOpportunity,
        dataFiles: data.dataFiles,
        testNotes: data.testNotes,
        opportunities: data.opportunities,
        bugs: data.bugs,
        issues: data.issues,
      })
      setEditingCharter(null)
      loadCharters()
      onRefresh()
    } catch (err) {
      console.error("Failed to update charter:", err)
      alert(err instanceof Error ? err.message : "Failed to update ET Charter")
    }
  }

  const handleDeleteCharter = async (charter: ETCharter) => {
    if (!confirm(`Delete ET Charter "${charter.charter}"? This cannot be undone.`)) return
    setDeletingId(charter.id)
    try {
      await api.delete(`/et-charters/${charter.id}`)
      setCharters(charters.filter((c) => c.id !== charter.id))
      onRefresh()
    } catch (err) {
      console.error("Failed to delete charter:", err)
      alert(err instanceof Error ? err.message : "Failed to delete ET Charter")
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopyMove = async (targetSuiteId: string) => {
    if (!copyMoveCharter) return
    try {
      if (copyMoveCharter.mode === "copy") {
        await api.post(`/et-charters/${copyMoveCharter.charter.id}/copy`, {
          targetSuiteId,
        })
      } else {
        await api.patch(`/et-charters/${copyMoveCharter.charter.id}/move`, {
          targetSuiteId,
        })
      }
      setCopyMoveCharter(null)
      loadCharters()
      onRefresh()
    } catch (err) {
      console.error(`Failed to ${copyMoveCharter.mode} charter:`, err)
      alert(`Failed to ${copyMoveCharter.mode} charter. Please try again.`)
    }
  }

  const filteredCharters = charters.filter((c) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      c.charter.toLowerCase().includes(query) ||
      c.areas.some((a) => a.toLowerCase().includes(query)) ||
      c.tester?.name?.toLowerCase().includes(query) ||
      c.tester?.email.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search charters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <CharterDialog
          users={users}
          onSubmit={handleCreateCharter}
          isSubmitting={isCreating}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create ET Charter
            </Button>
          }
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (open) loadUsers()
          }}
          open={isCreateOpen}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredCharters.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No ET Charters</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery ? "No charters match your search" : "Create your first ET Charter for this suite"}
            </p>
            {!searchQuery && (
              <CharterDialog
                users={users}
                onSubmit={handleCreateCharter}
                isSubmitting={isCreating}
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create ET Charter
                  </Button>
                }
                onOpenChange={(open) => {
                  setIsCreateOpen(open)
                  if (open) loadUsers()
                }}
                open={isCreateOpen}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCharters.map((charter) => (
            <CharterCard
              key={charter.id}
              charter={charter}
              users={users}
              isExpanded={expandedCharter === charter.id}
              onToggle={() => setExpandedCharter(expandedCharter === charter.id ? null : charter.id)}
              onEdit={() => setEditingCharter(charter)}
              onDelete={() => handleDeleteCharter(charter)}
              onCopy={() => setCopyMoveCharter({ charter, mode: "copy" })}
              onMove={() => setCopyMoveCharter({ charter, mode: "move" })}
              isDeleting={deletingId === charter.id}
            />
          ))}
        </div>
      )}

      {editingCharter && (
        <CharterDialog
          users={users}
          onSubmit={handleUpdateCharter}
          isSubmitting={false}
          trigger={<span />}
          onOpenChange={(open) => !open && setEditingCharter(null)}
          open={true}
          charter={editingCharter}
        />
      )}

      {copyMoveCharter && (
        <CopyMoveCharterDialog
          mode={copyMoveCharter.mode}
          charter={copyMoveCharter.charter}
          onClose={() => setCopyMoveCharter(null)}
          onSelect={handleCopyMove}
        />
      )}
    </div>
  )
}

interface CharterCardProps {
  charter: ETCharter
  users: User[]
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
  onMove: () => void
  isDeleting: boolean
}

function CharterCard({
  charter,
  users,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onCopy,
  onMove,
  isDeleting,
}: CharterCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
              <Compass className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium leading-tight">{charter.charter}</h3>
              {charter.areas.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {charter.areas.slice(0, 3).map((area, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                  {charter.areas.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{charter.areas.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {charter.tester && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {charter.tester.name || charter.tester.email}
                  </span>
                )}
                {charter.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(charter.startDate).toLocaleDateString()}
                  </span>
                )}
                {charter.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {durationOptions.find((d) => d.value === charter.duration)?.label.split(" ")[0] || charter.duration}
                  </span>
                )}
                {charter.bugs.length > 0 && (
                  <span className="flex items-center gap-1 text-orange-600">
                    <Bug className="h-3 w-3" />
                    {charter.bugs.length} bugs
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopy() }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Suite
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove() }}>
                  <Move className="mr-2 h-4 w-4" />
                  Move to Suite
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t p-4 bg-muted/30">
          <div className="grid gap-4">
            {charter.testNotes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Test Notes
                </h4>
                <div className="space-y-2 pl-6">
                  {charter.testNotes.map((note, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium">{i + 1}. {note.action}</p>
                      {note.bullets.length > 0 && (
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                          {note.bullets.map((bullet, j) => (
                            <li key={j}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {charter.opportunities.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Opportunities
                </h4>
                <div className="space-y-2 pl-6">
                  {charter.opportunities.map((opp, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium">{i + 1}. {opp.action}</p>
                      {opp.bullets.length > 0 && (
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                          {opp.bullets.map((bullet, j) => (
                            <li key={j}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {charter.bugs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-orange-600">
                  <Bug className="h-4 w-4" />
                  Bugs Found
                </h4>
                <div className="space-y-3 pl-6">
                  {charter.bugs.map((bug, i) => (
                    <Card key={i} className="p-3">
                      <p className="text-sm font-medium">{i + 1}. {bug.name}</p>
                      {bug.steps.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground">Steps to Reproduce:</p>
                          <ol className="list-decimal list-inside text-sm text-muted-foreground mt-1">
                            {bug.steps.map((step, j) => (
                              <li key={j}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {bug.expected && (
                        <p className="text-xs mt-2">
                          <span className="font-medium text-muted-foreground">Expected: </span>
                          <span className="text-muted-foreground">{bug.expected}</span>
                        </p>
                      )}
                      {bug.actual && (
                        <p className="text-xs mt-1">
                          <span className="font-medium text-destructive">Actual: </span>
                          <span className="text-muted-foreground">{bug.actual}</span>
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {charter.issues.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Issues
                </h4>
                <div className="space-y-1 pl-6">
                  {charter.issues.map((issue, i) => (
                    <p key={i} className="text-sm">
                      {i + 1}. {issue.description}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {charter.testDesignPercentage !== undefined && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Test Design</p>
                  <p className="text-sm font-medium">{charter.testDesignPercentage}%</p>
                </div>
                {charter.bugInvestigationPercentage !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Bug Investigation</p>
                    <p className="text-sm font-medium">{charter.bugInvestigationPercentage}%</p>
                  </div>
                )}
                {charter.sessionSetupPercentage !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Session Setup</p>
                    <p className="text-sm font-medium">{charter.sessionSetupPercentage}%</p>
                  </div>
                )}
                {charter.charterVsOpportunity !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Charter vs Opportunity</p>
                    <p className="text-sm font-medium">{charter.charterVsOpportunity}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

interface CharterDialogProps {
  users: User[]
  onSubmit: (data: {
    charter: string
    areas?: string[]
    startDate?: string
    testerId?: string
    duration?: string
    testDesignPercentage?: number
    bugInvestigationPercentage?: number
    sessionSetupPercentage?: number
    charterVsOpportunity?: number
    dataFiles?: string[]
    testNotes?: Array<{ action: string; bullets: string[] }>
    opportunities?: Array<{ action: string; bullets: string[] }>
    bugs?: Array<{ name: string; steps: string[]; expected: string; actual: string }>
    issues?: Array<{ description: string }>
    heuristicIds?: string[]
  }) => Promise<void>
  isSubmitting: boolean
  trigger: React.ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  charter?: ETCharter
}

function CharterDialog({ users, onSubmit, isSubmitting, trigger, onOpenChange, open, charter }: CharterDialogProps) {
  const [charterText, setCharterText] = useState(charter?.charter || "")
  const [areas, setAreas] = useState<string[]>(charter?.areas || [""])
  const [startDate, setStartDate] = useState(charter?.startDate?.split("T")[0] || "")
  const [selectedHeuristicIds, setSelectedHeuristicIds] = useState<string[]>(
    charter?.linkedHeuristics?.map((lh) => lh.heuristic.id) || []
  )
  const [testerId, setTesterId] = useState(charter?.testerId || "")
  const [duration, setDuration] = useState(charter?.duration || "normal")
  const [testDesignPercentage, setTestDesignPercentage] = useState(charter?.testDesignPercentage?.toString() || "40")
  const [bugInvestigationPercentage, setBugInvestigationPercentage] = useState(charter?.bugInvestigationPercentage?.toString() || "30")
  const [sessionSetupPercentage, setSessionSetupPercentage] = useState(charter?.sessionSetupPercentage?.toString() || "10")
  const [charterVsOpportunity, setCharterVsOpportunity] = useState(charter?.charterVsOpportunity?.toString() || "80")
  const [dataFiles, setDataFiles] = useState<string[]>(charter?.dataFiles || [""])
  const [testNotes, setTestNotes] = useState<Array<{ action: string; bullets: string[] }>>(
    charter?.testNotes || [{ action: "", bullets: [""] }]
  )
  const [opportunities, setOpportunities] = useState<Array<{ action: string; bullets: string[] }>>(
    charter?.opportunities || [{ action: "", bullets: [""] }]
  )
  const [bugs, setBugs] = useState<Array<{ name: string; steps: string[]; expected: string; actual: string }>>(
    charter?.bugs || [{ name: "", steps: [""], expected: "", actual: "" }]
  )
  const [issues, setIssues] = useState<Array<{ description: string }>>(
    charter?.issues || [{ description: "" }]
  )
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("basic")

  const isEditing = !!charter

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!charterText.trim()) {
      setError("Charter is required")
      return
    }

    try {
      await onSubmit({
        charter: charterText.trim(),
        areas: areas.filter((a) => a.trim()),
        startDate: startDate || undefined,
        testerId: testerId || undefined,
        duration: duration || undefined,
        testDesignPercentage: testDesignPercentage ? parseInt(testDesignPercentage) : undefined,
        bugInvestigationPercentage: bugInvestigationPercentage ? parseInt(bugInvestigationPercentage) : undefined,
        sessionSetupPercentage: sessionSetupPercentage ? parseInt(sessionSetupPercentage) : undefined,
        charterVsOpportunity: charterVsOpportunity ? parseInt(charterVsOpportunity) : undefined,
        dataFiles: dataFiles.filter((f) => f.trim()),
        testNotes: testNotes.filter((n) => n.action.trim()).map((n) => ({
          action: n.action,
          bullets: n.bullets.filter((b) => b.trim()),
        })),
        opportunities: opportunities.filter((o) => o.action.trim()).map((o) => ({
          action: o.action,
          bullets: o.bullets.filter((b) => b.trim()),
        })),
        bugs: bugs.filter((b) => b.name.trim()),
        issues: issues.filter((i) => i.description.trim()),
        heuristicIds: selectedHeuristicIds,
      })

      if (!isEditing) {
        setCharterText("")
        setAreas([""])
        setStartDate("")
        setTesterId("")
        setDuration("normal")
        setTestDesignPercentage("40")
        setBugInvestigationPercentage("30")
        setSessionSetupPercentage("10")
        setCharterVsOpportunity("80")
        setDataFiles([""])
        setTestNotes([{ action: "", bullets: [""] }])
        setOpportunities([{ action: "", bullets: [""] }])
        setBugs([{ name: "", steps: [""], expected: "", actual: "" }])
        setIssues([{ description: "" }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ET Charter")
    }
  }

  const addArea = () => setAreas([...areas, ""])
  const removeArea = (index: number) => setAreas(areas.filter((_, i) => i !== index))
  const updateArea = (index: number, value: string) => {
    const newAreas = [...areas]
    newAreas[index] = value
    setAreas(newAreas)
  }

  const addDataFile = () => setDataFiles([...dataFiles, ""])
  const removeDataFile = (index: number) => setDataFiles(dataFiles.filter((_, i) => i !== index))
  const updateDataFile = (index: number, value: string) => {
    const newDataFiles = [...dataFiles]
    newDataFiles[index] = value
    setDataFiles(newDataFiles)
  }

  const updateTestNote = (index: number, field: "action", value: string) => {
    const newNotes = [...testNotes]
    newNotes[index][field] = value
    setTestNotes(newNotes)
  }

  const updateTestNoteBullet = (noteIndex: number, bulletIndex: number, value: string) => {
    const newNotes = [...testNotes]
    newNotes[noteIndex].bullets[bulletIndex] = value
    setTestNotes(newNotes)
  }

  const addTestNoteBullet = (noteIndex: number) => {
    const newNotes = [...testNotes]
    newNotes[noteIndex].bullets.push("")
    setTestNotes(newNotes)
  }

  const removeTestNoteBullet = (noteIndex: number, bulletIndex: number) => {
    const newNotes = [...testNotes]
    newNotes[noteIndex].bullets = newNotes[noteIndex].bullets.filter((_, i) => i !== bulletIndex)
    setTestNotes(newNotes)
  }

  const addTestNote = () => setTestNotes([...testNotes, { action: "", bullets: [""] }])
  const removeTestNote = (index: number) => setTestNotes(testNotes.filter((_, i) => i !== index))

  const updateOpportunity = (index: number, field: "action", value: string) => {
    const newOpps = [...opportunities]
    newOpps[index][field] = value
    setOpportunities(newOpps)
  }

  const updateOppBullet = (oppIndex: number, bulletIndex: number, value: string) => {
    const newOpps = [...opportunities]
    newOpps[oppIndex].bullets[bulletIndex] = value
    setOpportunities(newOpps)
  }

  const addOppBullet = (oppIndex: number) => {
    const newOpps = [...opportunities]
    newOpps[oppIndex].bullets.push("")
    setOpportunities(newOpps)
  }

  const removeOppBullet = (oppIndex: number, bulletIndex: number) => {
    const newOpps = [...opportunities]
    newOpps[oppIndex].bullets = newOpps[oppIndex].bullets.filter((_, i) => i !== bulletIndex)
    setOpportunities(newOpps)
  }

  const addOpportunity = () => setOpportunities([...opportunities, { action: "", bullets: [""] }])
  const removeOpportunity = (index: number) => setOpportunities(opportunities.filter((_, i) => i !== index))

  const updateBug = (index: number, field: "name" | "steps" | "expected" | "actual", value: any) => {
    const newBugs = [...bugs]
    if (field === "steps" && typeof value === "string") {
      newBugs[index].steps = value ? [value] : []
    } else {
      newBugs[index][field] = value
    }
    setBugs(newBugs)
  }

  const addBug = () => setBugs([...bugs, { name: "", steps: [""], expected: "", actual: "" }])
  const removeBug = (index: number) => setBugs(bugs.filter((_, i) => i !== index))

  const updateIssue = (index: number, value: string) => {
    const newIssues = [...issues]
    newIssues[index].description = value
    setIssues(newIssues)
  }

  const addIssue = () => setIssues([...issues, { description: "" }])
  const removeIssue = (index: number) => setIssues(issues.filter((_, i) => i !== index))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit ET Charter" : "Create ET Charter"}</DialogTitle>
            <DialogDescription>
              Document your exploratory testing session
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="notes">Test Notes</TabsTrigger>
              <TabsTrigger value="bugs">Bugs & Issues</TabsTrigger>
              <TabsTrigger value="time">Time Breakdown</TabsTrigger>
              <TabsTrigger value="heuristics">Heuristics</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="charter">
                    Charter <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="charter"
                    value={charterText}
                    onChange={(e) => setCharterText(e.target.value)}
                    placeholder="e.g., Verify checkout flow with multiple items in cart."
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Areas Covered</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addArea}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {areas.map((area, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={area}
                        onChange={(e) => updateArea(i, e.target.value)}
                        placeholder="e.g., Shopping cart page"
                        className="flex-1"
                      />
                      {areas.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeArea(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tester">Tester</Label>
                    <select
                      id="tester"
                      value={testerId}
                      onChange={(e) => setTesterId(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select tester</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration</Label>
                    <select
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      {durationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Data Files</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addDataFile}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {dataFiles.map((file, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={file}
                        onChange={(e) => updateDataFile(i, e.target.value)}
                        placeholder="/recordings/session-001.webm"
                        className="flex-1"
                      />
                      {dataFiles.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeDataFile(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Test Notes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTestNote}>
                    <Plus className="h-3 w-3 mr-1" /> Add Note
                  </Button>
                </div>
                {testNotes.map((note, noteIndex) => (
                  <Card key={noteIndex} className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center mt-2">
                        {noteIndex + 1}
                      </span>
                      <Input
                        value={note.action}
                        onChange={(e) => updateTestNote(noteIndex, "action", e.target.value)}
                        placeholder="Action (e.g., Navigated to homepage)"
                        className="flex-1"
                      />
                      {testNotes.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeTestNote(noteIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="pl-8 space-y-1">
                      {note.bullets.map((bullet, bulletIndex) => (
                        <div key={bulletIndex} className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">-</span>
                          <Input
                            value={bullet}
                            onChange={(e) => updateTestNoteBullet(noteIndex, bulletIndex, e.target.value)}
                            placeholder="Observation (e.g., Banner loaded correctly)"
                            className="flex-1 text-sm"
                          />
                          {note.bullets.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTestNoteBullet(noteIndex, bulletIndex)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={() => addTestNoteBullet(noteIndex)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Bullet
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <Label>Opportunities (Unexpected Findings)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOpportunity}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {opportunities.map((opp, oppIndex) => (
                  <Card key={oppIndex} className="p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 text-xs flex items-center justify-center mt-2">
                        {oppIndex + 1}
                      </span>
                      <Input
                        value={opp.action}
                        onChange={(e) => updateOpportunity(oppIndex, "action", e.target.value)}
                        placeholder="Unexpected finding"
                        className="flex-1"
                      />
                      {opportunities.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeOpportunity(oppIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="pl-8 space-y-1">
                      {opp.bullets.map((bullet, bulletIndex) => (
                        <div key={bulletIndex} className="flex items-center gap-2">
                          <span className="text-yellow-600 text-sm">-</span>
                          <Input
                            value={bullet}
                            onChange={(e) => updateOppBullet(oppIndex, bulletIndex, e.target.value)}
                            placeholder="Details"
                            className="flex-1 text-sm"
                          />
                          {opp.bullets.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOppBullet(oppIndex, bulletIndex)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="ghost" size="sm" onClick={() => addOppBullet(oppIndex)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Bullet
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="bugs" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Bugs Found</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addBug}>
                    <Plus className="h-3 w-3 mr-1" /> Add Bug
                  </Button>
                </div>
                {bugs.map((bug, bugIndex) => (
                  <Card key={bugIndex} className="p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center mt-2">
                        {bugIndex + 1}
                      </span>
                      <Input
                        value={bug.name}
                        onChange={(e) => updateBug(bugIndex, "name", e.target.value)}
                        placeholder="Bug name (e.g., Shipping doesn't calculate for CEPs starting with 0)"
                        className="flex-1"
                      />
                      {bugs.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeBug(bugIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="pl-8 space-y-3">
                      <div>
                        <Label className="text-xs">Steps to Reproduce</Label>
                        <Input
                          value={bug.steps[0] || ""}
                          onChange={(e) => updateBug(bugIndex, "steps", e.target.value)}
                          placeholder="Step-by-step instructions"
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Expected Result</Label>
                          <Input
                            value={bug.expected}
                            onChange={(e) => updateBug(bugIndex, "expected", e.target.value)}
                            placeholder="What should happen"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Actual Result</Label>
                          <Input
                            value={bug.actual}
                            onChange={(e) => updateBug(bugIndex, "actual", e.target.value)}
                            placeholder="What actually happens"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <Label>Issues</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addIssue}>
                    <Plus className="h-3 w-3 mr-1" /> Add Issue
                  </Button>
                </div>
                {issues.map((issue, issueIndex) => (
                  <div key={issueIndex} className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs flex items-center justify-center">
                      {issueIndex + 1}
                    </span>
                    <Input
                      value={issue.description}
                      onChange={(e) => updateIssue(issueIndex, e.target.value)}
                      placeholder="Issue description"
                      className="flex-1"
                    />
                    {issues.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeIssue(issueIndex)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="time" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <p className="text-sm text-muted-foreground">
                  Define how you split your testing time across different activities.
                </p>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <Label htmlFor="testDesign">Test Design and Execution</Label>
                      <span className="text-sm font-medium">{testDesignPercentage}%</span>
                    </div>
                    <Input
                      id="testDesign"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={testDesignPercentage}
                      onChange={(e) => setTestDesignPercentage(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <Label htmlFor="bugInvest">Bug Investigation and Reporting</Label>
                      <span className="text-sm font-medium">{bugInvestigationPercentage}%</span>
                    </div>
                    <Input
                      id="bugInvest"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={bugInvestigationPercentage}
                      onChange={(e) => setBugInvestigationPercentage(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <Label htmlFor="sessionSetup">Session Setup</Label>
                      <span className="text-sm font-medium">{sessionSetupPercentage}%</span>
                    </div>
                    <Input
                      id="sessionSetup"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={sessionSetupPercentage}
                      onChange={(e) => setSessionSetupPercentage(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <Label htmlFor="charterVsOpp">Charter vs Opportunity</Label>
                        <span className="text-sm font-medium">{charterVsOpportunity}% / {100 - parseInt(charterVsOpportunity)}%</span>
                      </div>
                      <Input
                        id="charterVsOpp"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={charterVsOpportunity}
                        onChange={(e) => setCharterVsOpportunity(e.target.value)}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        How much time was spent on planned charter vs unexpected opportunities
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="heuristics" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">About Heuristics</h4>
                  <p className="text-xs text-muted-foreground">
                    Heuristics are reusable templates that guide you in writing effective test charters. 
                    Select one or more heuristics that apply to this charter session.
                  </p>
                </div>
                <HeuristicPicker
                  selectedHeuristicIds={selectedHeuristicIds}
                  onToggle={(id) => {
                    if (selectedHeuristicIds.includes(id)) {
                      setSelectedHeuristicIds(selectedHeuristicIds.filter((hId) => hId !== id))
                    } else {
                      setSelectedHeuristicIds([...selectedHeuristicIds, id])
                    }
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Charter"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CopyMoveCharterDialogProps {
  mode: "copy" | "move"
  charter: ETCharter
  onClose: () => void
  onSelect: (targetSuiteId: string) => void
}

function CopyMoveCharterDialog({ mode, charter, onClose, onSelect }: CopyMoveCharterDialogProps) {
  const [suites, setSuites] = useState<Array<{ id: string; name: string; testPlanName?: string }>>([])
  const [selectedSuiteId, setSelectedSuiteId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useState(() => {
    loadSuites()
  })

  const loadSuites = async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>("/suites")
      const mappedSuites = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        testPlanName: s.testPlan?.name,
      }))
      setSuites(mappedSuites)
    } catch (err) {
      console.error("Failed to load suites:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSuiteId) return

    setIsSubmitting(true)
    try {
      await onSelect(selectedSuiteId)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "copy" ? "Copy" : "Move"} ET Charter</DialogTitle>
            <DialogDescription>
              Select a target test suite for "{charter.charter}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                {suites.map((suite) => (
                  <div
                    key={suite.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSuiteId === suite.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/50"
                    }`}
                    onClick={() => setSelectedSuiteId(suite.id)}
                  >
                    <div className="flex-shrink-0">
                      <input
                        type="radio"
                        checked={selectedSuiteId === suite.id}
                        onChange={() => setSelectedSuiteId(suite.id)}
                        className="accent-primary"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{suite.name}</p>
                      {suite.testPlanName && (
                        <p className="text-sm text-muted-foreground">{suite.testPlanName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedSuiteId || isSubmitting}>
              {isSubmitting ? "Processing..." : mode === "copy" ? "Copy Charter" : "Move Charter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TestCaseListComponent({
  suiteId,
  cases,
}: {
  suiteId: string
  cases: TestCase[]
}) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Title</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Executions</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => (
            <TableRow key={caseItem.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{caseItem.title}</p>
                  {caseItem.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {caseItem.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={priorityColors[caseItem.priority.value] || "border-gray-500 text-gray-500"}
                >
                  {caseItem.priority.label}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm">{caseItem.type.label}</span>
              </TableCell>
              <TableCell>
                {caseItem.lastExecution ? (
                  <Badge
                    variant="outline"
                    className={statusColors[caseItem.lastExecution.status.value] || statusColors.not_run}
                  >
                    {caseItem.lastExecution.status.label}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm">{caseItem._count.executions}</span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
