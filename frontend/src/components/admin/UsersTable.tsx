"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { User, CreateUserInput, UpdateUserInput } from "@/types/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Search,
  Lock,
  Unlock,
  Shield,
  Trash2,
  MoreHorizontal,
  UserPlus,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UsersTable() {
  const t = useTranslations("common")
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [createForm, setCreateForm] = useState<CreateUserInput>({
    email: "",
    password: "",
    name: "",
    roleId: "",
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      const queryString = params.toString()
      const data = await api.get<User[]>(
        `/admin/users${queryString ? `?${queryString}` : ""}`
      )
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      const newUser = await api.post<{ id: string; email: string }>(
        "/admin/users",
        createForm
      )
      setUsers([
        ...users,
        {
          ...newUser,
          name: createForm.name,
          role: { id: createForm.roleId, name: "", label: "", color: "" },
          createdAt: new Date().toISOString(),
        },
      ])
      setIsCreateDialogOpen(false)
      setCreateForm({ email: "", password: "", name: "", roleId: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user")
    }
  }

  const handleUpdateUser = async (user: User, updates: UpdateUserInput) => {
    try {
      await api.patch(`/admin/users/${user.id}`, updates)
      setUsers(
        users.map((u) =>
          u.id === user.id
            ? {
                ...u,
                ...(updates.roleId && {
                  role: { ...u.role, id: updates.roleId },
                }),
              }
            : u
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user")
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to deactivate ${user.email}?`)) return
    try {
      await api.delete(`/admin/users/${user.id}`)
      setUsers(users.filter((u) => u.id !== user.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate user")
    }
  }

  const handleUnlockUser = async (user: User) => {
    try {
      await api.post(`/admin/users/${user.id}/unlock`)
      setUsers(
        users.map((u) =>
          u.id === user.id ? { ...u, lockedUntil: undefined } : u
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock user")
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return <div className="text-center py-8">{t("loading")}</div>
  }

  if (error) {
    return <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Last Login</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {(user.name || user.email)[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      style={{
                        backgroundColor: `${user.role.color}20`,
                        color: user.role.color,
                        borderColor: `${user.role.color}40`,
                      }}
                      variant="outline"
                    >
                      {user.role.label || user.role.name}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {user.lockedUntil ? (
                      <Badge variant="destructive" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                          Edit User
                        </DropdownMenuItem>
                        {user.lockedUntil && (
                          <DropdownMenuItem onClick={() => handleUnlockUser(user)}>
                            <Unlock className="mr-2 h-4 w-4" />
                            Unlock Account
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. They will receive an email with login
              instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="user@testtools.com"
              />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                placeholder="Leave blank to generate"
              />
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                value={createForm.roleId}
                onChange={(e) =>
                  setCreateForm({ ...createForm, roleId: e.target.value })
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select a role</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={!createForm.email || !createForm.roleId}
            >
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>{selectedUser?.email}</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  value={selectedUser.role.id}
                  onChange={(e) => {
                    handleUpdateUser(selectedUser, { roleId: e.target.value })
                    setSelectedUser({ ...selectedUser, role: { ...selectedUser.role, id: e.target.value } })
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
