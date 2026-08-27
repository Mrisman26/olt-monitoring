import { NextResponse } from "next/server"

import { readMonitoringState, writeMonitoringState, resolveOltWithSecrets } from "@/lib/server-db"
import { renameOnuOnDevice } from "@/lib/snmp"
import { renameOnuViaTelnet } from "@/lib/cli"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`onu-rename:${ip}`, 20, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const body = await request.json()
  const olt = await resolveOltWithSecrets(body.olt)
  if (!olt) {
    return NextResponse.json({ ok: false, message: "OLT tidak ditemukan." }, { status: 400 })
  }
  const result =
    olt.writeMode === "cli"
      ? await renameOnuViaTelnet(olt, body.onu, body.nextName)
      : await renameOnuOnDevice({ ...body, olt })

  if (result.ok && body?.onu?.id) {
    try {
      const state = await readMonitoringState()
      const nextOnus = state.onus.map((item) =>
        item.id === body.onu.id
          ? {
              ...item,
              name: body.nextName,
              syncStatus: result.syncedToDevice ? ("synced" as const) : ("pending" as const),
            }
          : item,
      )
      await writeMonitoringState({ ...state, onus: nextOnus }, state)
    } catch (error) {
      console.error("Rename onu: gagal memperbarui database:", error instanceof Error ? error.message : error)
    }
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
