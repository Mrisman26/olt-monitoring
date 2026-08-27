"use client"

import { CircleAlert, CircleCheck, Info, X } from "lucide-react"
import type { ToastState } from "../types"

export function ToastNotice({ toast, onClose }: { toast: NonNullable<ToastState>; onClose: () => void }) {
  const toneStyle = {
    info: {
      icon: Info,
      label: "Info",
      className: "border-teal-200 bg-teal-50 text-teal-950",
      iconClassName: "bg-teal-100 text-teal-700",
    },
    success: {
      icon: CircleCheck,
      label: "Berhasil",
      className: "border-emerald-200 bg-emerald-50 text-emerald-950",
      iconClassName: "bg-emerald-100 text-emerald-700",
    },
    error: {
      icon: CircleAlert,
      label: "Gagal",
      className: "border-red-200 bg-red-50 text-red-950",
      iconClassName: "bg-red-100 text-red-700",
    },
  }[toast.tone]
  const Icon = toneStyle.icon

  return (
    <div
      className={`toast-pop fixed right-4 top-20 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border p-4 shadow-lg backdrop-blur ${toneStyle.className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneStyle.iconClassName}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toneStyle.label}</p>
          <p className="mt-1 text-sm leading-5">{toast.message}</p>
        </div>
        <button
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-current/15 bg-white/50 transition hover:bg-white/80"
          type="button"
          onClick={onClose}
          aria-label="Tutup notifikasi"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
