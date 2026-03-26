"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { api } from "@/lib/api"

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: string
  projectIds: string[]
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<User>) => void
  refreshUser: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function normalizeUser(raw: any): User {
  let role = "User"
  
  if (typeof raw.role === "string") {
    role = raw.role
  } else if (raw.role && typeof raw.role === "object") {
    if (raw.role.label) {
      role = raw.role.label
    } else if (raw.role.name) {
      role = raw.role.name
    }
  } else if (raw.roleId) {
    role = raw.roleId.replace("role-", "").replace("-", " ")
    role = role.charAt(0).toUpperCase() + role.slice(1)
  }
  
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name || "",
    avatarUrl: raw.avatarUrl,
    role,
    projectIds: Array.isArray(raw.projectIds) ? raw.projectIds : [],
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const userData = await api.get<any>("/auth/me")
      setUser(normalizeUser(userData))
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token")
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const userData = await api.get<any>("/auth/me", { noRedirect: true } as any)
        setUser(normalizeUser(userData))
      } catch (err) {
        console.error("Failed to fetch user:", err)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "access_token" && !e.newValue) {
        setUser(null)
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login"
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await api.post<{
      accessToken: string
      refreshToken: string
      user: any
    }>("/auth/login", { email, password })

    localStorage.setItem("access_token", data.accessToken)
    localStorage.setItem("refresh_token", data.refreshToken)
    setUser(normalizeUser(data.user))
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setUser(null)
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  }

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
