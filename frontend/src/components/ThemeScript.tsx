"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

export function ThemeScript() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.classList.add(theme);
          })();
        `,
      }}
    />,
    document.head
  )
}
