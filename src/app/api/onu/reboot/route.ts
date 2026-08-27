import { NextResponse } from "next/server"

import { rebootOnuOnDevice } from "@/lib/snmp"
import { rebootOnuViaTelnet } from "@/lib/cli"
import { resolveOltWithSecrets } from "@/lib/server-db"
import type { RebootOnuRequest } from "@/lib/types"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`onu-reboot:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const body = (await request.json()) as RebootOnuRequest
  const olt = await resolveOltWithSecrets(body.olt)
  if (!olt) {
    return NextResponse.json({ ok: false, message: "OLT tidak ditemukan." }, { status: 400 })
  }

  if (olt.writeMode === "cli") {
    const result = await rebootOnuViaTelnet(olt, body.onu)
    return NextResponse.json(result, { status: result.ok ? 200 : 400 })
  }

  const result = await rebootOnuOnDevice({ ...body, olt })
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
