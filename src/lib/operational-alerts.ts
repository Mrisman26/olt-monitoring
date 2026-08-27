import type { Alert, Olt, Onu } from "@/lib/types"

export function formatRxPower(value: number) {
  if (!Number.isFinite(value) || value === 0) return "-"
  return `${value} dBm`
}

export function formatTemperature(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-"
  return `${value} °C`
}

export function buildOnuAlertDetail(onu: Onu, olt: Olt | undefined, extraLine?: string) {
  return [
    `Nama pelanggan: ${onu.name}`,
    `OLT: ${olt?.name ?? "-"}`,
    `PON: ${onu.ponPort}:${onu.onuIndex}`,
    `Serial: ${onu.serialNumber || "-"}`,
    `Status: ${onu.status}`,
    `RX: ${formatRxPower(onu.rxPower)}`,
    `Suhu: ${formatTemperature(onu.temperatureC)}`,
    `Kasus Down: ${onu.status === "online" ? "-" : onu.downReason || "Down"}`,
    `Last Seen: ${onu.lastSeen}`,
    extraLine,
  ]
    .filter(Boolean)
    .join(" | ")
}

export function buildOperationalAlerts(olts: Olt[], onus: Onu[], savedAlerts: Alert[]) {
  const generated: Alert[] = []

  for (const olt of olts) {
    if (olt.status !== "online") {
      generated.push({
        id: `olt-${olt.id}-offline`,
        oltId: olt.id,
        title: `${olt.name} tidak online`,
        detail: `OLT ${olt.ipAddress} belum berhasil dipolling. Cek koneksi, community, atau akses jaringan.`,
        severity: "critical",
        createdAt: olt.lastSeen,
        acknowledged: false,
      })
    }
  }

  for (const onu of onus) {
    const olt = olts.find((item) => item.id === onu.oltId)
    const hasSavedDownAlert = savedAlerts.some((alert) => !alert.acknowledged && alert.id.startsWith(`onu-${onu.id}-down-`))

    if (onu.status !== "online") {
      if (!hasSavedDownAlert) {
        generated.push({
          id: `onu-${onu.id}-down`,
          oltId: onu.oltId,
          title: `ONT down: ${onu.name}`,
          detail: buildOnuAlertDetail(onu, olt),
          severity: "critical",
          createdAt: onu.lastSeen,
          acknowledged: false,
        })
      }
      continue
    }

    if (onu.rxPower <= -27) {
      generated.push({
        id: `onu-${onu.id}-rx-critical`,
        oltId: onu.oltId,
        title: `RX lemah: ${onu.name}`,
        detail: buildOnuAlertDetail(onu, olt, "Catatan: Perlu pengecekan redaman."),
        severity: "warning",
        createdAt: onu.lastSeen,
        acknowledged: false,
      })
    }

    if (onu.temperatureC !== null && onu.temperatureC !== undefined && onu.temperatureC >= 55) {
      generated.push({
        id: `onu-${onu.id}-temperature`,
        oltId: onu.oltId,
        title: `Suhu tinggi: ${onu.name}`,
        detail: buildOnuAlertDetail(onu, olt, "Catatan: Perlu cek modul/lingkungan ONT."),
        severity: "warning",
        createdAt: onu.lastSeen,
        acknowledged: false,
      })
    }
  }

  return [...generated, ...savedAlerts]
}
