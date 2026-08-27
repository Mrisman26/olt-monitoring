"use client"

import { Trash2, X } from "lucide-react"
import type { Olt } from "@/lib/types"
import { secondaryButtonClass } from "../types"

export function DeleteOltDialog({ olt, onCancel, onConfirm }: { olt: Olt; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-olt-title">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-red-500/30 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 p-5 dark:from-red-950/35 dark:via-slate-950 dark:to-orange-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700 shadow-sm dark:bg-red-500/15 dark:text-red-200">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p id="delete-olt-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  Hapus OLT ini?
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Tindakan ini akan menghapus OLT, data ONU/ONT, dan alert yang terhubung dari database lokal.
                </p>
              </div>
            </div>
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
              onClick={onCancel}
              aria-label="Tutup popup hapus OLT"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white/75 p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{olt.name}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {olt.ipAddress}:{olt.snmpPort || 161} | {olt.vendor}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Jika ingin memakai OLT ini lagi, tambahkan ulang dari menu OLT.</p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end">
          <button className={secondaryButtonClass} type="button" onClick={onCancel}>
            Batal
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-500"
            type="button"
            onClick={onConfirm}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Ya, Hapus OLT
          </button>
        </div>
      </div>
    </div>
  )
}
