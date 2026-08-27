import { randomBytes } from "node:crypto"

import type { AuthSession } from "@/lib/auth-types"
import { createSession, getSession, deleteSession, updateSessionActivity, enforceSessionLimit, type SessionData } from "@/lib/auth-db"

export { SESSION_COOKIE, buildSessionCookieValue, clearSessionCookie, getSessionTokenFromCookie } from "@/lib/session-edge"

function generateSessionToken(): string {
  return randomBytes(32).toString("hex")
}

export async function createDbSession(
  session: AuthSession,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<string> {
  const token = generateSessionToken()

  await createSession({
    token,
    userId: session.id,
    username: session.username,
    name: session.name,
    role: session.role,
    ipAddress,
    userAgent,
    createdAt: Date.now(),
    expiresAt: session.expiresAt,
    lastActiveAt: Date.now(),
  })

  await enforceSessionLimit(session.id).catch(() => {})

  return token
}

export async function verifySession(token: string): Promise<AuthSession | null> {
  try {
    const sessionData = await getSession(token)
    if (!sessionData) return null

    await updateSessionActivity(token)

    return {
      id: sessionData.userId,
      username: sessionData.username,
      name: sessionData.name,
      role: sessionData.role,
      expiresAt: sessionData.expiresAt,
    }
  } catch {
    return null
  }
}

export async function destroySession(token: string): Promise<void> {
  await deleteSession(token)
}
