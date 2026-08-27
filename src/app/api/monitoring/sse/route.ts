import { readMonitoringState, readMonitoringStateLite } from "@/lib/server-db"
import { buildOperationalAlerts } from "@/lib/operational-alerts"
import { sanitizeOltArray, sanitizeSettings } from "@/lib/sanitize"
import { requireAuth } from "@/lib/api-auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval> | null = null
  let keepAliveId: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      async function tick() {
        try {
          const state = await readMonitoringStateLite()
          const fullState = await readMonitoringState()
          const onlineOlts = state.olts.filter((olt) => olt.status === "online").length
          const totalOnu = fullState.onus.length
          const downOnu = fullState.onus.filter((onu) => onu.status !== "online").length
          const operationalAlerts = buildOperationalAlerts(state.olts, fullState.onus, state.alerts)
          const openAlerts = operationalAlerts.filter((alert) => !alert.acknowledged).length

          const payload = {
            olts: sanitizeOltArray(state.olts),
            onus: fullState.onus,
            alerts: state.alerts,
            settings: sanitizeSettings(state.settings),
            summary: { onlineOlts, totalOnu, downOnu, openAlerts },
            operationalAlerts,
          }

          controller.enqueue(encoder.encode(`event: state\ndata: ${JSON.stringify(payload)}\n\n`))
        } catch {
          if (controller.desiredSize === null) {
            if (intervalId) clearInterval(intervalId)
            if (keepAliveId) clearInterval(keepAliveId)
            return
          }
          try {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "Gagal membaca data" })}\n\n`))
          } catch {
            // controller closed during enqueue
          }
        }
      }

      await tick()
      intervalId = setInterval(() => void tick(), 3000)
      keepAliveId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"))
        } catch {
          // controller closed
        }
      }, 15000)
    },
    cancel() {
      if (intervalId) clearInterval(intervalId)
      if (keepAliveId) clearInterval(keepAliveId)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
