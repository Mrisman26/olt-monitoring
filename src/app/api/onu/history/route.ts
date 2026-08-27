import { NextResponse } from "next/server"

import { getOnuHistoryViaTelnet } from "@/lib/cli"
import { readOnuStatusLog, resolveOltWithSecrets } from "@/lib/server-db"
import type { RebootOnuRequest } from "@/lib/types"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`onu-history:${ip}`, 15, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const body = (await request.json()) as RebootOnuRequest
  const olt = await resolveOltWithSecrets(body.olt)
  if (!olt) {
    return NextResponse.json({ ok: false, message: "OLT tidak ditemukan.", dbHistory: [] }, { status: 400 })
  }
  const [telnetResult, dbHistory] = await Promise.all([
    getOnuHistoryViaTelnet(olt, body.onu),
    readOnuStatusLog(body.onu.id, 200),
  ])

  return NextResponse.json(
    {
      ...telnetResult,
      dbHistory,
    },
    { status: telnetResult.ok || dbHistory.length > 0 ? 200 : 400 },
  )
}
