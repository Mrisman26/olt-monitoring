"use client"

import { CircleAlert, CircleCheck, Power, RotateCw, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Onu, Olt } from "@/lib/types"
import { secondaryButtonClass } from "../types"

type ItemStatus = "pending" | "sending" | "ok" | "fail"

type ItemResult = {
  onu: Onu
  status: ItemStatus
  message: string
}

export function BulkRebootDialog({
  onus,
  olt,
  onCancel,
}: {
  onus: Onu[]
  olt: Olt | null
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<"confirm" | "sending" | "done">("confirm")
  const [items, setItems] = useState<ItemResult[]>(() =>
    onus.map((onu) => ({ onu, status: "pending" as ItemStatus, message: "" }))
  )
  const [currentIdx, setCurrentIdx] = useState(0)
  const cancelledRef = useRef(false)

  const updateItem = useCallback((idx: number, patch: Partial<ItemResult>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }, [])

  async function processNext(idx: number) {
    if (cancelledRef.current || idx >= onus.length) {
      setPhase("done")
      return
    }

    const onu = onus[idx]
    setCurrentIdx(idx)
    updateItem(idx, { status: "sending", message: "Mengirim perintah reboot..." })

    try {
      const response = await fetch("/api/onu/reboot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olt, onu }),
      })
      const result = (await response.json()) as { ok: boolean; message: string }
      updateItem(idx, { status: result.ok ? "ok" : "fail", message: result.message })
    } catch {
      updateItem(idx, { status: "fail", message: "Gagal mengirim perintah reboot" })
    }

    if (!cancelledRef.current && idx + 1 < onus.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      void processNext(idx + 1)
    } else {
      setPhase("done")
    }
  }

  function handleConfirm() {
    setPhase("sending")
    cancelledRef.current = false
    void processNext(0)
  }

  function handleCancel() {
    cancelledRef.current = true
    onCancel()
  }

  useEffect(() => {
    return () => { cancelledRef.current = true }
  }, [])

  const doneCount = items.filter((i) => i.status === "ok" || i.status === "fail").length
  const okCount = items.filter((i) => i.status === "ok").length
  const failCount = items.filter((i) => i.status === "fail").length
  const allDone = phase === "done"

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="bulk-reboot-title">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-amber-500/30 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-amber-50 via-white to-red-50 p-5 dark:from-amber-950/35 dark:via-slate-950 dark:to-red-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-500/15 dark:text-amber-200">
                {phase === "confirm" ? (
                  <Power className="h-5 w-5" aria-hidden="true" />
                ) : phase === "sending" ? (
                  <RotateCw className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <CircleCheck className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div>
                <p id="bulk-reboot-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  {phase === "confirm" && `Reboot ${onus.length} ONU/ONT sekaligus ?`}
                  {phase === "sending" && `Mengirim reboot... (${doneCount}/${onus.length})`}
                  {phase === "done" && "Reboot Selesai"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {phase === "confirm" && "Layanan ONU/ONT akan terputus sementara selama proses reboot berlangsung."}
                  {phase === "sending" && `Sedang memproses ${onus[currentIdx]?.name || onus[currentIdx]?.serialNumber || "ONU"}...`}
                  {phase === "done" && `Berhasil: ${okCount} | Gagal: ${failCount} dari ${onus.length} ONU`}
                </p>
              </div>
            </div>
            {phase !== "sending" && (
              <button
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                type="button"
                onClick={handleCancel}
                aria-label="Tutup popup reboot"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          {phase === "sending" && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${onus.length > 0 ? (doneCount / onus.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* ONU list */}
          <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white/75 dark:border-slate-700 dark:bg-slate-900/70">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">No</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nama</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Serial</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, i) => (
                  <tr key={item.onu.id} className="hover:bg-amber-50/50 dark:hover:bg-amber-950/10">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.onu.name || "-"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{item.onu.serialNumber || "-"}</span>
                    </td>
                    <td className="px-3 py-2">
                      {item.status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                          Menunggu
                        </span>
                      )}
                      {item.status === "sending" && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <RotateCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                          Mengirim...
                        </span>
                      )}
                      {item.status === "ok" && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CircleCheck className="h-3 w-3" aria-hidden="true" />
                          Berhasil
                        </span>
                      )}
                      {item.status === "fail" && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                          <CircleAlert className="h-3 w-3" aria-hidden="true" />
                          Gagal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end">
          {phase === "confirm" ? (
            <>
              <button className={secondaryButtonClass} type="button" onClick={handleCancel}>
                Batal
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white shadow-lg shadow-amber-900/20 transition hover:bg-amber-500"
                type="button"
                onClick={handleConfirm}
              >
                <Power className="h-4 w-4" aria-hidden="true" />
                Ya, Reboot {onus.length} ONU
              </button>
            </>
          ) : phase === "sending" ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <RotateCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Memproses {doneCount}/{onus.length}...
            </div>
          ) : (
            <button className={secondaryButtonClass} type="button" onClick={handleCancel}>
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
