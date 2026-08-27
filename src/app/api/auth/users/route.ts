import { NextResponse } from "next/server"
import { z } from "zod"

import { createUser, deleteUser, listAuthData, updateUser } from "@/lib/auth-server"
import type { AppRole } from "@/lib/auth-types"
import { requireRole, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(6),
  role: z.enum(["admin", "super-admin"]),
})

const updateUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/),
  name: z.string().trim().min(1).max(100),
  role: z.enum(["admin", "super-admin"]),
  password: z.string().min(6).optional(),
})

const deleteUserSchema = z.object({
  id: z.string().min(1),
})

export async function GET(request: Request) {
  const auth = await requireRole(request, "super-admin")
  if (!auth.ok) return auth.response

  return NextResponse.json(await listAuthData())
}

export async function POST(request: Request) {
  const auth = await requireRole(request, "super-admin")
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`users-create:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const parsed = createUserSchema.safeParse(await request.json())
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ")
    return NextResponse.json({ ok: false, message }, { status: 400 })
  }

  const result = await createUser({ ...parsed.data, actor: auth.session.username })

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}

export async function PUT(request: Request) {
  const auth = await requireRole(request, "super-admin")
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`users-update:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const parsed = updateUserSchema.safeParse(await request.json())
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ")
    return NextResponse.json({ ok: false, message }, { status: 400 })
  }

  const result = await updateUser({ ...parsed.data, actor: auth.session.username })

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}

export async function DELETE(request: Request) {
  const auth = await requireRole(request, "super-admin")
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`users-delete:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const parsed = deleteUserSchema.safeParse(await request.json())
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(", ")
    return NextResponse.json({ ok: false, message }, { status: 400 })
  }

  const result = await deleteUser({ ...parsed.data, actor: auth.session.username })

  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
