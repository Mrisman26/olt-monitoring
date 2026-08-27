export const SESSION_COOKIE = "mikroin-session"

export function buildSessionCookieValue(token: string, maxAgeMs: number): string {
  const maxAge = Math.floor(maxAgeMs / 1000)
  const isProd = process.env.NODE_ENV === "production"
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${isProd ? "; Secure" : ""}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`
}

export function getSessionTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(";")
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split("=")
    if (name === SESSION_COOKIE) {
      return rest.join("=")
    }
  }
  return null
}
