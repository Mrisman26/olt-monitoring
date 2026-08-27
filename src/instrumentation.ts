export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    const [{ initMonitoringDb }, { initAuthDb }, { startTelegramBotWorker }, { startPollingWorker }, { startSessionCleanupWorker }] = await Promise.all([
      import("@/lib/server-db"),
      import("@/lib/auth-db"),
      import("@/lib/telegram-worker"),
      import("@/lib/polling-worker"),
      import("@/lib/session-cleanup-worker"),
    ])

    initMonitoringDb().catch((error) => {
      console.error("[instrumentation] Inisialisasi database monitoring gagal:", error instanceof Error ? error.message : error)
    })
    initAuthDb().catch((error) => {
      console.error("[instrumentation] Inisialisasi database auth gagal:", error instanceof Error ? error.message : error)
    })
    startTelegramBotWorker()
    startPollingWorker()
    startSessionCleanupWorker()
  }
}
