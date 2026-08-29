import { readMonitoringStateLite } from "@/lib/server-db"
import { isPollingOlt, pollOltAndSave } from "@/lib/polling"

const workerTickMs = 2000

type PollingWorkerGlobal = typeof globalThis & {
  __mikroinPollingWorkerStarted?: boolean
}

export function startPollingWorker() {
  const globalState = globalThis as PollingWorkerGlobal
  if (globalState.__mikroinPollingWorkerStarted) return
  globalState.__mikroinPollingWorkerStarted = true

  const lastPolledAt = new Map<string, number>()

  async function tick() {
    try {
      const state = await readMonitoringStateLite()
      const now = Date.now()

      await Promise.all(
        state.olts.map(async (olt) => {
          const intervalSeconds = Math.max(5, Number(olt.pollingInterval) || 15)
          const intervalMs = intervalSeconds * 1000
          const lastPolled = lastPolledAt.get(olt.id) ?? 0

          if (now - lastPolled < intervalMs) return
          if (isPollingOlt(olt.id)) return

          lastPolledAt.set(olt.id, now)

          try {
            const result = await pollOltAndSave(olt)
            if (!result.ok) {
              console.warn(`[polling-worker] Polling ${olt.name || olt.ipAddress} gagal: ${result.message}`)
            }
          } catch (error) {
            console.warn(`[polling-worker] Polling ${olt.name || olt.ipAddress} error: ${error instanceof Error ? error.message : error}`)
          }
        }),
      )
    } catch (error) {
      console.warn(`[polling-worker] Siklus polling gagal: ${error instanceof Error ? error.message : error}`)
    }
  }

  void tick()
  setInterval(() => void tick(), workerTickMs)
}
