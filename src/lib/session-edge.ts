export const SESSION_COOKIE = "mikroin-session"

export function buildSessionCookieValue(token: string, maxAgeMs: number): string {
  const maxAge = Math.floor(maxAgeMs / 1000)
  const secure = process.env.COOKIE_SECURE === "true"
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`
}

export function clearSessionCookie(): string {
  const secure = process.env.COOKIE_SECURE === "true"
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`
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
