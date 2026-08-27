import { NextResponse } from "next/server"
import { z } from "zod"

import { isFirstTimeSetup } from "@/lib/auth-db"
import { createUser } from "@/lib/auth-server"
import { checkRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/api-auth"

export const runtime = "nodejs"

const setupSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, garis bawah, atau strip."),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8, "Password minimal 8 karakter."),
})

export async function GET() {
  const isFirstTime = await isFirstTimeSetup()
  return NextResponse.json({ isFirstTime })
}

export async function POST(request: Request) {
  const isFirstTime = await isFirstTimeSetup()
  if (!isFirstTime) {
    return NextResponse.json(
      { ok: false, message: "Setup sudah dilakukan. Gunakan menu manajemen user untuk membuat akun baru." },
      { status: 403 },
    )
  }

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`setup:${ip}`, 3, 300_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const parsed = setupSchema.safeParse(await request.json())
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ")
    return NextResponse.json({ ok: false, message }, { status: 400 })
  }

  const { username, name, password } = parsed.data

  const result = await createUser({
    username,
    name,
    password,
    role: "super-admin",
    actor: "system-setup",
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
