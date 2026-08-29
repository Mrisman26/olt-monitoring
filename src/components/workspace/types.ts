import type { OidProfileKey } from "@/lib/oid-catalog"
import type { MonitoringState, Olt } from "@/lib/types"

export type View = "dashboard" | "olts" | "onus" | "alerts" | "settings" | "system" | "about"
export type ToastTone = "info" | "success" | "error"
export type ToastState = {
  message: string
  tone: ToastTone
} | null
export type ClearAlertsMode = "acknowledged" | "all"
export type PollOnuNotification = {
  checked: number
  downDetected: number
  recoveryDetected: number
  sent: number
  failed: number
  skipped: boolean
  message: string
}
export type StartupStatus = {
  enabled: boolean
  path?: string
  platform?: string
  supported?: "automatic" | "manual" | "unsupported"
  message?: string
  linux?: {
    serviceName: string
    servicePath: string
    service: string
    commands: string[]
    disableCommands: string[]
  } | null
}
export type OltForm = {
  name: string
  ipAddress: string
  vendor: Olt["vendor"]
  snmpPort: string
  readCommunity: string
  writeCommunity: string
  oidProfile: OidProfileKey
  pollingInterval: string
  cardName: string
  writeMode: Olt["writeMode"]
  cliPort: string
  cliUsername: string
  cliPassword: string
}
export type TrafficRange = "1h" | "6h" | "24h" | "7d" | "30d"
export type RxPowerRange = "1h" | "6h" | "24h" | "7d" | "30d"
export type SignalTone = "good" | "warning" | "critical" | "empty"
export type OltAccent = {
  card: string
  selectedCard: string
  icon: string
  strip: string
  tile: string
  label: string
}

export const legacyStorageKey = "mikroin-monitor-state-v2"

export const panelClass = "premium-card rounded-2xl p-5"
export const tableShellClass = "mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60"
export const fieldClass =
  "mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)]"
export const secondaryButtonClass =
  "inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--muted)] shadow-sm transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-45"
export const cyanButtonClass =
  "inline-flex h-9 items-center gap-2 rounded-xl border border-teal-600/25 bg-teal-600/10 px-3 text-xs font-semibold text-teal-800 transition hover:bg-teal-600/20 disabled:cursor-not-allowed disabled:opacity-50"

export const emptyState: MonitoringState = {
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

export const emptyForm: OltForm = {
  name: "",
  ipAddress: "",
  vendor: "VSOL",
  snmpPort: "161",
  readCommunity: "public",
  writeCommunity: "",
  oidProfile: "vsol-gpon",
  pollingInterval: "15",
  cardName: "GTGH",
  writeMode: "none",
  cliPort: "23",
  cliUsername: "",
  cliPassword: "",
}
