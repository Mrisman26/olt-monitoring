"use client"

import { CircleAlert, Trash2, X } from "lucide-react"
import type { ClearAlertsMode } from "../types"
import { secondaryButtonClass } from "../types"

export function ClearAlertsDialog({
  mode,
  savedCount,
  completedCount,
  activeCount,
  onCancel,
  onConfirm,
}: {
  mode: ClearAlertsMode
  savedCount: number
  completedCount: number
  activeCount: number
  onCancel: () => void
  onConfirm: () => void
}) {
  const isAll = mode === "all"
  const count = isAll ? savedCount : completedCount

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="clear-alerts-title">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-amber-500/30 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-amber-50 via-white to-red-50 p-5 dark:from-amber-950/35 dark:via-slate-950 dark:to-red-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-500/15 dark:text-amber-200">
                <CircleAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p id="clear-alerts-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  {isAll ? "Bersihkan semua riwayat alert?" : "Bersihkan alert selesai?"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {isAll
                    ? "Semua riwayat alert yang tersimpan akan dihapus dari database lokal."
                    : "Hanya alert yang sudah selesai/acknowledged yang akan dihapus dari database lokal."}
                </p>
              </div>
            </div>
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
              onClick={onCancel}
              aria-label="Tutup popup bersihkan alert"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 grid gap-2 rounded-2xl border border-slate-200 bg-white/75 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-300">Riwayat yang akan dibersihkan</span>
              <span className="font-bold text-slate-950 dark:text-slate-50">{count}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-300">Alert aktif di layar</span>
              <span className="font-bold text-red-700 dark:text-red-200">{activeCount}</span>
            </div>
            <p className="pt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Alert aktif dari status perangkat tetap akan muncul jika OLT atau ONU/ONT masih down, RX lemah, atau suhu tinggi.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end">
          <button className={secondaryButtonClass} type="button" onClick={onCancel}>
            Batal
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white shadow-lg shadow-amber-900/20 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={onConfirm}
            disabled={count <= 0}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {isAll ? "Bersihkan Semua" : "Bersihkan Selesai"}
          </button>
        </div>
      </div>
    </div>
  )
}
