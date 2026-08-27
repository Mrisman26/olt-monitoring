import { NextResponse } from "next/server"

import { disableStartup, enableStartup, getStartupStatus } from "@/lib/startup-server"
import { requireRole, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await requireRole(request, "super-admin")
  if (!auth.ok) return auth.response

  try {
    return NextResponse.json(await getStartupStatus())
  } catch (error) {
    return NextResponse.json(
      {
        enabled: false,
        message: error instanceof Error ? error.message : "Status startup belum bisa dibaca.",
      },
      { status: 400 },
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, "super-admin")
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`startup:${ip}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  try {
    const status = await enableStartup()

    return NextResponse.json({
      ...status,
      message: "Startup otomatis berhasil diaktifkan.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        enabled: false,
        message: error instanceof Error ? error.message : "Startup otomatis gagal diaktifkan.",
      },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request) {
  const auth = await requireRole(request, "super-admin")
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`startup:${ip}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  try {
    const status = await disableStartup()

    return NextResponse.json({
      ...status,
      message: "Startup otomatis berhasil dinonaktifkan.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        enabled: false,
        message: error instanceof Error ? error.message : "Startup otomatis gagal dinonaktifkan.",
      },
      { status: 400 },
    )
  }
}
