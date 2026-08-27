import { NextResponse } from "next/server"

import { applyOnuConfigViaTelnet, getOnuOmciConfigViaTelnet } from "@/lib/cli"
import { resolveOltWithSecrets } from "@/lib/server-db"
import { diffInterfaceConfig, diffOnuMngConfig, parseInterfaceConfig, parseOnuMngConfig, type OnuConfigApplyRequest } from "@/lib/onu-config"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`onu-config:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const body = (await request.json()) as OnuConfigApplyRequest
  const olt = await resolveOltWithSecrets(body.olt)
  if (!olt) {
    return NextResponse.json({ ok: false, message: "OLT tidak ditemukan." }, { status: 400 })
  }

  const current = await getOnuOmciConfigViaTelnet(olt, body.onu)
  if (!current.ok) {
    return NextResponse.json(current, { status: 400 })
  }

  const originalInterface = parseInterfaceConfig(current.interfaceConfig)
  const originalOnuMng = parseOnuMngConfig(current.onuMngConfig)

  const items = [
    ...diffInterfaceConfig(originalInterface, body.interfaceConfig),
    ...diffOnuMngConfig(originalOnuMng, body.onuMngConfig),
  ]

  const result = await applyOnuConfigViaTelnet(olt, body.onu, items, body.interfaceConfig, body.onuMngConfig)

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
