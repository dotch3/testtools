export interface Project {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: string
  updatedAt?: string
  _count?: {
    members: number
    testPlans: number
  }
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  roleId: string
  joinedAt: string
  user: {
    id: string
    email: string
    name?: string
    avatarUrl?: string
  }
  role: {
    id: string
    name: string
    label: string
  }
}
