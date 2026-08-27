"use client"

import { RotateCw, Wifi, X } from "lucide-react"
import { useEffect, useState } from "react"
import type { Olt } from "@/lib/types"
import { secondaryButtonClass } from "../types"

export function UncfgOnuDialog({
  olt,
  onClose,
}: {
  olt: Olt
  onClose: () => void
}) {
  const [phase, setPhase] = useState<"loading" | "done">("loading")
  const [entries, setEntries] = useState<{ interfaceId: string; serialNumber: string; state: string }[]>([])
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    let cancelled = false

    fetch("/api/onu/uncfg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ olt }),
    })
      .then((res) => res.json() as Promise<{ ok: boolean; message: string; entries: { interfaceId: string; serialNumber: string; state: string }[] }>)
      .then((data) => {
        if (cancelled) return
        setPhase("done")
        if (data.ok) {
          setEntries(data.entries)
        } else {
          setErrorMsg(data.message)
        }
      })
      .catch(() => {
        if (cancelled) return
        setPhase("done")
        setErrorMsg("Gagal mengambil data ONU unconfigured.")
      })

    return () => { cancelled = true }
  }, [olt])

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="uncfg-onu-title">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-amber-500/30 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 dark:from-amber-950/35 dark:via-slate-950 dark:to-orange-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-500/15 dark:text-amber-200">
                <Wifi className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p id="uncfg-onu-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  ONU Unconfigured
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Daftar ONU yang terdaftar di PON tapi belum dikonfigurasi di OLT {olt.name}.
                </p>
              </div>
            </div>
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
              onClick={onClose}
              aria-label="Tutup"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {phase === "loading" && (
            <div className="flex items-center justify-center gap-3 py-8 text-sm text-slate-500 dark:text-slate-400">
              <RotateCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Mengambil data dari OLT...
            </div>
          )}

          {phase === "done" && errorMsg && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {phase === "done" && !errorMsg && entries.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Tidak ada ONU unconfigured yang ditemukan.
            </div>
          )}

          {phase === "done" && entries.length > 0 && (
            <>
              <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Total: <span className="font-semibold text-amber-600 dark:text-amber-400">{entries.length}</span> ONU
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Interface</th>
                      <th className="px-4 py-2.5 font-semibold">Serial Number</th>
                      <th className="px-4 py-2.5 font-semibold">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {entries.map((entry) => (
                      <tr key={entry.interfaceId} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {entry.interfaceId}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {entry.serialNumber}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            {entry.state}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            className={secondaryButtonClass}
            type="button"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
