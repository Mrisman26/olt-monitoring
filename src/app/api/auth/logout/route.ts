import { NextResponse } from "next/server"
import { destroySession, clearSessionCookie, getSessionTokenFromCookie } from "@/lib/session"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie")
  const token = getSessionTokenFromCookie(cookieHeader)

  if (token) {
    await destroySession(token).catch(() => {})
  }

  const response = NextResponse.json({ ok: true, message: "Logout berhasil." })
  response.headers.append("Set-Cookie", clearSessionCookie())
  return response
}
