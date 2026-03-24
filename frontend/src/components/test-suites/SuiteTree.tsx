"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, MoreHorizontal, Plus, Edit, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface SuiteNode {
  id: string
  name: string
  description?: string
  parentSuiteId?: string | null
  children: SuiteNode[]
  _count?: {
    cases: number
  }
}

interface SuiteTreeProps {
  suites: SuiteNode[]
  selectedSuiteId?: string
  onSelect?: (suite: SuiteNode) => void
  onAddChild?: (parentId: string) => void
  onEdit?: (suite: SuiteNode) => void
  onDelete?: (suite: SuiteNode) => void
}

export function SuiteTree({
  suites,
  selectedSuiteId,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
}: SuiteTreeProps) {
  if (suites.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No test suites yet. Create your first suite.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {suites.map((suite) => (
        <SuiteTreeNode
          key={suite.id}
          suite={suite}
          selectedSuiteId={selectedSuiteId}
          onSelect={onSelect}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
          level={0}
        />
      ))}
    </div>
  )
}

interface SuiteTreeNodeProps {
  suite: SuiteNode
  selectedSuiteId?: string
  onSelect?: (suite: SuiteNode) => void
  onAddChild?: (parentId: string) => void
  onEdit?: (suite: SuiteNode) => void
  onDelete?: (suite: SuiteNode) => void
  level: number
}

function SuiteTreeNode({
  suite,
  selectedSuiteId,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
  level,
}: SuiteTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = suite.children.length > 0
  const isSelected = selectedSuiteId === suite.id

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-2 px-2 rounded-md cursor-pointer transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect?.(suite)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground" />
        )}

        <span className="flex-1 text-sm font-medium truncate">{suite.name}</span>

        {suite._count?.cases !== undefined && (
          <span className="text-xs text-muted-foreground">
            {suite._count.cases}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAddChild?.(suite.id)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Child Suite
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(suite)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(suite)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {suite.children.map((child) => (
            <SuiteTreeNode
              key={child.id}
              suite={child}
              selectedSuiteId={selectedSuiteId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
