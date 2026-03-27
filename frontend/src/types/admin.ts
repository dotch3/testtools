export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  lastLoginAt?: string
  lockedUntil?: string
  createdAt: string
  emailVerified?: boolean
  forcePasswordChange?: boolean
  role: {
    id: string
    name: string
    label: string
    color: string
  }
}

export interface CreateUserInput {
  email: string
  password?: string
  name?: string
  roleId: string
}

export interface UpdateUserInput {
  name?: string
  email?: string
  roleId?: string
  forcePasswordChange?: boolean
  locked?: boolean
}

export interface Role {
  id: string
  name: string
  label: string
  description?: string
  color: string
  isSystem: boolean
  createdAt: string
  _count?: {
    users: number
  }
}

export interface EnumValue {
  id: string
  type: string
  value: string
  label: string
  description?: string
  color: string
  order: number
  isActive: boolean
}

export interface Integration {
  id: string
  projectId: string
  type: {
    id: string
    value: string
    label: string
  }
  config: Record<string, unknown>
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectSettings {
  id: string
  defaultTestPlanId?: string
  defaultExecutionStatusId?: string
  autoAssignReviewers: boolean
  requireTestApproval: boolean
}
