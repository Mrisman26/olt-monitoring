import { readMonitoringState, writeMonitoringState, insertTrafficSamples, cleanupOldTraffic, insertRxPowerSamples, cleanupOldRxPower, insertOnuStatusLog, cleanupOldOnuStatusLog, historyEnabled } from "@/lib/server-db"
import { pollOnusFromOlt, pollTrafficCounters, type IfTrafficCounters } from "@/lib/snmp"
import { notifyOltStatusChange, notifyOnuStatusChanges } from "@/lib/telegram"
import type { Alert, MonitoringState, Olt, Onu, TrafficSample, RxPowerSample } from "@/lib/types"

const activePolls = new Set<string>()

const prevTrafficCounters = new Map<string, { counters: IfTrafficCounters; timestamp: number }>()
let trafficCleanupCounter = 0
let rxPowerCleanupCounter = 0
let onuStatusLogCleanupCounter = 0

export function isPollingOlt(oltId: string) {
  return activePolls.has(oltId)
}

export type PollOnuNotification = {
  checked?: number
  downDetected?: number
  recoveryDetected?: number
  sent: number
  failed: number
  skipped: boolean
  message: string
}

export type PollOltResult = {
  ok: boolean
  message: string
  onus?: Onu[]
  notification?: PollOnuNotification
  state?: MonitoringState
}

function formatRxPower(value: number) {
  if (!Number.isFinite(value) || value === 0) return "-"
  return `${value} dBm`
}

function formatTemperature(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-"
  return `${value} °C`
}

function buildOnuAlertDetail(onu: Onu, olt: Olt, eventTime: string, eventLabel: string) {
  return [
    `Nama pelanggan: ${onu.name}`,
    `OLT: ${olt.name}`,
    `PON: ${onu.ponPort}:${onu.onuIndex}`,
    `Serial: ${onu.serialNumber || "-"}`,
    `Status: ${onu.status}`,
    `RX: ${formatRxPower(onu.rxPower)}`,
    `Suhu: ${formatTemperature(onu.temperatureC)}`,
    `Kasus Down: ${onu.status === "online" ? "-" : onu.downReason || "Down"}`,
    `Last Seen: ${onu.lastSeen}`,
    `Event: ${eventLabel}`,
    `Waktu Event: ${eventTime}`,
  ].join(" | ")
}

function latestSavedOnuEvent(state: MonitoringState, onuId: string) {
  const latest = state.alerts.find((alert) => alert.id.startsWith(`onu-${onuId}-down-`) || alert.id.startsWith(`onu-${onuId}-recovery-`))
  if (!latest) return null
  if (latest.id.startsWith(`onu-${onuId}-down-`)) return "down"
  if (latest.id.startsWith(`onu-${onuId}-recovery-`)) return "recovery"
  return null
}

function latestSavedOltEvent(state: MonitoringState, oltId: string) {
  const latest = state.alerts.find((alert) => alert.id.startsWith(`olt-${oltId}-down-`) || alert.id.startsWith(`olt-${oltId}-recovery-`))
  if (!latest) return null
  if (latest.id.startsWith(`olt-${oltId}-down-`)) return "down"
  if (latest.id.startsWith(`olt-${oltId}-recovery-`)) return "recovery"
  return null
}

function buildOltAlertDetail(olt: Olt, eventTime: string, eventLabel: string, errorMessage?: string) {
  return [
    `Nama OLT: ${olt.name}`,
    `IP: ${olt.ipAddress}:${olt.snmpPort || 161}`,
    `Vendor: ${olt.vendor}`,
    `Tipe: ${olt.model || "-"}`,
    `Lokasi: ${olt.location || "-"}`,
    `Event: ${eventLabel}`,
    errorMessage ? `Error: ${errorMessage}` : null,
    `Waktu Event: ${eventTime}`,
  ]
    .filter(Boolean)
    .join(" | ")
}

function buildOltTransitionAlert(state: MonitoringState, olt: Olt, status: "down" | "recovery", errorMessage?: string) {
  if (latestSavedOltEvent(state, olt.id) === status) return null

  const eventTime = new Date().toLocaleString("id-ID")

  return {
    id: `olt-${olt.id}-${status}-${Date.now()}`,
    oltId: olt.id,
    title: status === "down" ? `OLT down: ${olt.name}` : `OLT recovery: ${olt.name}`,
    detail: buildOltAlertDetail(olt, eventTime, status === "down" ? "Down terdeteksi" : "Recovery terdeteksi", errorMessage),
    severity: status === "down" ? ("critical" as const) : ("info" as const),
    createdAt: eventTime,
    acknowledged: status === "recovery",
  }
}

