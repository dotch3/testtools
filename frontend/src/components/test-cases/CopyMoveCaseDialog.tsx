"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"

interface TestSuite {
  id: string
  name: string
  testPlanId?: string
  testPlanName?: string
}

interface TestPlan {
  id: string
  name: string
}

interface CopyMoveCaseDialogProps {
  isOpen: boolean
  mode: "copy" | "move"
  testCase?: { id: string; title: string }
  suiteId?: string
  onClose: () => void
  onComplete: () => void
}

export function CopyMoveCaseDialog({
  isOpen,
  mode,
  testCase,
  suiteId,
  onClose,
  onComplete,
}: CopyMoveCaseDialogProps) {
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [testPlans, setTestPlans] = useState<TestPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [plansRes, suitesRes] = await Promise.all([
        api.get<any[]>("/projects/current/test-plans").catch(() => []),
        api.get<any[]>(`/suites/${suiteId}`).then(s => {
          if (s && typeof s === 'object' && 'id' in s) {
            return [s]
          }
          return []
        }).catch(() => [])
      ])

      setTestPlans(Array.isArray(plansRes) ? plansRes.map((p: any) => ({ id: p.id, name: p.name })) : [])
      
      if (Array.isArray(suitesRes)) {
        setSuites(suitesRes.map((s: any) => ({ 
          id: s.id, 
          name: s.name,
          testPlanId: s.testPlanId,
          testPlanName: s.testPlan?.name 
        })))
      }
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSuitesForPlan = async (planId: string) => {
    try {
      const suitesRes = await api.get<any[]>(`/test-plans/${planId}/suites`)
      setSuites(suitesRes.map((s: any) => ({ 
        id: s.id, 
        name: s.name,
        testPlanId: planId,
        testPlanName: testPlans.find(p => p.id === planId)?.name
      })))
    } catch (err) {
      console.error("Failed to load suites:", err)
      setSuites([])
    }
  }

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId)
    setSelectedSuiteId("")
    loadSuitesForPlan(planId)
  }

  const handleSubmit = async () => {
    if (!testCase || !selectedSuiteId) return

    setIsSubmitting(true)
    try {
      const endpoint = mode === "copy" ? `/cases/${testCase.id}/copy` : `/cases/${testCase.id}/move`
      await api.post(endpoint, { targetSuiteId: selectedSuiteId })
      onComplete()
      handleClose()
    } catch (err) {
      console.error(`Failed to ${mode} case:`, err)
      alert(`Failed to ${mode} test case. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedPlanId("")
    setSelectedSuiteId("")
    setSearchQuery("")
    setSuites([])
    onClose()
  }

  const filteredPlans = testPlans.filter((plan) =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSuites = suites.filter((suite) =>
    suite.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-24 mt-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
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

              <div className="max-h-[150px] overflow-y-auto rounded-md border">
                {filteredPlans.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No test plans found
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => handlePlanSelect(plan.id)}
                        className={`w-full p-3 text-left hover:bg-muted/50 ${
                          selectedPlanId === plan.id ? "bg-muted" : ""
                        }`}
                      >
                        <div className="font-medium">{plan.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPlanId && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="suite-search">Target Test Suite</Label>
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

                  <div className="max-h-[150px] overflow-y-auto rounded-md border">
                    {filteredSuites.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No suites found in this plan
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredSuites.map((suite) => (
                          <button
                            key={suite.id}
                            onClick={() => setSelectedSuiteId(suite.id)}
                            disabled={suite.id === suiteId}
                            className={`w-full p-3 text-left hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                              selectedSuiteId === suite.id ? "bg-muted" : ""
                            }`}
                          >
                            <div className="font-medium">{suite.name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSuiteId || isSubmitting || isLoading}
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
