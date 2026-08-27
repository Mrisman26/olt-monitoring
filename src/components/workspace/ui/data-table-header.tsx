"use client"

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"

type SortKey = "name" | "serialNumber" | "pon" | "rx" | "temperature" | "status" | "syncStatus"

export function DataTableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  direction: "asc" | "desc"
  onSort: (key: SortKey) => void
}) {
  const active = activeKey === sortKey

  return (
    <th className="px-4 py-3 font-semibold">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="group inline-flex items-center gap-1.5 whitespace-nowrap transition hover:text-[var(--accent)]"
      >
        <span>{label}</span>

        {!active ? (
          <ChevronsUpDown
            className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-[var(--accent-bright)]"
            aria-hidden="true"
          />
        ) : direction === "asc" ? (
          <ChevronUp
            className="h-3.5 w-3.5 text-[var(--accent)]"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="h-3.5 w-3.5 text-[var(--accent)]"
            aria-hidden="true"
          />
        )}
      </button>
    </th>
  )
}
