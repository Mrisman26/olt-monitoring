"use client"

export function ToggleInput({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="h-5 w-5 accent-cyan-700"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}
