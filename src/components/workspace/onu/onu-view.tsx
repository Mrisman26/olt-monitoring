"use client"

import { Fragment, useEffect, useState } from "react"
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Database,
  Eye,
  Power,
  RefreshCcw,
  Search,
  Wifi,
  X,
} from "lucide-react"
import type { Olt, Onu } from "@/lib/types"
import { DataTableHeader } from "../ui/data-table-header"
import { EmptyState } from "../ui/empty-state"
import { SignalBadge } from "../ui/signal-badge"
import { StatusBadge } from "@/components/status-badge"
import { OnuActionDropdown } from "./onu-action-dropdown"
import { formatRxPower, formatTemperature, rxTone, temperatureTone, num, formatNumber, zteInterfaceName } from "../utils"

export function OnuView(props: {
  olts: Olt[]
  selectedOlt?: Olt
  query: string
  refreshTick: number
  onSelectOlt: (id: string) => void
  onQuery: (value: string) => void
  onRebootOnu: (onu: Onu) => void
  onBulkReboot: (onus: Onu[]) => void
  onDeleteOnu: (onu: Onu) => void
  onShowUncfg: () => void
  onHistory: (onu: Onu) => void
  onConfig: (onu: Onu) => void
  onTraffic: (onu: Onu) => void
  onRxPower: (onu: Onu) => void
  onInventory: (type: "olt" | "onu", item: Olt | Onu) => void
  onHwHistory: (type: "olt" | "onu", item: Olt | Onu) => void
  onPollOnu: (olt: Olt) => void
  pollingOltId: string | null
}) {
  const [expandedOnuId, setExpandedOnuId] = useState<string | null>(null)
  const [selectedOnuIds, setSelectedOnuIds] = useState<Set<string>>(new Set())

  const [sortKey, setSortKey] = useState<"name" | "serialNumber" | "pon" | "rx" | "temperature" | "status" | "syncStatus">("pon")

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all")

  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [ponFilter, setPonFilter] = useState("")
  const [pons, setPons] = useState<string[]>([])

  const [tableData, setTableData] = useState<{
    onus: Onu[]
    total: number
    online: number
    offline: number
  }>({ onus: [], total: 0, online: 0, offline: 0 })

  const [loading, setLoading] = useState(true)

  const [debouncedQuery, setDebouncedQuery] = useState(props.query)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(props.query)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [props.query])

  const rebootEnabled =
    props.selectedOlt?.oidProfile === "zte-c320" &&
    ((props.selectedOlt?.writeMode === "snmp" && Boolean(props.selectedOlt?.hasSnmpWrite)) ||
      (props.selectedOlt?.writeMode === "cli" && Boolean(props.selectedOlt?.hasCliCredentials)))

  const polling = Boolean(props.selectedOlt && props.pollingOltId === props.selectedOlt.id)

  const ztePon = props.selectedOlt?.oidProfile === "zte-c320"
  const cardName = props.selectedOlt?.cardName?.trim() || "GTGH"

  const totalRows = tableData.total

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))

  const safeCurrentPage = Math.min(currentPage, totalPages)

  useEffect(() => {
    let cancelled = false

    const totalPagesFromData = Math.max(1, Math.ceil(totalRows / pageSize))
    const requestPage = Math.min(currentPage, totalPagesFromData)

    const params = new URLSearchParams()
    if (props.selectedOlt?.id) params.set("oltId", props.selectedOlt.id)
    if (debouncedQuery.trim()) params.set("query", debouncedQuery.trim())
    if (ponFilter) params.set("pon", ponFilter)
    params.set("status", statusFilter)
    params.set("sort", sortKey)
    params.set("direction", sortDirection)
    params.set("page", String(requestPage))
    params.set("pageSize", String(pageSize))

    fetch(`/api/monitoring/onus?${params.toString()}`)
      .then((response) => response.json())
      .then((data: { onus: Onu[]; total: number; online: number; offline: number; pons: string[] }) => {
        if (cancelled) return
        setTableData(data)
        setPons(data.pons ?? [])
        setLoading(false)
        if (data.pons && data.pons.length > 0 && ponFilter && !data.pons.includes(ponFilter)) {
          setPonFilter("")
        }
        if (data.total > 0 && currentPage > Math.max(1, Math.ceil(data.total / pageSize))) {
          setCurrentPage(1)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [props.selectedOlt?.id, debouncedQuery, statusFilter, ponFilter, sortKey, sortDirection, pageSize, currentPage, totalRows, props.refreshTick])

  const startIndex = (safeCurrentPage - 1) * pageSize

  const endIndex = Math.min(startIndex + pageSize, totalRows)

  const paginatedOnus = tableData.onus

  const handleSort = (key: "name" | "serialNumber" | "pon" | "rx" | "temperature" | "status" | "syncStatus") => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }

    setCurrentPage(1)
  }

  const handleSearch = (value: string) => {
    props.onQuery(value)
    setCurrentPage(1)
  }

  const handleStatusFilter = (value: "all" | "online" | "offline") => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handlePageSize = (value: number) => {
    setPageSize(value)
    setCurrentPage(1)
  }

  const handlePonFilter = (value: string) => {
    setPonFilter(value)
    setCurrentPage(1)
  }

  const allVisibleSelected = paginatedOnus.length > 0 && paginatedOnus.every((onu) => selectedOnuIds.has(onu.id))

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedOnuIds((prev) => {
        const next = new Set(prev)
        for (const onu of paginatedOnus) next.delete(onu.id)
        return next
      })
    } else {
      setSelectedOnuIds((prev) => {
        const next = new Set(prev)
        for (const onu of paginatedOnus) next.add(onu.id)
        return next
      })
    }
  }

  function toggleSelectOnu(id: string) {
    setSelectedOnuIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedOnuList = paginatedOnus.filter((onu) => selectedOnuIds.has(onu.id))

  useEffect(() => {
    setSelectedOnuIds(new Set())
  }, [props.selectedOlt?.id])

  const ponLabel = (pon: string) => (ztePon ? `gpon-onu_1/${pon}` : `PON ${pon}`)

  const onlineCount = tableData.online

  const offlineCount = tableData.offline

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">ONU / ONT</h2>

          <p className="mt-1 text-sm text-slate-500">Data RX, suhu, status, dan kasus down dibaca dari OLT melalui SNMP.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* OLT */}
          <select
            className="h-10 min-w-[190px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            value={props.selectedOlt?.id ?? ""}
            onChange={(event) => props.onSelectOlt(event.target.value)}
          >
            <option value="">Pilih OLT</option>

            {props.olts.map((olt) => (
              <option key={olt.id} value={olt.id}>
                {olt.name}
              </option>
            ))}
          </select>

          {/* Poll */}
          <button
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-teal-600/25 bg-teal-600/10 px-4 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-600/20 disabled:cursor-not-allowed disabled:opacity-50 ${polling ? "animate-pulse" : ""}`}
            type="button"
            disabled={!props.selectedOlt || polling}
            onClick={() => props.selectedOlt && props.onPollOnu(props.selectedOlt)}
          >
            <RefreshCcw className={`h-4 w-4 ${polling ? "animate-spin" : ""}`} aria-hidden="true" />

            {polling ? "Polling..." : "Poll ONU"}
          </button>

          {rebootEnabled && selectedOnuIds.size > 0 && (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-600/25 bg-red-600/10 px-4 text-sm font-semibold text-red-800 shadow-sm transition hover:bg-red-600/20 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/20"
              type="button"
              onClick={() => props.onBulkReboot(selectedOnuList)}
            >
              <Power className="h-4 w-4" aria-hidden="true" />
              Reboot {selectedOnuIds.size} ONU
            </button>
          )}

          {rebootEnabled && (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-600/25 bg-amber-600/10 px-4 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-600/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20"
              type="button"
              disabled={!props.selectedOlt}
              onClick={() => props.onShowUncfg()}
            >
              <Wifi className="h-4 w-4" aria-hidden="true" />
              ONU Unconfigured
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[var(--surface)] p-4 shadow-sm dark:border-slate-700">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300" />
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Total ONU</div>
            <Database className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[var(--text)]">{totalRows}</div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-400/10">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300" />
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Online</div>
            <CircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-200">{onlineCount}</div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm dark:border-rose-400/30 dark:bg-rose-400/10">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 via-red-300 to-orange-300" />
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">Offline</div>
            <CircleAlert className="h-4 w-4 text-rose-600 dark:text-rose-300" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-200">{offlineCount}</div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-teal-600/20 bg-teal-600/10 p-4 shadow-sm dark:border-teal-400/30 dark:bg-teal-400/10">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-300" />
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-200">Ditampilkan</div>
            <Eye className="h-4 w-4 text-teal-700 dark:text-teal-200" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-800 dark:text-teal-100">{totalRows}</div>
        </div>
      </div>

      {/* Filter & pencarian */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />

            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-slate-700"
              placeholder="Cari nama, serial, atau port PON..."
              value={props.query}
              onChange={(event) => handleSearch(event.target.value)}
            />

            {props.query && (
              <button
                className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                type="button"
                onClick={() => handleSearch("")}
                aria-label="Hapus pencarian"
                title="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Filter bar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Status */}
            <div className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              {[["all", "Semua"], ["online", "Online"], ["offline", "Offline"]].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStatusFilter(value as "all" | "online" | "offline")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                    statusFilter === value ? "bg-white text-teal-700 shadow-sm ring-1 ring-teal-600/10 dark:bg-slate-700 dark:text-teal-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* PON port */}
            <div className="relative flex-1 sm:max-w-xs">
              <select
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--ring)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                value={ponFilter}
                onChange={(event) => handlePonFilter(event.target.value)}
                aria-label="Filter port PON"
              >
                <option value="">Semua PON</option>

                {pons.map((pon) => (
                  <option key={pon} value={pon}>
                    {ponLabel(pon)}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            </div>

            {/* Page size */}
            <div className="relative">
              <select
                className="h-11 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--ring)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                value={pageSize}
                onChange={(event) => handlePageSize(Number(event.target.value))}
                aria-label="Jumlah baris per halaman"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
                <option value={100}>100 / halaman</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            </div>

            {/* Result count */}
            <div className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 xl:inline-flex">
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
              {totalRows} hasil
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {!loading && totalRows === 0 ? (
        <EmptyState title="Belum ada data ONU/ONT" text="Setelah polling SNMP dibuat, daftar ONU dari OLT akan muncul di sini." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-700"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Pilih semua ONU"
                    />
                  </th>
                  <DataTableHeader label="Nama" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />

                  <DataTableHeader label="Serial" sortKey="serialNumber" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />

                  <DataTableHeader label="PON" sortKey="pon" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />

                  <DataTableHeader label="RX" sortKey="rx" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />

                  {/* <DataTableHeader
                    label="Suhu"
                    sortKey="temperature"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  /> */}

                  {/* <th className="px-4 py-3 font-semibold">
                    Kasus Down
                  </th> */}

                  <DataTableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading && paginatedOnus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="text-sm font-semibold text-slate-500">Memuat data...</div>
                    </td>
                  </tr>
                ) : paginatedOnus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="text-sm font-semibold text-slate-700">Data tidak ditemukan</div>

                      <div className="mt-1 text-xs text-slate-400">Coba ubah kata pencarian atau filter status.</div>
                    </td>
                  </tr>
                ) : (
                  paginatedOnus.map((onu) => (
                    <Fragment key={onu.id}>
                      <tr
                        className={`group bg-[var(--surface)] transition hover:bg-teal-600/5 ${
                          onu.status === "online" ? "shadow-[inset_3px_0_0_0_rgba(16,185,129,0.45)]" : "shadow-[inset_3px_0_0_0_rgba(244,63,94,0.55)]"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-700"
                            checked={selectedOnuIds.has(onu.id)}
                            onChange={() => toggleSelectOnu(onu.id)}
                            aria-label={`Pilih ${onu.name || onu.serialNumber}`}
                          />
                        </td>

                        {/* Nama */}
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <button
                              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                              type="button"
                              onClick={() => setExpandedOnuId(expandedOnuId === onu.id ? null : onu.id)}
                              aria-label={expandedOnuId === onu.id ? "Tutup aksi" : "Buka aksi"}
                            >
                              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expandedOnuId === onu.id ? "rotate-90" : ""}`} aria-hidden="true" />
                            </button>
                            <div className="max-w-[200px] min-w-0 flex-1">
                              <div className="break-words font-semibold leading-snug text-slate-950" title={onu.name}>
                                {onu.name || "-"}
                              </div>

                              <div className="mt-0.5 text-[11px] text-slate-400">ONU ID {onu.onuIndex}</div>
                            </div>
                          </div>
                        </td>

                        {/* Serial */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-medium text-slate-600">{onu.serialNumber || "-"}</span>
                        </td>

                        {/* PON */}
                        <td className="px-4 py-3">
                          {ztePon && onu.ponPort.includes("/") ? (
                            <span className="inline-flex flex-col items-start gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {cardName} {onu.ponPort.split("/")[0]}
                              </span>
                              <span>{zteInterfaceName(onu.ponPort, onu.onuIndex)}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                              {onu.ponPort}:{onu.onuIndex}
                            </span>
                          )}
                        </td>

                        {/* RX */}
                        <td className="px-4 py-3">
                          <SignalBadge value={formatRxPower(onu.rxPower)} tone={rxTone(onu.rxPower)} />
                        </td>

                        {/* Temperature
                        <td className="px-4 py-3">
                          <SignalBadge
                            value={formatTemperature(
                              onu.temperatureC
                            )}
                            tone={temperatureTone(
                              onu.temperatureC
                            )}
                          />
                        </td> */}

                        {/* Down reason
                        <td className="px-4 py-3">
                          {onu.status === "online" ? (
                            <span className="text-slate-300">
                              —
                            </span>
                          ) : (
                            <span className="inline-flex max-w-[160px] truncate rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              {onu.downReason || "Down"}
                            </span>
                          )}
                        </td> */}

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge value={onu.status} />
                        </td>
                      </tr>

                      {expandedOnuId === onu.id && (
                        <tr>
                          <td colSpan={6} className="border-t border-slate-100 bg-slate-50/80 px-6 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="mr-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Aksi</span>
                              <OnuActionDropdown
                                onu={onu}
                                rebootEnabled={rebootEnabled}
                                onHistory={() => props.onHistory(onu)}
                                onConfig={() => props.onConfig(onu)}
                                onTraffic={() => props.onTraffic(onu)}
                                onRxPower={() => props.onRxPower(onu)}
                                onInventory={() => props.onInventory("onu", onu)}
                                onHwHistory={() => props.onHwHistory("onu", onu)}
                                onReboot={() => props.onRebootOnu(onu)}
                                onDelete={() => props.onDeleteOnu(onu)}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-slate-700 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{totalRows === 0 ? 0 : startIndex + 1}</span>{" "}
              sampai{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{endIndex}</span>{" "}
              dari{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{totalRows}</span>{" "}
              ONU
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              <div className="flex items-center gap-1">
                <span className="px-1 text-xs text-slate-400 dark:text-slate-500">
                  Halaman{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-200">{safeCurrentPage}</span>{" "}
                  / {totalPages}
                </span>
              </div>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
