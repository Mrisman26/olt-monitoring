import { Activity, Database, FileCode, History, RotateCw, Trash2 } from "lucide-react"
import type { Onu } from "@/lib/types"

export function OnuActionDropdown(props: {
  onu: Onu
  rebootEnabled: boolean
  onHistory: () => void
  onConfig: () => void
  onTraffic: () => void
  onRxPower: () => void
  onInventory: () => void
  onHwHistory: () => void
  onReboot: () => void
  onDelete: () => void
}) {
  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
  const danger = "inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"

  return (
    <>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Info</span>
      <button className={btn} type="button" onClick={props.onHistory}>
        <History className="h-3 w-3 shrink-0" aria-hidden="true" /> Riwayat
      </button>
      <button className={btn} type="button" onClick={props.onConfig}>
        <FileCode className="h-3 w-3 shrink-0" aria-hidden="true" /> Konfigurasi
      </button>

      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Monitoring</span>
      {/* <button className={btn} type="button" onClick={props.onTraffic}>
        <Activity className="h-3 w-3 shrink-0" aria-hidden="true" /> Traffic
      </button> */}
      <button className={btn} type="button" onClick={props.onRxPower}>
        <Activity className="h-3 w-3 shrink-0" aria-hidden="true" /> PON Power
      </button>

      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Manajemen</span>
      <button className={btn} type="button" onClick={props.onInventory}>
        <Database className="h-3 w-3 shrink-0" aria-hidden="true" /> Inventaris
      </button>
      <button className={btn} type="button" onClick={props.onHwHistory}>
        <History className="h-3 w-3 shrink-0" aria-hidden="true" /> Riwayat HW
      </button>

      {props.rebootEnabled && (
        <>
          <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Aksi</span>
          <button className={btn} type="button" onClick={props.onReboot}>
            <RotateCw className="h-3 w-3 shrink-0" aria-hidden="true" /> Reboot
          </button>
          <button className={danger} type="button" onClick={props.onDelete}>
            <Trash2 className="h-3 w-3 shrink-0" aria-hidden="true" /> Hapus
          </button>
        </>
      )}
    </>
  )
}
