"use client"

import { CircleCheck, RotateCw, Trash2, X } from "lucide-react"
import { useState } from "react"
import type { Onu, Olt } from "@/lib/types"
import { secondaryButtonClass } from "../types"

export function DeleteOnuConfirmDialog({
  onu,
  olt,
  onCancel,
}: {
  onu: Onu
  olt: Olt | null
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<"confirm" | "sending" | "done">("confirm")
  const [stepText, setStepText] = useState("")
  const [resultOk, setResultOk] = useState<boolean | null>(null)

  async function handleDelete() {
    setPhase("sending")
    setStepText("Mengirim perintah hapus ONU ke OLT...")

    try {
      const response = await fetch("/api/onu/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olt, onu }),
      })
      const result = (await response.json()) as { ok: boolean; message: string }

      setPhase("done")
      setResultOk(result.ok)
      setStepText(result.message)
    } catch {
      setPhase("done")
      setResultOk(false)
      setStepText("Gagal mengirim perintah hapus. Periksa koneksi ke OLT.")
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-onu-title">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-red-500/30 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-red-50 via-white to-amber-50 p-5 dark:from-red-950/35 dark:via-slate-950 dark:to-amber-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700 shadow-sm dark:bg-red-500/15 dark:text-red-200">
                {phase === "confirm" ? (
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                ) : phase === "sending" ? (
                  <RotateCw className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <CircleCheck className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div>
                <p id="delete-onu-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  {phase === "confirm" && "Hapus ONU dari OLT ?"}
                  {phase === "sending" && "Menghapus ONU..."}
                  {phase === "done" && (resultOk ? "ONU Dihapus" : "Hapus Gagal")}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {phase === "confirm" && "ONU akan dihapus permanen dari OLT. Data konfigurasi ONU di OLT akan hilang."}
                  {phase !== "confirm" && stepText}
                </p>
              </div>
            </div>
            {phase === "confirm" && (
              <button
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                type="button"
                onClick={onCancel}
                aria-label="Tutup popup konfirmasi hapus"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white/75 p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{onu.name || onu.serialNumber}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {onu.serialNumber} | {onu.ponPort}:{onu.onuIndex}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Status: {onu.status} {onu.rxPower !== 0 ? `| RX ${onu.rxPower} dBm` : ""}
            </p>
            {olt && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                OLT: {olt.name} ({olt.ipAddress}:{olt.cliPort || 23} · CLI/Telnet)
              </p>
            )}

            {phase === "done" && resultOk && (
              <div className="mt-3 rounded-xl bg-green-50 p-3 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-300">
                ONU berhasil dihapus dari OLT. Jika ONU masih menyala, ia akan mencoba registrasi ulang secara otomatis. Jika tidak ingin registrasi ulang, cabut atau matikan ONU secara fisik.
              </div>
            )}

            {phase === "done" && !resultOk && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {stepText}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end">
          {phase === "confirm" ? (
            <>
              <button className={secondaryButtonClass} type="button" onClick={onCancel}>
                Batal
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-500"
                type="button"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Ya, Hapus ONU
              </button>
            </>
          ) : phase === "sending" ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <RotateCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Menghapus...
            </div>
          ) : (
            <button
              className={secondaryButtonClass}
              type="button"
              onClick={onCancel}
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
