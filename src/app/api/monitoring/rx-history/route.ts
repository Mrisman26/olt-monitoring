import { NextResponse } from "next/server"

import { readRxPowerSamples } from "@/lib/server-db"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const onuId = url.searchParams.get("onuId") ?? ""
  const range = url.searchParams.get("range") ?? "1h"

  if (!onuId) {
    return NextResponse.json({ samples: [] })
  }

  const hoursMap: Record<string, number> = {
    "1h": 1,
    "6h": 6,
    "24h": 24,
    "7d": 168,
    "30d": 720,
  }
  const hours = hoursMap[range] ?? 1

  const samples = await readRxPowerSamples(onuId, hours)
  return NextResponse.json({ samples })
}
