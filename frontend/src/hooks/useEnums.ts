"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

export interface EnumOption {
  id: string
  value: string
  label: string
  color?: string
  icon?: string
  isDefault?: boolean
  orderIndex?: number
}

type EnumsMap = Record<string, EnumOption[]>

let cachedEnums: EnumsMap | null = null
let fetchPromise: Promise<EnumsMap> | null = null

async function fetchEnums(): Promise<EnumsMap> {
  if (cachedEnums) return cachedEnums
  if (fetchPromise) return fetchPromise
  fetchPromise = api.get<EnumsMap>("/enums").then((data) => {
    cachedEnums = data
    fetchPromise = null
    return data
  })
  return fetchPromise
}

export function useEnums(typeNames?: string[]) {
  const [enums, setEnums] = useState<EnumsMap>(cachedEnums ?? {})
  const [isLoading, setIsLoading] = useState(!cachedEnums)

  useEffect(() => {
    if (cachedEnums) {
      setEnums(cachedEnums)
      setIsLoading(false)
      return
    }
    fetchEnums().then((data) => {
      setEnums(data)
      setIsLoading(false)
    })
  }, [])

  if (typeNames) {
    const filtered: EnumsMap = {}
    for (const name of typeNames) {
      filtered[name] = enums[name] ?? []
    }
    return { enums: filtered, isLoading }
  }

  return { enums, isLoading }
}
