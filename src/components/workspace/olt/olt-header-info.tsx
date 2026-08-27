import { Router, Shield } from "lucide-react"
import type { Olt } from "@/lib/types"
import type { OltAccent } from "../types"

export function OltHeaderInfo({ olt, accent, onSelect }: { olt: Olt; accent: OltAccent; onSelect: () => void }) {
  return (
    <button className="flex min-w-0 flex-1 items-start gap-3 text-left" type="button" onClick={onSelect}>
      <span className={`mt-0.5 grid h-12 w-12 shrink-0 place-items-center rounded-2xl shadow-lg ${accent.icon}`}>
        <Router className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-bold text-slate-950">{olt.name}</span>
        <span className={`block text-xs font-semibold ${accent.label}`}>{olt.vendor}</span>
        <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {olt.ipAddress}:{olt.snmpPort}
          </span>
        </span>
      </span>
    </button>
  )
}
