"use client"

import { useState } from "react"
import { Search } from "lucide-react"
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

interface Suite {
  id: string
  name: string
  testPlanId: string
  testPlanName: string
}

interface TestCase {
  id: string
  title: string
  suite: { id: string; name: string }
}

interface CopyMoveDialogProps {
  isOpen: boolean
  mode: "copy" | "move"
  testCase?: TestCase
  suites: Suite[]
  onClose: () => void
  onComplete: (suiteId: string) => void
}

export function CopyMoveDialog({
  isOpen,
  mode,
  testCase,
  suites,
  onClose,
  onComplete,
}: CopyMoveDialogProps) {
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredSuites = suites.filter(
    (suite) =>
      suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      suite.testPlanName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!selectedSuiteId || !testCase) return

    setIsSubmitting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      onComplete(selectedSuiteId)
      setSelectedSuiteId("")
      setSearchQuery("")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedSuiteId("")
    setSearchQuery("")
    onClose()
  }

  const currentSuiteId = testCase?.suite.id

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "copy" ? "Copy" : "Move"} Test Case
          </DialogTitle>
          <DialogDescription>
            {mode === "copy"
              ? `Create a copy of "${testCase?.title}" in a different suite.`
              : `Move "${testCase?.title}" to a different suite.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="suite-search">Target Suite</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="suite-search"
                placeholder="Search suites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto rounded-md border">
            {filteredSuites.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No suites found
              </div>
            ) : (
              <div className="divide-y">
                {filteredSuites.map((suite) => (
                  <button
                    key={suite.id}
                    onClick={() => setSelectedSuiteId(suite.id)}
                    disabled={suite.id === currentSuiteId}
                    className={`w-full p-3 text-left hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedSuiteId === suite.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="font-medium">{suite.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Plan: {suite.testPlanName}
                    </div>
                    {suite.id === currentSuiteId && (
                      <div className="text-xs text-muted-foreground mt-1">
                        (Current suite)
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSuiteId || selectedSuiteId === currentSuiteId || isSubmitting}
          >
            {isSubmitting
              ? mode === "copy"
                ? "Copying..."
                : "Moving..."
              : mode === "copy"
              ? "Copy Test Case"
              : "Move Test Case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
