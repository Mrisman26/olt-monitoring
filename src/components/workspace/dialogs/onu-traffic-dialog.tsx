"use client"

import { Activity, RefreshCcw, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import type { Olt, Onu, TrafficSample } from "@/lib/types"
import { type TrafficRange, secondaryButtonClass } from "../types"

export function OnuTrafficDialog({
  onu,
  olt,
  onClose,
}: {
  onu: Onu
  olt: Olt | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [samples, setSamples] = useState<TrafficSample[]>([])
  const [error, setError] = useState("")
  const [range, setRange] = useState<TrafficRange>("1h")
  const [unit, setUnit] = useState<"bps" | "pps">("bps")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchTraffic = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/monitoring/traffic?onuId=${encodeURIComponent(onu.id)}&range=${range}`, { signal })
      const data = (await response.json()) as { samples: TrafficSample[] }
      setSamples(data.samples ?? [])
      setError("")
    } catch (cause) {
      if (signal?.aborted) return
      setError(cause instanceof Error ? cause.message : "Gagal membaca data traffic.")
    } finally {
      setLoading(false)
    }
  }, [onu.id, range])

  useEffect(() => {
    setLoading(true)
    setSamples([])
    setError("")
    const controller = new AbortController()
    void fetchTraffic(controller.signal)
    return () => { controller.abort() }
  }, [fetchTraffic])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      void fetchTraffic()
    }, 60_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchTraffic])

  const chartData = samples.map((s) => {
    const time = s.timestamp.slice(11, 16)
    return {
      time,
      input: unit === "bps" ? Math.round(s.inputBps / 1000) : s.inputPps,
      output: unit === "bps" ? Math.round(s.outputBps / 1000) : s.outputPps,
    }
  })

  const latestSample = samples.length > 0 ? samples[samples.length - 1] : null

  function formatBandwidth(bps: number) {
    if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`
    if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`
    if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`
    return `${bps} bps`
  }

  const rangeOptions: { label: string; value: TrafficRange }[] = [
    { label: "1 Jam", value: "1h" },
    { label: "6 Jam", value: "6h" },
    { label: "24 Jam", value: "24h" },
    { label: "7 Hari", value: "7d" },
    { label: "30 Hari", value: "30d" },
  ]

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="onu-traffic-title">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-emerald-500/30 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5 dark:border-slate-800 dark:from-emerald-950/35 dark:via-slate-950 dark:to-cyan-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-200">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p id="onu-traffic-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  Grafik Traffic
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
              aria-label="Tutup grafik traffic"
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
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
                type="button"
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
            <span className="ml-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <button
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition ${
                unit === "bps"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
              type="button"
              onClick={() => setUnit("bps")}
            >
              Kbps
            </button>
            <button
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition ${
                unit === "pps"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
              type="button"
              onClick={() => setUnit("pps")}
            >
              Pps
            </button>
          </div>

          {latestSample && (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white/75 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/70 sm:grid-cols-4">
              <div>
                <p className="text-slate-400">Download (sekarang)</p>
                <p className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-200">
                  {unit === "bps" ? formatBandwidth(latestSample.inputBps) : `${latestSample.inputPps} pps`}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Upload (sekarang)</p>
                <p className="mt-0.5 font-bold text-cyan-700 dark:text-cyan-200">
                  {unit === "bps" ? formatBandwidth(latestSample.outputBps) : `${latestSample.outputPps} pps`}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Download (peak)</p>
                <p className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-200">
                  {(() => {
                    const maxIn = Math.max(...samples.map((s) => (unit === "bps" ? s.inputBps : s.inputPps)))
                    return unit === "bps" ? formatBandwidth(maxIn) : `${maxIn} pps`
                  })()}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Upload (peak)</p>
                <p className="mt-0.5 font-bold text-cyan-700 dark:text-cyan-200">
                  {(() => {
                    const maxOut = Math.max(...samples.map((s) => (unit === "bps" ? s.outputBps : s.outputPps)))
                    return unit === "bps" ? formatBandwidth(maxOut) : `${maxOut} pps`
                  })()}
                </p>
              </div>
            </div>
          )}

          <div className="max-h-[40vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <RefreshCcw className="h-6 w-6 animate-spin text-emerald-600" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Memuat data traffic...</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-200">
                <p className="font-semibold">Gagal membaca data traffic</p>
                <p className="mt-1 text-xs leading-5">{error}</p>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Belum ada data traffic</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Data akan mulai terkumpul setelah polling SNMP berjalan (interval 120 detik)
                </p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}
                      formatter={(value, name) => [
                        unit === "bps" ? `${value} Kbps` : `${value} pps`,
                        name === "input" ? "Download" : "Upload",
                      ]}
                    />
                    <Legend
                      formatter={(value: string) => (value === "input" ? "Download" : "Upload")}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="input" stroke="#06b6d4" fill="url(#colorInput)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="output" stroke="#10b981" fill="url(#colorOutput)" strokeWidth={2} dot={false} />
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
