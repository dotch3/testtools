import type { Metadata } from "next"
import "./globals.css"
import { APP_CONFIG } from "@/lib/config"
import { Providers } from "@/components/Providers"

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