function buildTransitionAlerts(state: MonitoringState, olt: Olt, nextOnus: Onu[]) {
  const previousById = new Map(state.onus.filter((onu) => onu.oltId === olt.id).map((onu) => [onu.id, onu]))
  const eventTime = new Date().toLocaleString("id-ID")
  const alerts: Alert[] = []
  const recoveredOnuIds: string[] = []

  for (const onu of nextOnus) {
    const previous = previousById.get(onu.id)
    if (!previous) continue

    const wasOnline = previous.status === "online"
    const isOnline = onu.status === "online"

    if (wasOnline && !isOnline) {
      if (latestSavedOnuEvent(state, onu.id) === "down") continue

      alerts.push({
        id: `onu-${onu.id}-down-${Date.now()}`,
        oltId: olt.id,
        title: `ONT down: ${onu.name}`,
        detail: buildOnuAlertDetail(onu, olt, eventTime, "Down terdeteksi"),
        severity: "critical",
        createdAt: eventTime,
        acknowledged: false,
      })
      continue
    }

    if (!wasOnline && isOnline) {
      if (latestSavedOnuEvent(state, onu.id) === "recovery") continue

      recoveredOnuIds.push(onu.id)
      alerts.push({
        id: `onu-${onu.id}-recovery-${Date.now()}`,
        oltId: olt.id,
        title: `ONT recovery: ${onu.name}`,
        detail: buildOnuAlertDetail(onu, olt, eventTime, "Recovery terdeteksi"),
        severity: "info",
        createdAt: eventTime,
        acknowledged: true,
      })
    }
  }

  return { alerts, recoveredOnuIds }
}

function keepLocalVsolNames(state: MonitoringState, olt: Olt, nextOnus: Onu[]) {
  if (olt.oidProfile !== "vsol-gpon") return nextOnus

  const previousById = new Map(state.onus.filter((onu) => onu.oltId === olt.id).map((onu) => [onu.id, onu]))

  return nextOnus.map((onu) => {
    const previous = previousById.get(onu.id)
    const shouldKeepLocalName =
      previous &&
      previous.name &&
      previous.name !== onu.name &&
      (previous.syncStatus === "pending" || previous.syncStatus === "local-only")

    if (!shouldKeepLocalName) return onu

    return {
      ...onu,
      name: previous.name,
      syncStatus: previous.syncStatus,
    }
  })
}

