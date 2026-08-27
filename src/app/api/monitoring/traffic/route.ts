import { NextResponse } from "next/server"

import { readTrafficSamples } from "@/lib/server-db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const onuId = searchParams.get("onuId")
  const range = searchParams.get("range") || "1h"

  if (!onuId) {
    return NextResponse.json({ error: "onuId wajib diisi." }, { status: 400 })
  }

  const rangeMap: Record<string, number> = {
    "1h": 1,
    "6h": 6,
    "24h": 24,
    "7d": 168,
    "30d": 720,
  }

  const hours = rangeMap[range] ?? 1
  const samples = await readTrafficSamples(onuId, hours)

  return NextResponse.json({ samples })
}
