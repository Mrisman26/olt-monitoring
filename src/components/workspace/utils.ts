import type { OidProfileKey } from "@/lib/oid-catalog"
import type { MonitoringState, Olt } from "@/lib/types"
import { legacyStorageKey, type OltAccent, type OltForm, type SignalTone, type StartupStatus } from "./types"

export function supportsSnmpWriteTest(olt: Olt | undefined) {
  return olt?.oidProfile === "hsgq-gpon" || olt?.oidProfile === "zte-c320"
}

export function startupDescription(status: StartupStatus) {
  if (status.platform === "windows") {
    return "Jika aktif, L1V Monitor akan menjalankan server lokal otomatis setelah Windows login."
  }

  if (status.platform === "linux" || status.supported === "manual") {
    return "Linux memakai systemd. Gunakan tombol install otomatis jika server berjalan dengan akses root, atau jalankan command manual di bawah lewat terminal dengan sudo."
  }

  if (status.platform === "macos") {
    return "Platform macOS belum didukung otomatis dari UI. Gunakan service manager bawaan OS jika ingin menjalankan server saat startup."
  }

  return "L1V Monitor akan membaca platform server terlebih dahulu sebelum menampilkan panduan startup yang sesuai."
}

export function startupPlatformLabel(status: StartupStatus) {
  if (status.platform === "windows") return "Windows"
  if (status.platform === "linux") return "Linux"
  if (status.platform === "macos") return "macOS"
  if (status.platform) return status.platform
  if (status.message) return "Belum terbaca"
  return "Memuat..."
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value)
}

export function zteInterfaceName(ponPort: string, onuIndex: string) {
  return `gpon-onu_1/${ponPort}:${onuIndex}`
}

export function profileForVendor(vendor: Olt["vendor"]): OidProfileKey {
  if (vendor === "VSOL") return "vsol-gpon"
  if (vendor === "HSGQ GPON") return "hsgq-gpon"
  if (vendor === "HSGQ EPON") return "hsgq-epon"
  if (vendor === "ZTE") return "zte-c320"
  return "generic"
}

export function formFromOlt(olt: Olt): OltForm {
  return {
    name: olt.name ?? "",
    ipAddress: olt.ipAddress ?? "",
    vendor: olt.vendor ?? "VSOL",
    snmpPort: String(olt.snmpPort || 161),
    readCommunity: olt.readCommunity ?? "",
    writeCommunity: olt.writeCommunity ?? "",
    oidProfile: olt.oidProfile ?? "generic",
    pollingInterval: String(olt.pollingInterval || 60),
    cardName: olt.cardName?.trim() || "GTGH",
    writeMode: olt.writeMode ?? "none",
    cliPort: String(olt.cliPort || 23),
    cliUsername: olt.cliUsername ?? "",
    cliPassword: olt.cliPassword ?? "",
  }
}

const emptyStateForMigration: MonitoringState = {
  olts: [],
  onus: [],
  alerts: [],
  settings: {
    telegram: {
      enabled: false,
      botToken: "",
      chatId: "",
      notifyOntDown: true,
      notifyRecovery: true,
      botPollingEnabled: false,
      lastUpdateId: 0,
    },
  },
}

export function readLegacyBrowserState() {
  const raw = window.localStorage.getItem(legacyStorageKey)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<MonitoringState>
    if (!Array.isArray(parsed.olts) || parsed.olts.length === 0) return null

    return {
      olts: parsed.olts,
      onus: Array.isArray(parsed.onus) ? parsed.onus : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      settings: {
        telegram: {
          ...emptyStateForMigration.settings.telegram,
          ...(parsed.settings?.telegram ?? {}),
        },
      },
    }
  } catch {
    return null
  }
}

export function clearLegacyBrowserState() {
  window.localStorage.removeItem(legacyStorageKey)
}

export function formatRxPower(value: number) {
  if (!Number.isFinite(value) || value === 0) return "-"
  return `${value} dBm`
}

export function formatTemperature(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-"
  return `${value} °C`
}

export function rxTone(value: number): SignalTone {
  if (!Number.isFinite(value) || value === 0) return "empty"
  if (value <= -27 || value >= -8) return "critical"
  if (value <= -25 || value >= -10) return "warning"
  return "good"
}

export function temperatureTone(value: number | null | undefined): SignalTone {
  if (value === null || value === undefined || !Number.isFinite(value)) return "empty"
  if (value >= 60) return "critical"
  if (value >= 55) return "warning"
  return "good"
}

