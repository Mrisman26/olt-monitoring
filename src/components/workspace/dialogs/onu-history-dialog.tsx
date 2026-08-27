"use client"

import { CircleAlert, CircleCheck, Download, History, RefreshCcw, X } from "lucide-react"
import { useEffect, useState } from "react"
import type { Onu, Olt, OnuHistoryResult } from "@/lib/types"
import { secondaryButtonClass } from "../types"

export function OnuHistoryDialog({
  onu,
  olt,
  onClose,
}: {
  onu: Onu
  olt: Olt | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<OnuHistoryResult | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")
      try {
        const response = await fetch("/api/onu/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ olt, onu }),
        })
        const data = (await response.json()) as OnuHistoryResult
        if (cancelled) return
        if (!data.ok && (!data.dbHistory || data.dbHistory.length === 0)) {
          setError(data.message)
          setResult(null)
          return
        }
        setResult(data)
      } catch (cause) {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : "Gagal membaca riwayat up/down.")
        setResult(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [onu, olt])

  function causeBadgeClass(cause: string) {
    const text = cause.trim().toLowerCase()
    if (text.includes("dying")) {
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-200"
    }
    if (text.includes("los")) {
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/30 dark:bg-amber-950/30 dark:text-amber-200"
    }
    if (text.includes("sn")) {
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/30 dark:bg-sky-950/30 dark:text-sky-200"
    }
    return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-300/30 dark:bg-slate-800 dark:text-slate-300"
  }

  function formatEventTime(value: string) {
    if (!value || value === "0000-00-00 00:00:00") return ""
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        const dd = String(d.getUTCDate()).padStart(2, "0")
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
        const yyyy = d.getUTCFullYear()
        const hh = String(d.getUTCHours()).padStart(2, "0")
        const mi = String(d.getUTCMinutes()).padStart(2, "0")
        return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
      }
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) {
      const [datePart, timePart] = value.split(" ")
      const [yyyy, mm, dd] = datePart.split("-")
      return `${dd}/${mm}/${yyyy} ${timePart.slice(0, 5)}`
    }
    return value
  }

  function exportCsv() {
    const rows: string[] = []
    rows.push("No,Waktu Uptime,Waktu Downtime,Status,Sumber,Cause")

    const dbEntries = result?.dbHistory ?? []
    dbEntries.forEach((entry, i) => {
      const time = formatEventTime(entry.timestamp)
      const status = entry.status === "online" ? "Online" : "Offline"
      const cause = entry.cause || ""
      const waktuUp = status === "Online" ? time : ""
      const waktuDown = status === "Offline" ? time : ""
      rows.push(`${i + 1},"${waktuUp}","${waktuDown}","${status}","Database","${cause}"`)
    })

    const oltEntries = result?.history ?? []
    oltEntries.forEach((entry, i) => {
      const idx = dbEntries.length + i + 1
      const rawUp = entry.authpassTime !== "0000-00-00 00:00:00" ? entry.authpassTime || "" : ""
      const rawDown = entry.offlineTime !== "0000-00-00 00:00:00" ? entry.offlineTime || "" : ""
      const upTime = formatEventTime(rawUp)
      const downTime = formatEventTime(rawDown)
      const stillUp = !downTime
      const status = stillUp ? "Online" : "Offline"
      const cause = stillUp ? "Online" : entry.cause || ""
      rows.push(`${idx},"${upTime}","${downTime}","${status}","OLT Buffer","${cause}"`)
    })

    const csv = "\uFEFF" + rows.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `riwayat-onu-${onu.name || onu.serialNumber || onu.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const summary = result?.summary
  const hasSummary = summary && (summary.interfaceId || summary.name)
  const dbEntries = result?.dbHistory ?? []
  const oltEntries = result?.history ?? []
  const totalEntries = dbEntries.length + oltEntries.length

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="onu-history-title">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-cyan-500/30 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-5 dark:border-slate-800 dark:from-cyan-950/35 dark:via-slate-950 dark:to-emerald-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-cyan-700 shadow-sm dark:bg-cyan-500/15 dark:text-cyan-200">
                <History className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p id="onu-history-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  Riwayat Up/Down
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {onu.name || onu.serialNumber} | {onu.ponPort}:{onu.onuIndex}
                  {olt ? ` \u2014 ${olt.name}` : ""}
                </p>
              </div>
            </div>
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
              onClick={onClose}
              aria-label="Tutup popup riwayat up/down"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {summary && hasSummary && (
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white/75 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/70 sm:grid-cols-3">
              {summary.name && (
                <div>
                  <p className="text-slate-400 dark:text-slate-400">Nama di OLT</p>
                  <p className="mt-0.5 font-bold text-slate-700 dark:text-slate-200">{summary.name}</p>
                </div>
              )}
              {summary.type && (
                <div>
                  <p className="text-slate-400 dark:text-slate-400">Tipe</p>
                  <p className="mt-0.5 font-bold text-slate-700 dark:text-slate-200">{summary.type}</p>
                </div>
              )}
              {summary.serialNumber && (
                <div>
                  <p className="text-slate-400 dark:text-slate-400">Serial</p>
                  <p className="mt-0.5 font-mono font-bold text-slate-700 dark:text-slate-200">{summary.serialNumber}</p>
                </div>
              )}
              {summary.state && (
                <div>
                  <p className="text-slate-400 dark:text-slate-400">State</p>
                  <p className="mt-0.5 font-bold text-slate-700 dark:text-slate-200">{summary.state}</p>
                </div>
              )}
              {summary.onlineDuration && (
                <div>
                  <p className="text-slate-400 dark:text-slate-400">Online Duration</p>
                  <p className="mt-0.5 font-bold text-slate-700 dark:text-slate-200">{summary.onlineDuration}</p>
                </div>
              )}
              {summary.interfaceId && (
                <div>
                  <p className="text-slate-400 dark:text-slate-400">Interface</p>
                  <p className="mt-0.5 font-mono font-bold text-slate-700 dark:text-slate-200">{summary.interfaceId}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <RefreshCcw className="h-6 w-6 animate-spin text-[var(--accent)]" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Membaca riwayat dari OLT &amp; database...
              </p>
              <p className="text-xs text-slate-400">Telnet + MySQL</p>
            </div>
          ) : error && totalEntries === 0 ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-200">
              <p className="font-semibold">Gagal membaca riwayat</p>
              <p className="mt-1 text-xs leading-5">{error}</p>
            </div>
          ) : (
            <div>
              {dbEntries.length > 0 && (
                <div className="mb-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Riwayat dari Database
                    </p>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-950/30 dark:text-emerald-200">
                      {dbEntries.length} event
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">No</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Waktu Uptime</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Waktu Downtime</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Status</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Cause</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbEntries.map((entry, i) => {
                          const isOnline = entry.status === "online"
                          const waktuUp = isOnline ? formatEventTime(entry.timestamp) : ""
                          const waktuDown = !isOnline ? formatEventTime(entry.timestamp) : ""
                          return (
                            <tr key={entry.id ?? i} className="border-b border-[var(--border)] last:border-0 hover:bg-teal-600/5">
                              <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">{i + 1}</td>
                              <td className="px-4 py-2.5">
                                {waktuUp ? (
                                  <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                                    {waktuUp}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {waktuDown ? (
                                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    {waktuDown}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {isOnline ? (
                                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                                    <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                    Online
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-red-700 dark:text-red-200">
                                    <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                                    Offline
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {!isOnline && entry.cause ? (
                                  <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${causeBadgeClass(entry.cause)}`}>
                                    {entry.cause}
                                  </span>
                                ) : isOnline ? (
                                  <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-950/30 dark:text-emerald-200">
                                    Online
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {oltEntries.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Buffer dari OLT (live)
                    </p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {oltEntries.length} event
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">No</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Waktu Uptime</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Waktu Downtime</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Status</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Cause</th>
                        </tr>
                      </thead>
                      <tbody>
                        {oltEntries.map((entry) => {
                          const stillUp = entry.offlineTime === "0000-00-00 00:00:00" || !entry.offlineTime
                          const waktuUp = formatEventTime(entry.authpassTime)
                          const waktuDown = stillUp ? "" : formatEventTime(entry.offlineTime)
                          return (
                            <tr key={entry.index} className="border-b border-[var(--border)] last:border-0 hover:bg-teal-600/5">
                              <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">{entry.index}</td>
                              <td className="px-4 py-2.5">
                                {waktuUp ? (
                                  <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-200">{waktuUp}</span>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {waktuDown ? (
                                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">{waktuDown}</span>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {stillUp ? (
                                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                                    <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                    Online
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-red-700 dark:text-red-200">
                                    <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                                    Offline
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {stillUp ? (
                                  <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-950/30 dark:text-emerald-200">
                                    Online
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${causeBadgeClass(entry.cause)}`}>
                                    {entry.cause || "-"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {dbEntries.length === 0 && oltEntries.length === 0 && !error && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Belum ada riwayat up/down yang tercatat.
                </div>
              )}

              {error && totalEntries > 0 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-700 dark:border-amber-300/30 dark:bg-amber-950/30 dark:text-amber-200">
                  Catatan: {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end">
          <button
            className={secondaryButtonClass}
            type="button"
            onClick={exportCsv}
            disabled={totalEntries === 0}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </button>
          <button className={secondaryButtonClass} type="button" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
