import { infoTileAccent } from "../utils"

export function InfoTile({ label, value, tone = "border-slate-200 bg-white/70" }: { label: string; value: string; tone?: string }) {
  const accent = infoTileAccent(label)

  return (
    <div className={`relative overflow-hidden rounded-xl border p-3 shadow-sm ${tone}`}>
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.strip}`} />
      <dt className={`flex items-center gap-2 text-xs font-semibold ${accent.label}`}>
        <span className={`h-2 w-2 rounded-full shadow-lg ${accent.dot}`} />
        {label}
      </dt>
      <dd className={`mt-2 break-words text-sm font-extrabold ${accent.value}`}>{value || "-"}</dd>
    </div>
  )
}
