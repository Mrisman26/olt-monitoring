import { NextResponse } from "next/server"

import { insertHardwareHistory, readHardwareHistory } from "@/lib/server-db"
import type { HardwareHistoryEntry } from "@/lib/types"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const targetType = (url.searchParams.get("targetType") ?? "olt") as "olt" | "onu"
  const targetId = url.searchParams.get("targetId") ?? ""
  const limit = Number(url.searchParams.get("limit")) || 50

  if (!targetId) {
    return NextResponse.json({ entries: [] })
  }

  const entries = await readHardwareHistory(targetType, targetId, limit)
  return NextResponse.json({ entries })
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`inventory-history:${ip}`, 20, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const body = (await request.json()) as HardwareHistoryEntry

  if (!body.targetType || !body.targetId || !body.fieldName) {
    return NextResponse.json({ ok: false, message: "Data tidak lengkap." }, { status: 400 })
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
  const entry: HardwareHistoryEntry = {
    ...body,
    timestamp: body.timestamp || timestamp,
    actor: auth.session.username,
  }

  await insertHardwareHistory(entry)
  return NextResponse.json({ ok: true, message: "Riwayat perubahan tersimpan." })
}
