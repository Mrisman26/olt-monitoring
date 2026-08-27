export function ConfigBlock({
  title,
  command,
  content,
  tone,
}: {
  title: string
  command: string
  content: string
  tone: "cyan" | "emerald"
}) {
  const empty = !content.trim()
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">{title}</h3>
        <code className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {command}
        </code>
      </div>
      {empty ? (
        <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-500">
          Tidak ada konfigurasi untuk blok ini.
        </div>
      ) : (
        <div className="relative mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-700">
          <span className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tone === "cyan" ? "from-cyan-400 to-sky-300" : "from-emerald-400 to-teal-300"}`} />
          <pre className="max-h-[38vh] overflow-auto whitespace-pre p-4 font-mono text-xs leading-relaxed text-emerald-100">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}
