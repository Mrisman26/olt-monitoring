import { NextResponse } from "next/server"

import { pollOltAndSave } from "@/lib/polling"
import { mergeOltWithSecrets } from "@/lib/server-db"
import type { Olt } from "@/lib/types"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`poll-onu:${ip}`, 20, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const requestedOlt = (await request.json()) as Olt
  const olt = (await mergeOltWithSecrets(requestedOlt)) as Olt
  const result = await pollOltAndSave(olt)

  return NextResponse.json(result, { status: 200 })
}
