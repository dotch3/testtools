export interface TestExecution {
  id: string
  testCaseId: string
  testCase: {
    id: string
    title: string
    priority: string
    steps?: Array<{ order: number; action: string; expectedResult: string }>
  }
  testPlanId: string
  testPlan: {
    id: string
    name: string
  }
  statusId: string
  status: {
    id: string
    value: string
    label: string
    color: string
  }
  executedById: string
  executedBy: {
    id: string
    name?: string
    email: string
  }
  executedAt: string
  durationMs?: number
  notes?: string
  environment?: string
  platform?: string
  ciRunId?: string
  createdAt: string
  bugs?: BugSummary[]
  stepResults?: ExecutionStepResult[]
  _count?: {
    bugs: number
  }
}

export interface ExecutionStepResult {
  id: string
  executionId: string
  stepOrder: number
  status: "pass" | "fail" | "blocked" | "skipped"
  actualResult?: string
  notes?: string
  executedById: string
  executedBy?: {
    id: string
    name?: string
    email: string
  }
  createdAt: string
}

export interface BugSummary {
  id: string
  title: string
  status: {
    label: string
    color: string
  }
  priority: {
    label: string
    color: string
  }
}

export interface Bug {
  id: string
  projectId: string
  title: string
  description?: string
  statusId: string
  status: {
    id: string
    value: string
    label: string
    color: string
  }
  priorityId: string
  priority: {
    id: string
    value: string
    label: string
    color: string
  }
  severityId: string
  severity: {
    id: string
    value: string
    label: string
    color: string
  }
  sourceId: string
  source: {
    id: string
    value: string
    label: string
  }
  externalId?: string
  externalUrl?: string
  reportedById: string
  reportedBy: {
    id: string
    name?: string
    email: string
  }
  assignedToId?: string
  assignedTo?: {
    id: string
    name?: string
    email: string
  }
  createdAt: string
  updatedAt: string
  syncedAt?: string
  executions?: TestExecution[]
  _count?: {
    executions: number
  }
}

export interface BugStats {
  total: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  bySeverity: Record<string, number>
}

export interface CreateBugInput {
  title: string
  description?: string
  statusId: string
  priorityId: string
  severityId: string
  sourceId: string
  assignedToId?: string
  externalId?: string
  externalUrl?: string
}

export interface UpdateExecutionInput {
  statusId?: string
  notes?: string
  durationMs?: number
  environment?: string
  platform?: string
}

export interface CreateExecutionInput {
  testCaseId: string
  testPlanId: string
  environment?: string
  platform?: string
}

export interface CreateStepResultInput {
  stepOrder: number
  status: "pass" | "fail" | "blocked" | "skipped"
  actualResult?: string
  notes?: string
}
