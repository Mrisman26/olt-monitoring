"use client"

import { createContext, useContext } from "react"
import { useSseState } from "@/lib/use-sse-state"

type SseContextValue = ReturnType<typeof useSseState>

const SseContext = createContext<SseContextValue | null>(null)

export function SseProvider({ children }: { children: React.ReactNode }) {
  const value = useSseState()
  return <SseContext.Provider value={value}>{children}</SseContext.Provider>
}

export function useSse() {
  const ctx = useContext(SseContext)
  if (!ctx) throw new Error("useSse must be used within SseProvider")
  return ctx
}
