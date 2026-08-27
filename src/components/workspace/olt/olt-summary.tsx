import { Router } from "lucide-react"
import type { Olt } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { InfoTile } from "../ui/info-tile"
import { oltAccent, displayDeviceType, displayLocation } from "../utils"

export function OltSummary({ olt }: { olt: Olt }) {
  const accent = oltAccent(olt)

  return (
    <div className="border-b border-slate-200 px-4 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-lg ${accent.icon}`}>
            <Router className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950">{olt.name}</p>
            <p className={`text-xs font-semibold ${accent.label}`}>{olt.vendor}</p>
            <p className="text-xs text-slate-500">
              {olt.ipAddress}:{olt.snmpPort}
            </p>
          </div>
        </div>
        <StatusBadge value={olt.status} />
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <InfoTile label="Tipe Perangkat" value={displayDeviceType(olt)} tone={accent.tile} />
        <InfoTile label="Lokasi" value={displayLocation(olt)} tone={accent.tile} />
        <InfoTile label="Uptime" value={olt.uptime || "-"} tone={accent.tile} />
        <InfoTile label="ONU Online" value={String(olt.activeOnu)} tone={accent.tile} />
      </dl>
    </div>
  )
}
