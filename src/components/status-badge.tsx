import type { AlertSeverity, OltStatus, Onu } from "@/lib/types"

type StatusBadgeProps = {
  value: OltStatus | Onu["status"] | AlertSeverity | Onu["syncStatus"]
}

const styles: Record<string, string> = {
  online:
    "border-emerald-300/60 bg-emerald-100/70 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
  degraded:
    "border-amber-300/60 bg-amber-100/70 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  offline:
    "border-slate-300/60 bg-slate-200/60 text-slate-600 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300",
  los: "border-red-300/60 bg-red-100/70 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
  critical:
    "border-red-300/60 bg-red-100/70 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
  warning:
    "border-amber-300/60 bg-amber-100/70 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  info: "border-sky-300/60 bg-sky-100/70 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200",
  synced:
    "border-emerald-300/60 bg-emerald-100/70 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
  pending:
    "border-amber-300/60 bg-amber-100/70 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  failed:
    "border-red-300/60 bg-red-100/70 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200",
  "local-only":
    "border-slate-300/60 bg-slate-200/60 text-slate-600 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300",
}

const dotStyles: Record<string, string> = {
  online: "bg-emerald-500",
  degraded: "bg-amber-500",
  offline: "bg-slate-400",
  los: "bg-red-500",
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
  synced: "bg-emerald-500",
  pending: "bg-amber-500",
  failed: "bg-red-500",
  "local-only": "bg-slate-400",
}

export function StatusBadge({ value }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${styles[value]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[value]}`} />
      {value.replace("-", " ")}
    </span>
  )
}
