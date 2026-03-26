"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  text?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
}

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && (
        <p className={cn("text-muted-foreground", textSizes[size])}>{text}</p>
      )}
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  text?: string
  className?: string
}

export function LoadingOverlay({ isLoading, children, text, className }: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <LoadingSpinner size="lg" text={text} />
        </div>
      )}
    </div>
  )
}

interface LoadingPageProps {
  text?: string
}

export function LoadingPage({ text = "Loading..." }: LoadingPageProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <LoadingSpinner size="xl" text={text} />
    </div>
  )
}

interface LoadingCardProps {
  rows?: number
  className?: string
}

export function LoadingCard({ rows = 5, className }: LoadingCardProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <div className="w-12 h-12 bg-muted rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

interface LoadingTableProps {
  columns: number
  rows?: number
  className?: string
}

export function LoadingTable({ columns, rows = 5, className }: LoadingTableProps) {
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {[...Array(columns)].map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b last:border-0">
              {[...Array(columns)].map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div className="h-4 bg-muted rounded animate-pulse" 
                    style={{ width: `${60 + Math.random() * 40}%` }} 
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
