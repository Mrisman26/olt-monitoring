"use client"

import { CircleCheck, Power, RotateCw, X } from "lucide-react"
import { useEffect, useState } from "react"
import type { Onu, Olt } from "@/lib/types"
import { secondaryButtonClass } from "../types"

export function RebootConfirmDialog({
  onu,
  olt,
  onCancel,
}: {
  onu: Onu
  olt: Olt | null
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<"confirm" | "sending" | "waiting" | "done">("confirm")
  const [stepText, setStepText] = useState("")
  const [resultOk, setResultOk] = useState<boolean | null>(null)
  const [countdown, setCountdown] = useState(30)

  async function handleReboot() {
    setPhase("sending")
    setStepText("Mengirim perintah reboot via SNMP...")

    try {
      const response = await fetch("/api/onu/reboot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olt, onu }),
      })
      const result = (await response.json()) as { ok: boolean; message: string }

      if (!result.ok) {
        setPhase("done")
        setResultOk(false)
        setStepText(result.message)
        return
      }

      setResultOk(true)
      setPhase("waiting")
      setStepText("Perintah reboot terkirim. Menunggu ONU menyala kembali...")
    } catch {
      setPhase("done")
      setResultOk(false)
      setStepText("Gagal mengirim perintah reboot. Periksa koneksi ke OLT.")
    }
  }

  useEffect(() => {
    if (phase !== "waiting") return
    if (countdown <= 0) {
      setPhase("done")
      setStepText("Proses reboot selesai. ONU membutuhkan waktu beberapa menit untuk sinkronisasi penuh.")
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reboot-onu-title">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-amber-500/30 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-amber-50 via-white to-red-50 p-5 dark:from-amber-950/35 dark:via-slate-950 dark:to-red-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-500/15 dark:text-amber-200">
                {phase === "confirm" || phase === "sending" ? (
                  <Power className="h-5 w-5" aria-hidden="true" />
                ) : phase === "waiting" ? (
                  <RotateCw className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <CircleCheck className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div>
                <p id="reboot-onu-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  {phase === "confirm" && "Reboot ONU/ONT ini ?"}
                  {phase === "sending" && "Mengirim Perintah..."}
                  {phase === "waiting" && "Menunggu ONU Restart..."}
                  {phase === "done" && (resultOk ? "Reboot Berhasil" : "Reboot Gagal")}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {phase === "confirm" && "Layanan ONU/ONT akan terputus sementara selama proses reboot berlangsung."}
                  {phase !== "confirm" && stepText}
                </p>
              </div>
            </div>
            {phase !== "sending" && (
              <button
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                type="button"
                onClick={onCancel}
                aria-label="Tutup popup reboot"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {phase === "confirm" && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white/75 p-4 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{onu.name || onu.serialNumber}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {onu.serialNumber} | {onu.ponPort}:{onu.onuIndex}
              </p>
            </div>
          )}

          {phase === "waiting" && (
            <div className="mt-5 flex flex-col items-center gap-3">
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-700" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${(countdown / 30) * 213.6} 213.6`} className="text-amber-500 transition-all duration-1000" />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-2xl font-bold text-slate-950 dark:text-slate-50">{countdown}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">detik tersisa</p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end">
          {phase === "confirm" ? (
            <>
              <button className={secondaryButtonClass} type="button" onClick={onCancel}>
                Batal
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white shadow-lg shadow-amber-900/20 transition hover:bg-amber-500"
                type="button"
                onClick={() => void handleReboot()}
              >
                <Power className="h-4 w-4" aria-hidden="true" />
                Ya, Reboot
              </button>
            </>
          ) : phase === "sending" ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <RotateCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Mengirim...
            </div>
          ) : (
            <button className={secondaryButtonClass} type="button" onClick={onCancel}>
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
