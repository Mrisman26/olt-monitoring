import { NextResponse } from "next/server"
import { z } from "zod"

import { isFirstTimeSetup } from "@/lib/auth-db"
import { authenticateUser } from "@/lib/auth-server"
import { createDbSession, buildSessionCookieValue } from "@/lib/session"
import { sessionDurationMs } from "@/lib/auth-types"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/api-auth"

export const runtime = "nodejs"

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
})

export async function POST(request: Request) {
  const isFirstTime = await isFirstTimeSetup()
  if (isFirstTime) {
    return NextResponse.json(
      { ok: false, message: "Belum ada akun. Silakan buat akun Super Admin terlebih dahulu.", setupRequired: true },
      { status: 403 },
    )
  }

  const parsed = loginSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Username dan password wajib diisi." },
      { status: 400 },
    )
  }

  const ip = getClientIp(request)
  const rateKey = `login:${ip}`

  const { allowed, retryAfterMs } = checkRateLimit(rateKey, 5, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const userAgent = request.headers.get("user-agent") || null
  const session = await authenticateUser(parsed.data.username, parsed.data.password)

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Username atau password salah." },
      { status: 401 },
    )
  }

  const token = await createDbSession(session, ip, userAgent)
  const cookieHeader = buildSessionCookieValue(token, sessionDurationMs)

  const response = NextResponse.json({
    ok: true,
    message: "Login berhasil.",
    session,
  })

  response.headers.append("Set-Cookie", cookieHeader)
  return response
}
