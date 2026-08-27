"use client"

import { Activity, RefreshCcw, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import type { Olt, Onu, RxPowerSample } from "@/lib/types"
import { type RxPowerRange, secondaryButtonClass } from "../types"

export function RxPowerHistoryDialog({
  onu,
  olt,
  onClose,
}: {
  onu: Onu
  olt: Olt | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [samples, setSamples] = useState<RxPowerSample[]>([])
  const [error, setError] = useState("")
  const [range, setRange] = useState<RxPowerRange>("24h")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchRxHistory = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/monitoring/rx-history?onuId=${encodeURIComponent(onu.id)}&range=${range}`, { signal })
      const data = (await response.json()) as { samples: RxPowerSample[] }
      setSamples(data.samples ?? [])
      setError("")
    } catch (cause) {
      if (signal?.aborted) return
      setError(cause instanceof Error ? cause.message : "Gagal membaca data RX power.")
    } finally {
      setLoading(false)
    }
  }, [onu.id, range])

  useEffect(() => {
    setLoading(true)
    setSamples([])
    setError("")
    const controller = new AbortController()
    void fetchRxHistory(controller.signal)
    return () => { controller.abort() }
  }, [fetchRxHistory])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => void fetchRxHistory(), 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchRxHistory])

  const chartData = samples.map((s) => ({
    time: s.timestamp.slice(11, 16),
    rxPower: s.rxPower,
    txPower: s.txPower,
  }))

  const latestSample = samples.length > 0 ? samples[samples.length - 1] : null
  const minRx = samples.length > 0 ? Math.min(...samples.map((s) => s.rxPower).filter((v) => v !== 0)) : 0
  const maxRx = samples.length > 0 ? Math.max(...samples.map((s) => s.rxPower).filter((v) => v !== 0)) : 0

  const rangeOptions: { label: string; value: RxPowerRange }[] = [
    { label: "1 Jam", value: "1h" },
    { label: "6 Jam", value: "6h" },
    { label: "24 Jam", value: "24h" },
    { label: "7 Hari", value: "7d" },
    { label: "30 Hari", value: "30d" },
  ]

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="rx-power-title">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-cyan-500/30 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-5 dark:border-slate-800 dark:from-cyan-950/35 dark:via-slate-950 dark:to-sky-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-100 text-cyan-700 shadow-sm dark:bg-cyan-500/15 dark:text-cyan-200">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p id="rx-power-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  PON Power Attenuation
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {onu.name || onu.serialNumber} | {onu.ponPort}:{onu.onuIndex}
                  {olt ? ` — ${olt.name}` : ""}
                </p>
              </div>
            </div>
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
              onClick={onClose}
              aria-label="Tutup grafik PON power"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition ${
                  range === opt.value
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
                type="button"
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {latestSample && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white/75 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/70">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-2.5 dark:border-cyan-500/20 dark:bg-cyan-950/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-300">Down (OLT → ONU)</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-[10px] text-slate-400">Rx:</span>
                    <span className="font-bold text-cyan-700 dark:text-cyan-200">{Number(latestSample.rxPower).toFixed(3)}(dBm)</span>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">Up (ONU → OLT)</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-[10px] text-slate-400">Tx:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-200">{Number(latestSample.txPower).toFixed(3)}(dBm)</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-slate-400">RX Minimum</p>
                  <p className="mt-0.5 font-bold text-amber-700 dark:text-amber-200">{Number(minRx).toFixed(3)}(dBm)</p>
                </div>
                <div>
                  <p className="text-slate-400">RX Maksimum</p>
                  <p className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-200">{Number(maxRx).toFixed(3)}(dBm)</p>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-[40vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <RefreshCcw className="h-6 w-6 animate-spin text-cyan-600" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Memuat data PON power...</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-200">
                <p className="font-semibold">Gagal membaca data PON power</p>
                <p className="mt-1 text-xs leading-5">{error}</p>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Belum ada data PON power</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Data akan mulai terkumpul setelah polling SNMP berjalan</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}
                      formatter={(value, name) => [`${Number(value).toFixed(3)}(dBm)`, name === "rxPower" ? "Down Rx (ONU)" : "Up Tx (ONU)"]}
                    />
                    <Legend
                      formatter={(value: string) => (value === "rxPower" ? "Down Rx (ONU)" : "Up Tx (ONU)")}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="rxPower" stroke="#06b6d4" fill="url(#rxGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="txPower" stroke="#10b981" fill="url(#txGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end">
          <button className={secondaryButtonClass} type="button" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
