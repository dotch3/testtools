"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access_token")
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const userData = await api.get<User>("/auth/me")
        setUser(userData)
      } catch {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const data = await api.post<{
      accessToken: string
      refreshToken: string
      user: User
    }>("/auth/login", { email, password })

    localStorage.setItem("access_token", data.accessToken)
    localStorage.setItem("refresh_token", data.refreshToken)
    setUser(data.user)
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
