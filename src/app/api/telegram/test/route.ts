import { NextResponse } from "next/server"

import { sendTelegramTest } from "@/lib/telegram"
import type { TelegramSettings } from "@/lib/types"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`telegram-test:${ip}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const settings = (await request.json()) as TelegramSettings
  const result = await sendTelegramTest(settings)

  return NextResponse.json(result)
}
