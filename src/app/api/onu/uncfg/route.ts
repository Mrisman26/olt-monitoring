import { NextResponse } from "next/server"

import { getUncfgOnuViaTelnet } from "@/lib/cli"
import { resolveOltWithSecrets } from "@/lib/server-db"
import type { Olt } from "@/lib/types"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`onu-uncfg:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const body = (await request.json()) as { olt: Olt }
  const olt = await resolveOltWithSecrets(body.olt)

  if (!olt || olt.writeMode !== "cli" || !olt.cliUsername?.trim() || !olt.cliPassword?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Menampilkan ONU unconfigured memerlukan mode CLI dengan username & password yang valid.", entries: [] },
      { status: 400 },
    )
  }

  const result = await getUncfgOnuViaTelnet(olt)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
