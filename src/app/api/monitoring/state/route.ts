import { NextResponse } from "next/server"

import { emptyMonitoringState, normalizeMonitoringState, readMonitoringState, readMonitoringStateLite, writeMonitoringState } from "@/lib/server-db"
import type { MonitoringState } from "@/lib/types"
import { sanitizeOltArray, sanitizeSettings } from "@/lib/sanitize"
import { requireAuth, requireRole, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const state = await readMonitoringStateLite()

  return NextResponse.json({
    ...state,
    olts: sanitizeOltArray(state.olts),
    settings: sanitizeSettings(state.settings),
  })
}

export async function PUT(request: Request) {
  // Admin boleh mengelola OLT (lihat roleDescriptions), jadi PUT tidak
  // disekat khusus super-admin. Reset total (DELETE) tetap super-admin.
  const auth = await requireRole(request, "admin", "super-admin")
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`state-put:${ip}`, 30, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const body = normalizeMonitoringState((await request.json()) as MonitoringState)
  const current = await readMonitoringState()
  // Klien menerima OLT tanpa field rahasia (disanitasi di GET), jadi pertahankan
  // nilai lama dari database jika payload tidak mengirimnya.
  const mergedOlts = body.olts.map((olt) => {
    const existing = current.olts.find((item) => item.id === olt.id)
    if (!existing) {
      // Flag transien dari sanitasi bukan data; jangan ikut disimpan ke blob DB.
      const { hasCliCredentials: _cli, hasSnmpWrite: _snmp, ...clean } = olt
      return clean
    }
    const merged = {
      ...existing,
      ...olt,
      readCommunity: olt.readCommunity?.trim() || existing.readCommunity,
      writeCommunity: olt.writeCommunity?.trim() || existing.writeCommunity || "",
      cliUsername: olt.cliUsername?.trim() || existing.cliUsername || "",
      cliPassword: olt.cliPassword || existing.cliPassword || "",
    }
    delete merged.hasCliCredentials
    delete merged.hasSnmpWrite
    return merged
  })
  const mergedState = {
    ...body,
    olts: mergedOlts,
    onus: body.onus.length > 0 ? body.onus : current.onus,
    settings: {
      telegram: {
        ...body.settings.telegram,
        // GET mengirim token termask sebagai "••••••••"; jangan biarkan mask
        // menimpa token asli di database.
        botToken:
          body.settings.telegram.botToken && body.settings.telegram.botToken !== "••••••••"
            ? body.settings.telegram.botToken
            : current.settings.telegram.botToken,
      },
    },
  }
  const state = await writeMonitoringState(mergedState, current)

  return NextResponse.json({ ...state, onus: [] })
}

export async function DELETE(request: Request) {
  const auth = await requireRole(request, "super-admin")
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`state-delete:${ip}`, 3, 300_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const state = await writeMonitoringState(emptyMonitoringState)

  return NextResponse.json(state)
}
