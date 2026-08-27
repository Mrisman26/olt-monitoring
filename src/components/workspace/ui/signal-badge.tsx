import type { SignalTone } from "../types"

export function SignalBadge({ value, tone }: { value: string; tone: SignalTone }) {
  const styles: Record<SignalTone, string> = {
    good: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-900/5",
    warning: "border-amber-200 bg-amber-50 text-amber-700 shadow-amber-900/5",
    critical: "border-red-200 bg-red-50 text-red-700 shadow-red-900/5",
    empty: "border-slate-200 bg-slate-100 text-slate-600 shadow-slate-900/5",
  }

  return <span className={`inline-flex h-7 items-center rounded-lg border px-2.5 text-xs font-bold shadow-sm ${styles[tone]}`}>{value}</span>
}
