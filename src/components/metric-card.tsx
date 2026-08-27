type MetricCardProps = {
  label: string
  value: string
  detail: string
  tone?: "cyan" | "emerald" | "amber" | "red"
}

const toneStyles = {
  cyan: {
    line: "from-teal-400 via-cyan-400 to-sky-300",
    glow: "bg-teal-400/25",
    dot: "bg-teal-400",
    ring: "border-teal-300/40 bg-teal-400/10 text-teal-700",
  },
  emerald: {
    line: "from-emerald-400 via-teal-300 to-cyan-300",
    glow: "bg-emerald-400/25",
    dot: "bg-emerald-400",
    ring: "border-emerald-300/40 bg-emerald-400/10 text-emerald-700",
  },
  amber: {
    line: "from-amber-400 via-orange-300 to-yellow-200",
    glow: "bg-amber-400/25",
    dot: "bg-amber-400",
    ring: "border-amber-300/40 bg-amber-400/10 text-amber-700",
  },
  red: {
    line: "from-red-400 via-rose-400 to-orange-300",
    glow: "bg-red-400/25",
    dot: "bg-red-400",
    ring: "border-red-300/40 bg-red-400/10 text-red-700",
  },
}

export function MetricCard({ label, value, detail, tone = "cyan" }: MetricCardProps) {
  const styles = toneStyles[tone]

  return (
    <article className="premium-card group relative overflow-hidden rounded-2xl p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${styles.line}`} />
      <div className={`absolute -right-8 -top-10 h-28 w-28 rounded-full ${styles.glow} blur-3xl transition group-hover:scale-125`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text)]">{value}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${styles.ring}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${styles.dot} shadow-[0_0_18px_currentColor]`} />
        </div>
      </div>
    </article>
  )
}
