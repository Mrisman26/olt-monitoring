import { NextResponse } from "next/server"

import { buildOperationalAlerts } from "@/lib/operational-alerts"
import { readMonitoringState } from "@/lib/server-db"

export const runtime = "nodejs"

export async function GET() {
  const state = await readMonitoringState()

  return NextResponse.json({
    operationalAlerts: buildOperationalAlerts(state.olts, state.onus, state.alerts),
    savedAlerts: state.alerts,
  })
}
