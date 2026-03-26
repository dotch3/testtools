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

interface TestPlan {
  id: string
  name: string
}

interface TestSuite {
  id: string
  name: string
  testPlanId?: string
}

interface CopyMoveDialogProps {
  isOpen: boolean
  mode: "copy" | "move"
  suite?: TestSuite
  testPlans: TestPlan[]
  onClose: () => void
  onComplete: (testPlanId: string) => void
}

export function CopyMoveDialog({
  isOpen,
  mode,
  suite,
  testPlans,
  onClose,
  onComplete,
}: CopyMoveDialogProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredPlans = testPlans.filter((plan) =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!selectedPlanId || !suite) return

    setIsSubmitting(true)
    try {
      onComplete(selectedPlanId)
      setSelectedPlanId("")
      setSearchQuery("")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedPlanId("")
    setSearchQuery("")
    onClose()
  }

  const currentPlanId = suite?.testPlanId

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "copy" ? "Copy" : "Move"} Test Suite
          </DialogTitle>
          <DialogDescription>
            {mode === "copy"
              ? `Create a copy of "${suite?.name}" in a different test plan.`
              : `Move "${suite?.name}" to a different test plan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="plan-search">Target Test Plan</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="plan-search"
                placeholder="Search test plans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto rounded-md border">
            {filteredPlans.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No test plans found
              </div>
            ) : (
              <div className="divide-y">
                {filteredPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    disabled={plan.id === currentPlanId}
                    className={`w-full p-3 text-left hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedPlanId === plan.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="font-medium">{plan.name}</div>
                    {plan.id === currentPlanId && (
                      <div className="text-xs text-muted-foreground mt-1">
                        (Current plan)
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {mode === "copy" && (
            <p className="text-sm text-muted-foreground">
              All test cases in this suite will be copied to the selected plan.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPlanId || selectedPlanId === currentPlanId || isSubmitting}
          >
            {isSubmitting
              ? mode === "copy"
                ? "Copying..."
                : "Moving..."
              : mode === "copy"
              ? "Copy Test Suite"
              : "Move Test Suite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
