"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import { Database } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import type { Alert, Olt, Onu, PonPortStatus } from "@/lib/types"
import { OltSummary } from "../olt/olt-summary"
import { EmptyState } from "../ui/empty-state"
import { panelClass, tableShellClass } from "../types"

export function DashboardView({
  olts,
  onus,
  alerts,
  notice,
  selectedOltId,
  onSelectOlt,
}: {
  olts: Olt[]
  onus: Onu[]
  alerts: Alert[]
  notice: string
  selectedOltId: string
  onSelectOlt: (id: string) => void
}) {
  const [ponStatus, setPonStatus] = useState<PonPortStatus[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedOltId) params.set("oltId", selectedOltId)
    fetch(`/api/monitoring/pon-status?${params.toString()}`)
      .then((r) => r.json())
      .then((data: { ponStatus: PonPortStatus[] }) => setPonStatus(data.ponStatus ?? []))
      .catch(() => {})
  }, [selectedOltId, onus.length])

  const pieColors = ["#10b981", "#ef4444", "#f59e0b", "#64748b"]

  const pieData = ponStatus
    .flatMap((port) => [
      { name: `${port.ponPort} Online`, value: port.online, color: "#10b981" },
      { name: `${port.ponPort} Offline`, value: port.offline, color: "#ef4444" },
      { name: `${port.ponPort} LOS`, value: port.los, color: "#f59e0b" },
    ])
    .filter((d) => d.value > 0)

  const globalPieData = [
    { name: "Online", value: onus.filter((o) => o.status === "online").length, color: "#10b981" },
    { name: "Offline", value: onus.filter((o) => o.status === "offline").length, color: "#ef4444" },
    { name: "LOS", value: onus.filter((o) => o.status === "los").length, color: "#f59e0b" },
  ].filter((d) => d.value > 0)

  const displayPieData = ponStatus.length > 0 && selectedOltId ? pieData : globalPieData

  return (
    <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className={panelClass}>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600/10 text-teal-800">
            <Database className="h-4 w-4" aria-hidden="true" />
          </span>
          <h1 className="text-sm font-semibold text-slate-950">Status Awal</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">{notice}</p>

        {displayPieData.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status ONU per PON Port {selectedOltId ? "(OLT dipilih)" : "(Semua OLT)"}
              </h2>
              {olts.length > 1 && (
                <select
                  className="h-8 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  value={selectedOltId}
                  onChange={(e) => onSelectOlt(e.target.value)}
                >
                  <option value="">Semua OLT</option>
                  {olts.map((olt) => (
                    <option key={olt.id} value={olt.id}>
                      {olt.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="h-[220px] w-[220px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {displayPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}
                      formatter={(value, name) => [`${value} ONU`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2">
                {displayPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900/70">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{entry.name}</span>
                    <span className="font-bold text-slate-950 dark:text-slate-50">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {olts.length === 0 ? (
          <EmptyState title="Belum ada OLT" text="Masuk ke menu OLT untuk menambahkan perangkat." />
        ) : (
          <div className={tableShellClass}>
            {olts.map((olt) => (
              <OltSummary key={olt.id} olt={olt} />
            ))}
          </div>
        )}
      </div>

      <div className={panelClass}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-950">Alert Terbaru</h2>
          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
            {alerts.length}
          </span>
        </div>
        {alerts.length === 0 ? (
          <EmptyState title="Belum ada alert" text="Semua perangkat dalam kondisi aman berdasarkan data polling terakhir." />
        ) : (
          <div className="mt-3 space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-950">{alert.title}</p>
                  <StatusBadge value={alert.severity} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{alert.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
