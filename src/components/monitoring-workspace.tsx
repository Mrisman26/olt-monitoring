"use client"

import { useEffect, useRef, useState } from "react"
import { useSse } from "@/lib/sse-provider"
import {
  type Alert,
  type MonitoringState,
  type Olt,
  type Onu,
  type TelegramSettings,
} from "@/lib/types"
import type { OidProfileKey } from "@/lib/oid-catalog"

import { MetricCard } from "@/components/metric-card"
import { ToastNotice } from "./workspace/ui/toast-notice"
import { DeleteOltDialog } from "./workspace/dialogs/delete-olt-dialog"
import { RebootConfirmDialog } from "./workspace/dialogs/reboot-confirm-dialog"
import { BulkRebootDialog } from "./workspace/dialogs/bulk-reboot-dialog"
import { UncfgOnuDialog } from "./workspace/dialogs/uncfg-onu-dialog"
import { DeleteOnuConfirmDialog } from "./workspace/dialogs/delete-onu-confirm-dialog"
import { OnuHistoryDialog } from "./workspace/dialogs/onu-history-dialog"
import { OnuConfigDialog } from "./workspace/dialogs/onu-config-dialog"
import { OnuTrafficDialog } from "./workspace/dialogs/onu-traffic-dialog"
import { ClearAlertsDialog } from "./workspace/dialogs/clear-alerts-dialog"
import { RxPowerHistoryDialog } from "./workspace/dialogs/rx-power-history-dialog"
import { InventoryEditDialog } from "./workspace/dialogs/inventory-edit-dialog"
import { HardwareHistoryDialog } from "./workspace/dialogs/hardware-history-dialog"
import { OltFormPanel } from "./workspace/olt/olt-form-panel"
import { OltListPanel } from "./workspace/olt/olt-list-panel"
import { OnuView } from "./workspace/onu/onu-view"
import { DashboardView } from "./workspace/views/dashboard-view"
import { AlertsView } from "./workspace/views/alerts-view"
import { SettingsView } from "./workspace/views/settings-view"
import { SystemView } from "./workspace/views/system-view"
// import { AboutView } from "./workspace/views/about-view"

import {
  type View,
  type ToastTone,
  type ToastState,
  type ClearAlertsMode,
  type PollOnuNotification,
  type OltForm,
  type StartupStatus,
  emptyState,
  emptyForm,
} from "./workspace/types"
import {
  formatNumber,
  profileForVendor,
  formFromOlt,
  readLegacyBrowserState,
  clearLegacyBrowserState,
  deviceTypeFromSystem,
  deviceLocationFromSystem,
  supportsSnmpWriteTest,
} from "./workspace/utils"
import { StatusBadge } from "@/components/status-badge"

type StartupStatus_ = StartupStatus
type PollOnuNotification_ = PollOnuNotification

const legacyStorageKey = "mikroin-monitor-state-v2"

