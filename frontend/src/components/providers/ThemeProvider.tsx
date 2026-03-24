'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  defaultTheme?: string
}

// Wraps next-themes ThemeProvider.
// Default theme is set from UI_DEFAULT_THEME env var (passed via layout).
export function ThemeProvider({ children, defaultTheme = 'dark' }: Props) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
