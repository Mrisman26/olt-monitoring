import { NextResponse } from "next/server"

import { verifySession, getSessionTokenFromCookie } from "@/lib/session"
import type { AppRole, AuthSession } from "@/lib/auth-types"

export type ApiAuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; response: NextResponse }

export async function getApiSession(request: Request): Promise<AuthSession | null> {
  const cookieHeader = request.headers.get("cookie")
  const token = getSessionTokenFromCookie(cookieHeader)
  if (!token) return null
  return verifySession(token)
}

export async function requireAuth(request: Request): Promise<ApiAuthResult> {
  const session = await getApiSession(request)
  if (!session) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) }
  }
  return { ok: true, session }
}

export async function requireRole(request: Request, ...roles: AppRole[]): Promise<ApiAuthResult> {
  const result = await requireAuth(request)
  if (!result.ok) return result

  if (!roles.includes(result.session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "Akses ditolak. Role anda tidak memiliki izin." },
        { status: 403 },
      ),
    }
  }

  return result
}

export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"
}
