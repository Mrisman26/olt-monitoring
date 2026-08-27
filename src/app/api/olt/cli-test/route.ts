import { NextResponse } from "next/server"

import { testCliConnection } from "@/lib/cli"
import { mergeOltWithSecrets } from "@/lib/server-db"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`cli-test:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const body = await request.json()
  const olt = await mergeOltWithSecrets(body)
  const result = await testCliConnection(olt)

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
