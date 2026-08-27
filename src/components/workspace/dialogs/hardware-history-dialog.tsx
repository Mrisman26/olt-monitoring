"use client"

import { History, RotateCw, X } from "lucide-react"
import { useEffect, useState } from "react"
import type { HardwareHistoryEntry } from "@/lib/types"
import { secondaryButtonClass } from "../types"

export function HardwareHistoryDialog({
  targetType,
  targetId,
  targetName,
  onClose,
}: {
  targetType: "olt" | "onu"
  targetId: string
  targetName: string
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<HardwareHistoryEntry[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    fetch(`/api/inventory/history?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}&limit=50`)
      .then((r) => r.json())
      .then((data: { entries: HardwareHistoryEntry[] }) => {
        if (cancelled) return
        setEntries(data.entries ?? [])
      })
      .catch((cause) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : "Gagal membaca riwayat.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [targetType, targetId])

  const fieldLabels: Record<string, string> = {
    model: "Model",
    serialNumber: "Serial Number",
    warrantyExpiry: "Garansi",
    installDate: "Tanggal Pasang",
    notes: "Catatan",
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="hw-history-title">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-violet-500/30 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-5 dark:border-slate-800 dark:from-violet-950/35 dark:via-slate-950 dark:to-purple-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm dark:bg-violet-500/15 dark:text-violet-200">
                <History className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p id="hw-history-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  Riwayat Perubahan Hardware
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {targetName} ({targetType.toUpperCase()})
                </p>
              </div>
            </div>
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
              onClick={onClose}
              aria-label="Tutup riwayat hardware"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500 dark:text-slate-400">
              <RotateCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Memuat riwayat...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Belum ada riwayat perubahan hardware.
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-200">
                      {fieldLabels[entry.fieldName] ?? entry.fieldName}
                    </span>
                    <span className="text-xs text-slate-400">{entry.timestamp}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600 line-through dark:bg-red-950/30 dark:text-red-300">
                      {entry.oldValue || "(kosong)"}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                      {entry.newValue || "(kosong)"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Oleh: {entry.actor}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <button className={secondaryButtonClass} type="button" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
