import { NextRequest, NextResponse } from "next/server"
import { getSessionTokenFromCookie } from "@/lib/session-edge"

const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/api/auth/login",
  "/api/auth/setup",
  "/_next/",
  "/favicon.ico",
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const cookieHeader = request.headers.get("cookie")
  const token = getSessionTokenFromCookie(cookieHeader)

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
