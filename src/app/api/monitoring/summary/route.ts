import { NextResponse } from "next/server"

import { buildOperationalAlerts } from "@/lib/operational-alerts"
import { readMonitoringState } from "@/lib/server-db"

export const runtime = "nodejs"

export async function GET() {
  const state = await readMonitoringState()
  const onlineOlts = state.olts.filter((olt) => olt.status === "online").length
  const totalOnu = state.onus.length
  const downOnu = state.onus.filter((onu) => onu.status !== "online").length
  const openAlerts = buildOperationalAlerts(state.olts, state.onus, state.alerts).filter((alert) => !alert.acknowledged).length

  return NextResponse.json({ onlineOlts, totalOnu, downOnu, openAlerts })
}
