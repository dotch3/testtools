"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Lightbulb,
  AlertCircle,
  Loader2,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface Persona {
  id: string
  name: string
  description?: string
  characteristics: string[]
}

interface Heuristic {
  id: string
  name: string
  description?: string
  template: string
  elements: {
    risk?: boolean
    coverage?: boolean
    time?: boolean
    style?: boolean
  }
  examples: Array<{ charter: string; description?: string }>
  personas: Persona[]
  _count?: { linkedCharters: number }
}

interface HeuristicFormData {
  name: string
  description: string
  template: string
  elements: {
    risk: boolean
    coverage: boolean
    time: boolean
    style: boolean
  }
  examples: Array<{ charter: string; description?: string }>
}

interface PersonaFormData {
  name: string
  description: string
  characteristics: string[]
}

export function HeuristicList() {
  const [heuristics, setHeuristics] = useState<Heuristic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingHeuristic, setEditingHeuristic] = useState<Heuristic | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Heuristic | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  const loadHeuristics = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<Heuristic[]>("/heuristics")
      setHeuristics(data)
    } catch (err) {
      console.error("Failed to load heuristics:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHeuristics()
  }, [loadHeuristics])

  const handleCreate = async (data: HeuristicFormData) => {
    try {
      await api.post("/heuristics", {
        name: data.name,
        description: data.description || undefined,
        template: data.template,
        elements: data.elements,
        examples: data.examples.filter((e) => e.charter.trim()),
      })
      setIsCreateOpen(false)
      loadHeuristics()
    } catch (err) {
      console.error("Failed to create heuristic:", err)
      alert(err instanceof Error ? err.message : "Failed to create heuristic")
    }
  }

  const handleUpdate = async (data: HeuristicFormData) => {
    if (!editingHeuristic) return
    try {
      await api.patch(`/heuristics/${editingHeuristic.id}`, {
        name: data.name,
        description: data.description || undefined,
        template: data.template,
        elements: data.elements,
        examples: data.examples.filter((e) => e.charter.trim()),
      })
      setEditingHeuristic(null)
      loadHeuristics()
    } catch (err) {
      console.error("Failed to update heuristic:", err)
      alert(err instanceof Error ? err.message : "Failed to update heuristic")
    }
  }

  const handleDelete = async (heuristic: Heuristic) => {
    setDeletingId(heuristic.id)
    try {
      await api.delete(`/heuristics/${heuristic.id}`)
      setHeuristics(heuristics.filter((h) => h.id !== heuristic.id))
    } catch (err) {
      console.error("Failed to delete heuristic:", err)
      alert(err instanceof Error ? err.message : "Failed to delete heuristic")
    } finally {
      setDeletingId(null)
    }
  }

  const copyTemplate = (template: string, id: string) => {
    navigator.clipboard.writeText(template)
    setCopiedTemplate(id)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  const filteredHeuristics = heuristics.filter((h) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      h.name.toLowerCase().includes(query) ||
      h.description?.toLowerCase().includes(query) ||
      h.template.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search heuristics..."
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

        <HeuristicDialog
          onSubmit={handleCreate}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Heuristic
            </Button>
          }
          onOpenChange={setIsCreateOpen}
          open={isCreateOpen}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredHeuristics.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No heuristics</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery ? "No heuristics match your search" : "Create your first heuristic to guide charter creation"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHeuristics.map((heuristic) => (
            <HeuristicCard
              key={heuristic.id}
              heuristic={heuristic}
              isExpanded={expandedId === heuristic.id}
              onToggle={() => setExpandedId(expandedId === heuristic.id ? null : heuristic.id)}
              onEdit={() => setEditingHeuristic(heuristic)}
              onDelete={() => setDeleteConfirm(heuristic)}
              onCopyTemplate={() => copyTemplate(heuristic.template, heuristic.id)}
              copiedTemplate={copiedTemplate === heuristic.id}
              isDeleting={deletingId === heuristic.id}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {editingHeuristic && (
        <HeuristicDialog
          onSubmit={handleUpdate}
          trigger={<span />}
          onOpenChange={(open) => !open && setEditingHeuristic(null)}
          open={true}
          heuristic={editingHeuristic}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}
        title="Delete Heuristic"
        description={deleteConfirm ? `Delete heuristic "${deleteConfirm.name}"? This cannot be undone.` : ""}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  )
}

interface HeuristicCardProps {
  heuristic: Heuristic
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onCopyTemplate: () => void
  copiedTemplate: boolean
  isDeleting: boolean
  onUpdate: (data: HeuristicFormData) => Promise<void>
}

function HeuristicCard({
  heuristic,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onCopyTemplate,
  copiedTemplate,
  isDeleting,
}: HeuristicCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{heuristic.name}</h3>
                {heuristic._count && heuristic._count.linkedCharters > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {heuristic._count.linkedCharters} charters
                  </Badge>
                )}
              </div>
              {heuristic.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {heuristic.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {heuristic.elements.risk && <Badge variant="outline" className="text-xs">Risk</Badge>}
                  {heuristic.elements.coverage && <Badge variant="outline" className="text-xs">Coverage</Badge>}
                  {heuristic.elements.time && <Badge variant="outline" className="text-xs">Time</Badge>}
                  {heuristic.elements.style && <Badge variant="outline" className="text-xs">Style</Badge>}
                </div>
                {heuristic.personas.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {heuristic.personas.length} personas
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
        <div className="border-t p-4 bg-muted/30 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Template
              </h4>
              <Button variant="ghost" size="sm" onClick={onCopyTemplate}>
                {copiedTemplate ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <code className="block p-3 bg-background rounded-md text-sm font-mono border">
              {heuristic.template}
            </code>
          </div>

          {heuristic.examples.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Examples</h4>
              <div className="space-y-2">
                {heuristic.examples.map((example, i) => (
                  <div key={i} className="p-3 bg-background rounded-md border">
                    <p className="text-sm font-medium italic">"{example.charter}"</p>
                    {example.description && (
                      <p className="text-xs text-muted-foreground mt-1">{example.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {heuristic.personas.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Personas
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {heuristic.personas.map((persona) => (
                  <div key={persona.id} className="p-3 bg-background rounded-md border">
                    <p className="text-sm font-medium">{persona.name}</p>
                    {persona.description && (
                      <p className="text-xs text-muted-foreground mt-1">{persona.description}</p>
                    )}
                    {persona.characteristics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {persona.characteristics.slice(0, 2).map((char, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {char}
                          </Badge>
                        ))}
                        {persona.characteristics.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{persona.characteristics.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

interface HeuristicDialogProps {
  onSubmit: (data: HeuristicFormData) => Promise<void>
  trigger: React.ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  heuristic?: Heuristic
}

function HeuristicDialog({ onSubmit, trigger, onOpenChange, open, heuristic }: HeuristicDialogProps) {
  const [name, setName] = useState(heuristic?.name || "")
  const [description, setDescription] = useState(heuristic?.description || "")
  const [template, setTemplate] = useState(heuristic?.template || "")
  const [elements, setElements] = useState({
    risk: heuristic?.elements?.risk ?? true,
    coverage: heuristic?.elements?.coverage ?? true,
    time: heuristic?.elements?.time ?? false,
    style: heuristic?.elements?.style ?? false,
  })
  const [examples, setExamples] = useState<Array<{ charter: string; description?: string }>>(
    heuristic?.examples || []
  )
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  const isEditing = !!heuristic

  useState(() => {
    if (heuristic) {
      setName(heuristic.name)
      setDescription(heuristic.description || "")
      setTemplate(heuristic.template)
      setElements({
        risk: heuristic.elements?.risk ?? true,
        coverage: heuristic.elements?.coverage ?? true,
        time: heuristic.elements?.time ?? false,
        style: heuristic.elements?.style ?? false,
      })
      setExamples(heuristic.examples || [])
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (!template.trim()) {
      setError("Template is required")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        template: template.trim(),
        elements,
        examples,
      })

      if (!isEditing) {
        setName("")
        setDescription("")
        setTemplate("")
        setElements({ risk: true, coverage: true, time: false, style: false })
        setExamples([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save heuristic")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addExample = () => setExamples([...examples, { charter: "", description: "" }])
  const removeExample = (index: number) => setExamples(examples.filter((_, i) => i !== index))
  const updateExample = (index: number, field: "charter" | "description", value: string) => {
    const newExamples = [...examples]
    newExamples[index][field] = value
    setExamples(newExamples)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Heuristic" : "Create Heuristic"}</DialogTitle>
            <DialogDescription>
              Create reusable templates and guidance for writing effective ET charters
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="template">Template</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Mission-Based Template"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe when and how to use this heuristic..."
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Charter Elements</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which elements this heuristic uses
                  </p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={elements.risk}
                        onChange={(e) => setElements({ ...elements, risk: e.target.checked })}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Risk</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={elements.coverage}
                        onChange={(e) => setElements({ ...elements, coverage: e.target.checked })}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Coverage</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={elements.time}
                        onChange={(e) => setElements({ ...elements, time: e.target.checked })}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Time</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={elements.style}
                        onChange={(e) => setElements({ ...elements, style: e.target.checked })}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Style</span>
                    </label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="template" className="space-y-4 pt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="template">
                    Template <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use placeholders like {"{risk}"}, {"{coverage}"}, {"{target}"}, {"{style}"} for dynamic content
                  </p>
                  <textarea
                    id="template"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    placeholder="My mission is to test {risk} for {coverage}"
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Template Tips</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Use curly braces {"{placeholder}"} for variable parts</li>
                    <li>• Keep templates short and memorable</li>
                    <li>• Focus on one testing approach per heuristic</li>
                    <li>• Common placeholders: risk, coverage, target, style, information</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="examples" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Example Charters</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addExample}>
                    <Plus className="h-3 w-3 mr-1" /> Add Example
                  </Button>
                </div>

                {examples.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No examples yet. Add some to help users understand how to use this heuristic.
                  </p>
                ) : (
                  examples.map((example, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center mt-2">
                            {index + 1}
                          </span>
                          <Input
                            value={example.charter}
                            onChange={(e) => updateExample(index, "charter", e.target.value)}
                            placeholder="Example charter text..."
                            className="flex-1 italic"
                          />
                          {examples.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExample(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Input
                          value={example.description}
                          onChange={(e) => updateExample(index, "description", e.target.value)}
                          placeholder="Brief description (optional)"
                          className="ml-8 text-sm"
                        />
                      </div>
                    </Card>
                  ))
                )}
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
                "Create Heuristic"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function HeuristicPicker({
  selectedHeuristicIds,
  onToggle,
}: {
  selectedHeuristicIds: string[]
  onToggle: (heuristicId: string) => void
}) {
  const [heuristics, setHeuristics] = useState<Heuristic[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<Heuristic[]>("/heuristics")
        setHeuristics(data)
      } catch (err) {
        console.error("Failed to load heuristics:", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />
  }

  return (
    <div className="space-y-2">
      {heuristics.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">No heuristics available.</p>
          <a
            href="/heuristics"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline mt-1 inline-block"
          >
            Create heuristics →
          </a>
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
          {heuristics.map((heuristic) => (
            <label
              key={heuristic.id}
              className={`flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 ${
                selectedHeuristicIds.includes(heuristic.id) ? "bg-primary/5" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selectedHeuristicIds.includes(heuristic.id)}
                onChange={() => onToggle(heuristic.id)}
                className="mt-1 rounded border-input"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{heuristic.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{heuristic.template}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
