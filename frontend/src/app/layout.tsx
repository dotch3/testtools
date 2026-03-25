import type { Metadata } from "next"
import "./globals.css"
import { APP_CONFIG } from "@/lib/config"

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