export function infoTileAccent(label: string) {
  const text = label.toLowerCase()

  if (text.includes("nama")) {
    return {
      strip: "from-cyan-400 via-sky-300 to-cyan-200",
      dot: "bg-cyan-400 shadow-cyan-400/50",
      label: "text-cyan-700 dark:text-cyan-200",
      value: "text-cyan-950 dark:text-cyan-50",
    }
  }

  if (text.includes("tipe")) {
    return {
      strip: "from-sky-400 via-blue-300 to-cyan-200",
      dot: "bg-sky-400 shadow-sky-400/50",
      label: "text-sky-700 dark:text-sky-200",
      value: "text-sky-950 dark:text-sky-50",
    }
  }

  if (text.includes("temperatur") || text.includes("suhu")) {
    return {
      strip: "from-amber-300 via-orange-300 to-red-300",
      dot: "bg-amber-400 shadow-amber-400/50",
      label: "text-amber-700 dark:text-amber-200",
      value: "text-amber-950 dark:text-amber-50",
    }
  }

  if (text.includes("lokasi")) {
    return {
      strip: "from-emerald-400 via-teal-300 to-lime-200",
      dot: "bg-emerald-400 shadow-emerald-400/50",
      label: "text-emerald-700 dark:text-emerald-200",
      value: "text-emerald-950 dark:text-emerald-50",
    }
  }

  if (text.includes("uptime")) {
    return {
      strip: "from-violet-400 via-purple-300 to-fuchsia-200",
      dot: "bg-violet-400 shadow-violet-400/50",
      label: "text-violet-700 dark:text-violet-200",
      value: "text-violet-950 dark:text-violet-50",
    }
  }

  return {
    strip: "from-lime-300 via-emerald-300 to-cyan-200",
    dot: "bg-lime-400 shadow-lime-400/50",
    label: "text-lime-700 dark:text-lime-200",
    value: "text-lime-950 dark:text-lime-50",
  }
}

function cleanDisplayValue(value: string | undefined) {
  const text = String(value || "").trim()
  return text && text !== "-" ? text : ""
}

export function friendlySystemValue(olt: Olt, field: "name" | "location") {
  const values = olt.systemInfo ?? {}
  const map = {
    name: values["1.3.6.1.2.1.1.5.0"] || olt.name,
    location: values["1.3.6.1.2.1.1.6.0"] || olt.location,
  }

  return map[field]
}

export function deviceTypeFromSystem(values: Record<string, string> | undefined, fallback: string) {
  return (
    cleanDisplayValue(values?.["1.3.6.1.4.1.50224.3.1.1.19.0"]) ||
    cleanDisplayValue(values?.["1.3.6.1.4.1.37950.1.1.5.10.14.1.0"]) ||
    cleanDisplayValue(values?.["1.3.6.1.2.1.1.1.0"]) ||
    cleanDisplayValue(fallback) ||
    "-"
  )
}

export function deviceLocationFromSystem(values: Record<string, string> | undefined, fallback: string) {
  return cleanDisplayValue(values?.["1.3.6.1.2.1.1.6.0"]) || cleanDisplayValue(fallback) || "-"
}

export function displayDeviceType(olt: Olt) {
  return deviceTypeFromSystem(olt.systemInfo, olt.model)
}

export function displayLocation(olt: Olt) {
  return deviceLocationFromSystem(olt.systemInfo, olt.location)
}

export function oltAccent(olt: Olt) {
  if (olt.oidProfile === "hsgq-epon" || olt.vendor.includes("EPON")) {
    return {
      card:
        "border-emerald-300/60 bg-gradient-to-br from-emerald-50/85 via-white/75 to-teal-50/70 shadow-emerald-950/10 dark:from-emerald-950/45 dark:via-slate-900/70 dark:to-teal-950/45",
      selectedCard:
        "border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 shadow-emerald-900/15 dark:from-emerald-950/55 dark:via-teal-950/45 dark:to-cyan-950/35",
      icon: "bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/25",
      strip: "from-emerald-400 via-teal-300 to-cyan-300",
      tile: "border-emerald-200/80 bg-emerald-50/55 dark:bg-emerald-950/25 dark:border-emerald-300/25",
      label: "text-emerald-700",
    }
  }

  if (olt.oidProfile === "hsgq-gpon" || olt.vendor.includes("GPON")) {
    return {
      card:
        "border-cyan-300/60 bg-gradient-to-br from-cyan-50/85 via-white/75 to-sky-50/70 shadow-cyan-950/10 dark:from-cyan-950/45 dark:via-slate-900/70 dark:to-sky-950/45",
      selectedCard:
        "border-cyan-300 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 shadow-cyan-900/15 dark:from-cyan-950/55 dark:via-sky-950/45 dark:to-blue-950/35",
      icon: "bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950 shadow-cyan-500/25",
      strip: "from-cyan-400 via-sky-300 to-blue-300",
      tile: "border-cyan-200/80 bg-cyan-50/55 dark:bg-cyan-950/25 dark:border-cyan-300/25",
      label: "text-cyan-700",
    }
  }

  return {
    card:
      "border-amber-300/60 bg-gradient-to-br from-amber-50/85 via-white/75 to-orange-50/70 shadow-amber-950/10 dark:from-amber-950/40 dark:via-slate-900/70 dark:to-orange-950/40",
    selectedCard:
      "border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 shadow-amber-900/15 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-yellow-950/30",
    icon: "bg-gradient-to-br from-amber-300 to-orange-400 text-slate-950 shadow-amber-500/25",
    strip: "from-amber-300 via-orange-300 to-yellow-300",
    tile: "border-amber-200/80 bg-amber-50/55 dark:bg-amber-950/25 dark:border-amber-300/25",
    label: "text-amber-700",
  }
}

export function num(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}
