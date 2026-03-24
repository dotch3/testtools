import { TestTube2 } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2">
            <TestTube2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">TestTool</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  )
}
