import { NextResponse } from "next/server"

import { readMonitoringState } from "@/lib/server-db"
import type { PonPortStatus } from "@/lib/types"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const oltId = url.searchParams.get("oltId") ?? ""

  const state = await readMonitoringState()
  const onus = oltId ? state.onus.filter((onu) => onu.oltId === oltId) : state.onus

  const portMap = new Map<string, { online: number; offline: number; los: number; total: number }>()

  for (const onu of onus) {
    const port = onu.ponPort || "unknown"
    if (!portMap.has(port)) {
      portMap.set(port, { online: 0, offline: 0, los: 0, total: 0 })
    }
    const entry = portMap.get(port)!
    entry.total++
    if (onu.status === "online") entry.online++
    else if (onu.status === "los") entry.los++
    else entry.offline++
  }

  const result: PonPortStatus[] = [...portMap.entries()]
    .map(([ponPort, counts]) => ({ ponPort, ...counts }))
    .sort((a, b) => a.ponPort.localeCompare(b.ponPort, undefined, { numeric: true }))

  return NextResponse.json({ ponStatus: result })
}