export async function pollOltAndSave(requestedOlt: Olt): Promise<PollOltResult> {
  const lockKey = requestedOlt.id || `${requestedOlt.ipAddress}:${requestedOlt.snmpPort || 161}`

  if (activePolls.has(lockKey)) {
    return {
      ok: false,
      message: `Polling ${requestedOlt.name || requestedOlt.ipAddress} masih berjalan. Request dobel dilewati agar notifikasi tidak berulang.`,
      onus: [],
    }
  }

  activePolls.add(lockKey)

  try {
    const initialState = await readMonitoringState()
    const savedOlt = initialState.olts.find((item) => item.id === requestedOlt.id)

    if (requestedOlt.id && !savedOlt) {
      return {
        ok: false,
        message: `${requestedOlt.name || requestedOlt.ipAddress} sudah tidak ada di database. Hasil polling lama dilewati.`,
        onus: [],
      }
    }

    const pollingOlt = savedOlt ?? requestedOlt
    const result = await pollOnusFromOlt(pollingOlt)
    const state = await readMonitoringState()
    const olt = state.olts.find((item) => item.id === pollingOlt.id)

    if (!olt) {
      return {
        ok: false,
        message: `${pollingOlt.name || pollingOlt.ipAddress} sudah dihapus. Hasil polling tidak disimpan agar data lama tidak muncul lagi.`,
        onus: [],
        state: { ...state, onus: [] },
      }
    }

    if (result.ok) {
      const oltWasOffline = state.olts.find((item) => item.id === olt.id)?.status === "offline"
      const polledOnus = keepLocalVsolNames(state, olt, result.onus ?? [])
      let notification: PollOnuNotification = {
        checked: polledOnus.length,
        downDetected: 0,
        recoveryDetected: 0,
        sent: 0,
        failed: 0,
        skipped: false,
        message: "Notifikasi Telegram belum dicek.",
      }

      try {
        if (oltWasOffline) {
          const oltNotification = await notifyOltStatusChange(state, olt, "recovery")
          notification.sent += oltNotification.sent
          notification.failed += oltNotification.failed
          if (oltNotification.sent > 0 || oltNotification.failed > 0) notification.message = oltNotification.message
        }
        const onuNotification = await notifyOnuStatusChanges(state, olt, polledOnus)
        notification = {
          ...onuNotification,
          sent: notification.sent + onuNotification.sent,
          failed: notification.failed + onuNotification.failed,
          message:
            notification.sent > 0 || notification.failed > 0
              ? `${notification.message} ${onuNotification.sent > 0 || onuNotification.failed > 0 ? onuNotification.message : ""}`.trim()
              : onuNotification.message,
        }
      } catch (error) {
        // Notification failure should not break SNMP polling.
        notification = {
          ...notification,
          failed: notification.failed + 1,
          message: error instanceof Error ? `Telegram gagal: ${error.message}` : "Telegram gagal mengirim notifikasi.",
        }
      }

      const transition = buildTransitionAlerts(state, olt, polledOnus)

      if (historyEnabled()) {
        try {
          const now = new Date().toISOString().slice(0, 19).replace("T", " ")
          const previousById = new Map(state.onus.filter((onu) => onu.oltId === olt.id).map((onu) => [onu.id, onu]))
          for (const onu of polledOnus) {
            const previous = previousById.get(onu.id)
            if (!previous) continue
            const wasOnline = previous.status === "online"
            const isOnline = onu.status === "online"
            if (wasOnline === isOnline) continue
            await insertOnuStatusLog({
              onuId: onu.id,
              oltId: olt.id,
              status: isOnline ? "online" : "offline",
              cause: isOnline ? null : (onu.downReason || null),
              timestamp: now,
            })
          }
          onuStatusLogCleanupCounter++
          if (onuStatusLogCleanupCounter >= 30) {
            onuStatusLogCleanupCounter = 0
            void cleanupOldOnuStatusLog(90)
          }
        } catch (statusLogError) {
          console.warn(`[polling] Status log gagal untuk ${olt.name}: ${statusLogError instanceof Error ? statusLogError.message : statusLogError}`)
        }
      }
      const oltRecoveryAlert = oltWasOffline ? buildOltTransitionAlert(state, olt, "recovery") : null
      const acknowledgedOldAlerts = state.alerts.map((alert) =>
        transition.recoveredOnuIds.some((onuId) => alert.id.startsWith(`onu-${onuId}-down-`)) || (oltWasOffline && alert.id.startsWith(`olt-${olt.id}-down-`))
          ? { ...alert, acknowledged: true }
          : alert,
      )
      const nextOnus = [...state.onus.filter((onu) => onu.oltId !== olt.id), ...polledOnus]
      const nextState = {
        ...state,
        onus: nextOnus,
        alerts: [...(oltRecoveryAlert ? [oltRecoveryAlert] : []), ...transition.alerts, ...acknowledgedOldAlerts].slice(0, 300),
        olts: state.olts.map((item) =>
          item.id === olt.id
            ? {
                ...item,
                status: "online" as const,
                activeOnu: polledOnus.filter((onu) => onu.status === "online").length,
                lastSeen: "Baru saja",
                uptime: result.uptime ?? item.uptime,
              }
            : item,
        ),
      }
      const savedState = await writeMonitoringState(nextState, state)

      if (historyEnabled()) {
        try {
          const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
          const counters = await pollTrafficCounters(olt, polledOnus)
          const now = Date.now()
          const samples: TrafficSample[] = []
          const MAX_BPS = 2_500_000_000
          const MIN_ELAPSED_SEC = 10

          for (const [onuId, current] of counters) {
            const key = `${olt.id}:${onuId}`
            const prev = prevTrafficCounters.get(key)

            if (prev) {
              const elapsedSec = (now - prev.timestamp) / 1000
              if (elapsedSec >= MIN_ELAPSED_SEC) {
                const deltaIn = current.inOctets - prev.counters.inOctets
                const deltaOut = current.outOctets - prev.counters.outOctets
                if (deltaIn < 0n || deltaOut < 0n) {
                  prevTrafficCounters.set(key, { counters: current, timestamp: now })
                  continue
                }
                const elapsed = BigInt(Math.round(elapsedSec))
                const inBps = Number(deltaIn * 8n / elapsed)
                const outBps = Number(deltaOut * 8n / elapsed)
                const inPps = Number((current.inPkts - prev.counters.inPkts) / elapsed)
                const outPps = Number((current.outPkts - prev.counters.outPkts) / elapsed)

                samples.push({
                  onuId,
                  oltId: olt.id,
                  timestamp,
                  inputBps: Math.min(MAX_BPS, Math.max(0, inBps)),
                  outputBps: Math.min(MAX_BPS, Math.max(0, outBps)),
                  inputPps: Math.max(0, inPps),
                  outputPps: Math.max(0, outPps),
                })
              }
            }

            prevTrafficCounters.set(key, { counters: current, timestamp: now })
          }

          if (samples.length > 0) {
            await insertTrafficSamples(samples)
          }

          trafficCleanupCounter++
          if (trafficCleanupCounter >= 30) {
            trafficCleanupCounter = 0
            await cleanupOldTraffic(30)
          }
        } catch (trafficError) {
          console.warn(`[polling] Traffic polling gagal untuk ${olt.name}: ${trafficError instanceof Error ? trafficError.message : trafficError}`)
        }
      }

      if (historyEnabled()) {
        try {
          const rxPowerSamples: RxPowerSample[] = []
          const rxTimestamp = new Date().toISOString().slice(0, 19).replace("T", " ")

          for (const onu of polledOnus) {
            const rxVal = typeof onu.rxPower === "number" ? onu.rxPower : parseFloat(String(onu.rxPower))
            const txVal = typeof onu.txPower === "number" ? onu.txPower : parseFloat(String(onu.txPower))

            if (!Number.isFinite(rxVal) && !Number.isFinite(txVal)) continue

            rxPowerSamples.push({
              oltId: olt.id,
              onuId: onu.id,
              rxPower: Number.isFinite(rxVal) ? rxVal : 0,
              txPower: Number.isFinite(txVal) ? txVal : 0,
              timestamp: rxTimestamp,
            })
          }

          if (rxPowerSamples.length > 0) {
            await insertRxPowerSamples(rxPowerSamples)
          }

          rxPowerCleanupCounter++
          if (rxPowerCleanupCounter >= 30) {
            rxPowerCleanupCounter = 0
            await cleanupOldRxPower(30)
          }
        } catch (rxError) {
          console.warn(`[polling] RX power recording gagal untuk ${olt.name}: ${rxError instanceof Error ? rxError.message : rxError}`)
        }
      }

      return { ok: true, message: result.message, onus: polledOnus, state: { ...savedState, onus: [] }, notification }
    }

    const oltDownAlert = buildOltTransitionAlert(state, olt, "down", result.message)
    let notification = {
      sent: 0,
      failed: 0,
      skipped: false,
      message: "Notifikasi OLT belum dicek.",
    }

    try {
      notification = await notifyOltStatusChange(state, olt, "down", result.message)
    } catch (error) {
      notification = {
        ...notification,
        failed: notification.failed + 1,
        message: error instanceof Error ? `Telegram gagal: ${error.message}` : "Telegram gagal mengirim notifikasi OLT.",
      }
    }

    const nextState = {
      ...state,
      alerts: [...(oltDownAlert ? [oltDownAlert] : []), ...state.alerts].slice(0, 300),
      olts: state.olts.map((item) =>
        item.id === olt.id
          ? {
              ...item,
              status: "offline" as const,
              lastSeen: `Gagal: ${new Date().toLocaleString("id-ID")}`,
            }
          : item,
      ),
    }
    const savedState = await writeMonitoringState(nextState, state)

    return { ok: false, message: result.message, onus: [], state: { ...savedState, onus: [] }, notification }
  } finally {
    activePolls.delete(lockKey)
  }
}