export function MonitoringWorkspace({ view }: { view: View }) {
  const [storedState, setStoredState] = useState<MonitoringState>(emptyState)
  const [selectedOltId, setSelectedOltId] = useState("")
  const [editingOltId, setEditingOltId] = useState<string | null>(null)
  const [pollingOltId, setPollingOltId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [notice, setNotice] = useState("Memuat database monitoring...")
  const [toast, setToast] = useState<ToastState>(null)
  const [form, setForm] = useState<OltForm>(emptyForm)
  const [deleteCandidate, setDeleteCandidate] = useState<Olt | null>(null)
  const [clearAlertsMode, setClearAlertsMode] = useState<ClearAlertsMode | null>(null)
  const [rebootCandidate, setRebootCandidate] = useState<Onu | null>(null)
  const [bulkRebootCandidates, setBulkRebootCandidates] = useState<Onu[] | null>(null)
  const [deleteOnuCandidate, setDeleteOnuCandidate] = useState<Onu | null>(null)
  const [historyCandidate, setHistoryCandidate] = useState<Onu | null>(null)
  const [configCandidate, setConfigCandidate] = useState<Onu | null>(null)
  const [trafficCandidate, setTrafficCandidate] = useState<Onu | null>(null)
  const [rxPowerCandidate, setRxPowerCandidate] = useState<Onu | null>(null)
  const [inventoryCandidate, setInventoryCandidate] = useState<{ type: "olt" | "onu"; item: Olt | Onu } | null>(null)
  const [hwHistoryCandidate, setHwHistoryCandidate] = useState<{ type: "olt" | "onu"; item: Olt | Onu } | null>(null)
  const [showUncfg, setShowUncfg] = useState(false)
  const stateRef = useRef(storedState)
  const pollingLocksRef = useRef(new Set<string>())
  const { alerts, olts, onus, settings } = storedState
  const [summary, setSummary] = useState({ onlineOlts: 0, totalOnu: 0, downOnu: 0, openAlerts: 0 })
  const [operationalAlerts, setOperationalAlerts] = useState<Alert[]>([])
  const [refreshTick, setRefreshTick] = useState(0)

  const { state: sseState, connected: sseConnected } = useSse()

  function showToast(message: string, tone: ToastTone = "info") {
    setToast({ message, tone })
  }

  const anyDialogOpen = !!(deleteCandidate || clearAlertsMode || rebootCandidate || bulkRebootCandidates || deleteOnuCandidate || historyCandidate || configCandidate || trafficCandidate || showUncfg || rxPowerCandidate || inventoryCandidate || hwHistoryCandidate)

  useEffect(() => {
    if (anyDialogOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [anyDialogOpen])

  useEffect(() => {
    stateRef.current = storedState
  }, [storedState])

  useEffect(() => {
    let cancelled = false

    fetch("/api/monitoring/state")
      .then((response) => response.json() as Promise<MonitoringState>)
      .then((state) => {
        if (cancelled) return
        const legacyState = state.olts.length === 0 ? readLegacyBrowserState() : null
        const nextState = legacyState ?? state

        stateRef.current = nextState
        setStoredState(nextState)
        setSelectedOltId(nextState.olts[0]?.id ?? "")
        setNotice(
          legacyState
            ? "Data OLT lama dari browser berhasil dimigrasikan ke database lokal."
            : nextState.olts.length === 0
              ? "Database awal kosong. Tambahkan OLT untuk mulai monitoring."
              : "Database OLT berhasil dimuat.",
        )

        if (legacyState) {
          void fetch("/api/monitoring/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(legacyState),
          }).then(() => clearLegacyBrowserState())
        } else {
          clearLegacyBrowserState()
        }
      })
      .catch(() => {
        if (!cancelled) setNotice("Database belum bisa dibaca. Coba refresh atau cek server lokal.")
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!toast) return

    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function commitState(nextState: MonitoringState) {
    stateRef.current = nextState
    setStoredState(nextState)
    const response = await fetch("/api/monitoring/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextState),
    })
    if (!response.ok) {
      let message = "Database gagal disimpan."
      try {
        const data = (await response.json()) as { message?: string }
        if (data?.message) message = `Database gagal disimpan: ${data.message}`
      } catch {
        // respons bukan JSON, gunakan pesan default
      }
      throw new Error(message)
    }
    clearLegacyBrowserState()
  }

  function updateTelegramSettings(nextTelegram: TelegramSettings) {
    const nextState = {
      ...storedState,
      settings: {
        ...settings,
        telegram: nextTelegram,
      },
    }

    void commitState(nextState)
    setNotice("Setting Telegram tersimpan.")
  }

  async function testTelegram(settingsToTest: TelegramSettings) {
    setNotice("Mengirim test Telegram...")
    showToast("Mengirim test Telegram...", "info")

    try {
      const response = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsToTest),
      })
      const result = (await response.json()) as { ok?: boolean; message?: string }
      const message = result.message || (response.ok ? "Test Telegram selesai." : "Test Telegram gagal.")

      setNotice(message)
      showToast(message, result.ok ? "success" : "error")
    } catch (error) {
      const message = error instanceof Error ? `Test Telegram gagal: ${error.message}` : "Test Telegram gagal dijalankan."

      setNotice(message)
      showToast(message, "error")
    }
  }

  const selectedOlt = olts.find((olt) => olt.id === selectedOltId) ?? olts[0]

  const onlineOlts = summary.onlineOlts
  const totalOnu = summary.totalOnu
  const downOnu = summary.downOnu
  const openAlerts = summary.openAlerts

  function updateForm<K extends keyof OltForm>(key: K, value: OltForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateVendor(vendor: Olt["vendor"]) {
    setForm((current) => ({ ...current, vendor, oidProfile: profileForVendor(vendor) }))
  }

  async function saveOlt() {
    const name = form.name.trim()
    const ipAddress = form.ipAddress.trim()
    const readCommunity = form.readCommunity.trim()
    const writeCommunity = form.writeCommunity.trim()
    const snmpPort = Number(form.snmpPort) || 161
    const currentState = stateRef.current
    const currentOlts = currentState.olts

    if (!name || !ipAddress || (!editingOltId && !readCommunity)) {
      setNotice("Nama OLT dan IP/host wajib diisi." + (editingOltId ? "" : " Community SNMP juga wajib diisi."))
      return
    }

    const oltPayload = {
      name,
      ipAddress,
      vendor: form.vendor,
      pollingInterval: Number(form.pollingInterval) || 60,
      snmpPort,
      readCommunity,
      writeCommunity,
      oidProfile: form.oidProfile,
      cardName: form.cardName.trim() || "GTGH",
      writeMode: form.writeMode,
      cliPort: Number(form.cliPort) || 23,
      cliUsername: form.cliUsername.trim(),
      cliPassword: form.cliPassword,
    }

    const duplicateOlt = currentOlts.find(
      (olt) => olt.id !== editingOltId && olt.ipAddress.trim() === ipAddress && (olt.snmpPort || 161) === snmpPort,
    )

    if (duplicateOlt) {
      setSelectedOltId(duplicateOlt.id)
      setNotice(`${duplicateOlt.name} sudah memakai IP/host dan port yang sama. Gunakan Edit jika ingin mengubah data OLT tersebut.`)
      return
    }

    if (editingOltId) {
      const nextState = {
        ...currentState,
        olts: currentOlts.map((olt) => (olt.id === editingOltId ? { ...olt, ...oltPayload } : olt)),
      }

      try {
        await commitState(nextState)
        setSelectedOltId(editingOltId)
        setEditingOltId(null)
        setForm(emptyForm)
        setNotice(`${name} berhasil diperbarui.`)
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Database gagal disimpan.")
      }
      return
    }

    const nextOlt: Olt = {
      id: `olt-${Date.now()}`,
      ...oltPayload,
      model: "-",
      location: "-",
      status: "offline",
      uptime: "-",
      cpuLoad: 0,
      memoryLoad: 0,
      ponPorts: 0,
      activeOnu: 0,
      snmpVersion: "v2c",
      lastSeen: "Belum pernah dipolling",
    }
    const nextState = { ...currentState, olts: [...currentOlts, nextOlt] }

    try {
      await commitState(nextState)
      setSelectedOltId(nextOlt.id)
      setForm(emptyForm)
      setNotice(`${name} ditambahkan dan sudah tersimpan ke database lokal.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Database gagal disimpan.")
    }
  }

  function startEditOlt(olt: Olt) {
    setEditingOltId(olt.id)
    setSelectedOltId(olt.id)
    setForm(formFromOlt(olt))
    setNotice(`Mode edit aktif untuk ${olt.name}.`)
  }

  function cancelEditOlt() {
    setEditingOltId(null)
    setForm(emptyForm)
    setNotice("Edit OLT dibatalkan.")
  }

  async function removeOlt(oltId: string) {
    const currentState = stateRef.current
    const removedOlt = currentState.olts.find((olt) => olt.id === oltId)

    if (!removedOlt) {
      const message = "OLT sudah tidak ada di database."
      setNotice(message)
      showToast(message, "info")
      return
    }

    const nextState = {
      ...currentState,
      olts: currentState.olts.filter((olt) => olt.id !== oltId),
      onus: currentState.onus.filter((onu) => onu.oltId !== oltId),
      alerts: currentState.alerts.filter((alert) => alert.oltId !== oltId),
    }

    try {
      await commitState(nextState)
      setSelectedOltId((current) => (current === oltId ? nextState.olts[0]?.id ?? "" : current))
      if (editingOltId === oltId) {
        setEditingOltId(null)
        setForm(emptyForm)
      }
      setRefreshTick((tick) => tick + 1)
      const message = `${removedOlt.name} berhasil dihapus. Data ONU/ONT dan alert terkait ikut dibersihkan.`
      setNotice(message)
      showToast(message, "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Database gagal disimpan."
      setNotice(message)
      showToast(message, "error")
    }
  }

  async function clearStoredAlerts(mode: ClearAlertsMode) {
    const currentState = stateRef.current
    const nextAlerts = mode === "acknowledged" ? currentState.alerts.filter((alert) => !alert.acknowledged) : []
    const removedCount = currentState.alerts.length - nextAlerts.length

    if (removedCount <= 0) {
      const message = mode === "acknowledged" ? "Belum ada alert selesai yang bisa dibersihkan." : "Belum ada riwayat alert yang tersimpan."
      setNotice(message)
      showToast(message, "info")
      return
    }

    try {
      await commitState({ ...currentState, alerts: nextAlerts })
      setRefreshTick((tick) => tick + 1)
      const message =
        mode === "acknowledged"
          ? `${removedCount} alert selesai berhasil dibersihkan.`
          : `${removedCount} riwayat alert berhasil dibersihkan. Alert aktif tetap muncul jika perangkat masih bermasalah.`

      setNotice(message)
      showToast(message, "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Alert gagal dibersihkan."
      setNotice(message)
      showToast(message, "error")
    }
  }

  async function resetStorage() {
    const response = await fetch("/api/monitoring/state", { method: "DELETE" })
    if (!response.ok) {
      setNotice("Reset default gagal. Coba ulangi atau cek server lokal.")
      return
    }

    stateRef.current = emptyState
    setStoredState(emptyState)
    setSelectedOltId("")
    clearLegacyBrowserState()
    setRefreshTick((tick) => tick + 1)
    setNotice("Reset default selesai. Database monitoring kembali kosong.")
  }

  async function rebootOnu(onu: Onu) {
    setRebootCandidate(onu)
  }

  function bulkRebootOnu(onus: Onu[]) {
    setBulkRebootCandidates(onus)
  }

  function openOnuHistory(onu: Onu) {
    setHistoryCandidate(onu)
  }

  function openOnuConfig(onu: Onu) {
    setConfigCandidate(onu)
  }

  function openOnuTraffic(onu: Onu) {
    setTrafficCandidate(onu)
  }

  async function testConnection(olt: Olt) {
    setNotice(`Menghubungi ${olt.ipAddress}:${olt.snmpPort} lewat SNMP...`)
    const response = await fetch("/api/snmp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(olt),
    })
    const result = (await response.json()) as { ok: boolean; message: string; values?: Record<string, string> }
    const currentState = stateRef.current
    const currentOlt = currentState.olts.find((item) => item.id === olt.id)

    if (!currentOlt) {
      setNotice(`${olt.name} sudah dihapus. Hasil test koneksi tidak disimpan.`)
      return
    }

    const nextState = {
      ...currentState,
      olts: currentState.olts.map((item) =>
        item.id === olt.id
          ? {
              ...item,
              status: result.ok ? ("online" as const) : ("offline" as const),
              lastSeen: result.ok ? "Baru saja" : item.lastSeen,
              uptime: result.values?.["1.3.6.1.2.1.1.3.0"] ?? item.uptime,
              model: deviceTypeFromSystem(result.values, item.model),
              location: deviceLocationFromSystem(result.values, item.location),
              systemInfo: result.values ?? item.systemInfo,
            }
          : item,
      ),
    }

    await commitState(nextState)
    setNotice(result.message)
  }

  async function testWriteCommunity(olt: Olt) {
    setNotice(`Mengetes Write Community untuk ${olt.name}...`)
    const response = await fetch("/api/snmp/test-write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(olt),
    })
    const result = (await response.json()) as { ok: boolean; message: string }

    setNotice(result.message)
  }

  async function testCliConnection(olt: Olt) {
    setNotice(`Menghubungi CLI ${olt.ipAddress}:${olt.cliPort || 23} via Telnet...`)
    const response = await fetch("/api/olt/cli-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(olt),
    })
    const result = (await response.json()) as { ok: boolean; message: string }

    setNotice(result.message)
  }

  async function pollOnu(olt: Olt, options: { silent?: boolean } = {}) {
    if (pollingLocksRef.current.has(olt.id)) return

    const silent = Boolean(options.silent)
    pollingLocksRef.current.add(olt.id)
    if (!silent) {
      setNotice(`Membaca data ONU/ONT dari ${olt.name}...`)
      setPollingOltId(olt.id)
    }

    try {
      const response = await fetch("/api/snmp/poll-onu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(olt),
      })
      const result = (await response.json()) as {
        ok: boolean
        message: string
        onus?: Onu[]
        state?: MonitoringState
        notification?: Partial<PollOnuNotification_> & { message: string }
      }

      if (!result.ok) {
        if (result.state) {
          stateRef.current = result.state
          setStoredState(result.state)
        }
        if (result.notification && ((result.notification.sent ?? 0) > 0 || (result.notification.failed ?? 0) > 0)) {
          showToast(result.notification.message, (result.notification.failed ?? 0) > 0 ? "error" : "success")
        }
        if (!silent) setNotice(result.message)
        return
      }

      const currentState = stateRef.current
      const nextOnus = [...currentState.onus.filter((onu) => onu.oltId !== olt.id), ...(result.onus ?? [])]
      const nextState =
        result.state ??
        ({
          ...currentState,
          onus: nextOnus,
          olts: currentState.olts.map((item) =>
            item.id === olt.id
              ? {
                  ...item,
                  status: "online" as const,
                  activeOnu: result.onus?.filter((onu) => onu.status === "online").length ?? 0,
                  lastSeen: "Baru saja",
                }
              : item,
          ),
        } satisfies MonitoringState)

      stateRef.current = nextState
      setStoredState(nextState)
      setRefreshTick((tick) => tick + 1)

      const notificationMessage = result.notification?.message
      if (!silent) {
        setNotice(notificationMessage ? `${result.message} ${notificationMessage}` : result.message)
      }
      if (result.notification && ((result.notification.sent ?? 0) > 0 || (result.notification.failed ?? 0) > 0)) {
        showToast(result.notification.message, (result.notification.failed ?? 0) > 0 ? "error" : "success")
      }
    } catch (error) {
      if (!silent) setNotice(error instanceof Error ? error.message : "Polling ONU gagal.")
    } finally {
      pollingLocksRef.current.delete(olt.id)
      if (!silent) setPollingOltId(null)
    }
  }

  useEffect(() => {
    if (JSON.stringify(stateRef.current.olts) === JSON.stringify(sseState.olts) &&
        JSON.stringify(stateRef.current.onus) === JSON.stringify(sseState.onus) &&
        JSON.stringify(stateRef.current.alerts) === JSON.stringify(sseState.alerts)) return
    const nextState = {
      olts: sseState.olts,
      onus: sseState.onus,
      alerts: sseState.alerts,
      settings: sseState.settings,
    }
    stateRef.current = nextState
    setStoredState(nextState)
    setSummary(sseState.summary)
    setOperationalAlerts(Array.isArray(sseState.operationalAlerts) ? sseState.operationalAlerts : [])
    setRefreshTick((tick) => tick + 1)
  }, [sseState])

  return (
    <main className="p-4 lg:p-6">
      {toast && <ToastNotice toast={toast} onClose={() => setToast(null)} />}
      <div className="mb-2 flex items-center justify-end gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
          sseConnected
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sseConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          {sseConnected ? "Live" : "Reconnecting..."}
        </span>
      </div>
      {deleteCandidate && (
        <DeleteOltDialog
          olt={deleteCandidate}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => {
            const target = deleteCandidate
            setDeleteCandidate(null)
            void removeOlt(target.id)
          }}
        />
      )}
      {clearAlertsMode && (
        <ClearAlertsDialog
          mode={clearAlertsMode}
          savedCount={alerts.length}
          completedCount={alerts.filter((alert) => alert.acknowledged).length}
          activeCount={operationalAlerts.filter((alert) => !alert.acknowledged).length}
          onCancel={() => setClearAlertsMode(null)}
          onConfirm={() => {
            const mode = clearAlertsMode
            setClearAlertsMode(null)
            void clearStoredAlerts(mode)
          }}
        />
      )}
      {rebootCandidate && (
        <RebootConfirmDialog
          onu={rebootCandidate}
          olt={selectedOlt}
          onCancel={() => setRebootCandidate(null)}
        />
      )}
      {bulkRebootCandidates && (
        <BulkRebootDialog
          onus={bulkRebootCandidates}
          olt={selectedOlt}
          onCancel={() => setBulkRebootCandidates(null)}
        />
      )}
      {deleteOnuCandidate && (
        <DeleteOnuConfirmDialog
          onu={deleteOnuCandidate}
          olt={selectedOlt}
          onCancel={() => setDeleteOnuCandidate(null)}
        />
      )}

      {historyCandidate && (
        <OnuHistoryDialog
          onu={historyCandidate}
          olt={selectedOlt}
          onClose={() => setHistoryCandidate(null)}
        />
      )}

      {configCandidate && (
        <OnuConfigDialog
          onu={configCandidate}
          olt={selectedOlt}
          onClose={() => setConfigCandidate(null)}
        />
      )}

      {trafficCandidate && (
        <OnuTrafficDialog
          onu={trafficCandidate}
          olt={selectedOlt}
          onClose={() => setTrafficCandidate(null)}
        />
      )}

      {showUncfg && selectedOlt && (
        <UncfgOnuDialog
          olt={selectedOlt}
          onClose={() => setShowUncfg(false)}
        />
      )}

      {rxPowerCandidate && (
        <RxPowerHistoryDialog
          onu={rxPowerCandidate}
          olt={selectedOlt}
          onClose={() => setRxPowerCandidate(null)}
        />
      )}

      {inventoryCandidate && (
        <InventoryEditDialog
          targetType={inventoryCandidate.type}
          item={inventoryCandidate.item}
          onClose={() => setInventoryCandidate(null)}
          onToast={showToast}
        />
      )}

      {hwHistoryCandidate && (
        <HardwareHistoryDialog
          targetType={hwHistoryCandidate.type}
          targetId={hwHistoryCandidate.item.id}
          targetName={hwHistoryCandidate.item.name}
          onClose={() => setHwHistoryCandidate(null)}
        />
      )}

      {(view === "dashboard" || view === "olts") && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="OLT Online" value={`${onlineOlts}/${olts.length}`} detail="Berdasarkan test SNMP terakhir" tone="cyan" />
          <MetricCard label="Total ONU" value={formatNumber(totalOnu)} detail="Akan terisi dari polling OLT" tone="emerald" />
          <MetricCard label="ONU Down" value={String(downOnu)} detail="Tidak online saat polling terakhir" tone="amber" />
          <MetricCard label="Alert Terbuka" value={String(openAlerts)} detail="Belum di-acknowledge" tone="red" />
        </div>
      )}

      {view === "dashboard" && <DashboardView olts={olts} onus={onus} alerts={operationalAlerts} notice={notice} selectedOltId={selectedOlt?.id ?? ""} onSelectOlt={setSelectedOltId} />}

      {view === "olts" && (
        <section className="mt-4 grid gap-4 xl:grid-cols-[420px_1fr]">
          <OltFormPanel
            form={form}
            editingOltName={olts.find((olt) => olt.id === editingOltId)?.name}
            onCancelEdit={cancelEditOlt}
            onSave={saveOlt}
            onUpdate={updateForm}
            onVendorChange={updateVendor}
          />
          <OltListPanel
            olts={olts}
            onus={onus}
            selectedOltId={selectedOlt?.id}
            notice={notice}
            onSelect={setSelectedOltId}
            onEdit={startEditOlt}
            onTest={testConnection}
            onTestWrite={testWriteCommunity}
            onTestCli={testCliConnection}
            onPollOnu={pollOnu}
            pollingOltId={pollingOltId}
            onRemove={setDeleteCandidate}
            onInventory={(type, item) => setInventoryCandidate({ type, item })}
            onHwHistory={(type, item) => setHwHistoryCandidate({ type, item })}
          />
        </section>
      )}

      {view === "onus" && (
        <OnuView
          olts={olts}
          selectedOlt={selectedOlt}
          query={query}
          refreshTick={refreshTick}
          onSelectOlt={setSelectedOltId}
          onQuery={setQuery}
          onRebootOnu={rebootOnu}
          onBulkReboot={bulkRebootOnu}
          onDeleteOnu={(onu) => setDeleteOnuCandidate(onu)}
          onShowUncfg={() => setShowUncfg(true)}
          onHistory={openOnuHistory}
          onConfig={openOnuConfig}
          onTraffic={openOnuTraffic}
          onRxPower={(onu) => setRxPowerCandidate(onu)}
          onInventory={(type, item) => setInventoryCandidate({ type, item })}
          onHwHistory={(type, item) => setHwHistoryCandidate({ type, item })}
          onPollOnu={pollOnu}
          pollingOltId={pollingOltId}
        />
      )}

      {view === "alerts" && (
        <AlertsView
          alerts={operationalAlerts}
          savedAlerts={alerts}
          onClearAcknowledged={() => setClearAlertsMode("acknowledged")}
          onClearAll={() => setClearAlertsMode("all")}
        />
      )}
      {/* {view === "about" && <AboutView />} */}
      {view === "settings" && <SettingsView telegram={settings.telegram} onTelegramChange={updateTelegramSettings} onTestTelegram={testTelegram} />}
      {view === "system" && <SystemView onResetDefault={resetStorage} onToast={showToast} />}
    </main>
  )
}
