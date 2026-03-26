import { AppShell } from "@/components/layout/AppShell"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute redirectTo="/login">
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}
