import { NextResponse } from "next/server"

import { readMonitoringState, writeMonitoringState } from "@/lib/server-db"
import { processTelegramUpdates } from "@/lib/telegram"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`telegram-poll:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const state = await readMonitoringState()
  const result = await processTelegramUpdates(state)

  if (result.state !== state) {
    await writeMonitoringState(result.state, state)
  }

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    message: result.message,
  })
}
