export function ConfigField({
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
}: {
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] ${mono ? "font-mono" : ""}`}
    />
  )
}
