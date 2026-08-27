import { cleanupExpiredSessions } from "@/lib/auth-db"

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

type MikroinGlobal = typeof globalThis & {
  __mikroinSessionCleanupStarted?: boolean
}

export function startSessionCleanupWorker() {
  const globalState = globalThis as MikroinGlobal
  if (globalState.__mikroinSessionCleanupStarted) return
  globalState.__mikroinSessionCleanupStarted = true

  async function cleanup() {
    try {
      const deleted = await cleanupExpiredSessions()
      if (deleted > 0) {
        console.log(`[session-cleanup] ${deleted} session expired dihapus.`)
      }
    } catch (error) {
      console.warn(error instanceof Error ? `Session cleanup gagal: ${error.message}` : "Session cleanup gagal.")
    }
  }

  void cleanup()
  setInterval(() => void cleanup(), CLEANUP_INTERVAL_MS)
}
