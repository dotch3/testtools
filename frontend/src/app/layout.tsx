import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "TestTool",
  description: "Test management system for QA teams",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
