import { NextResponse } from "next/server"

import { matchesOnuSearch, sortablePonKey } from "@/lib/onu-utils"
import { readMonitoringState } from "@/lib/server-db"
import type { Onu } from "@/lib/types"

export const runtime = "nodejs"

type OnuSortKey = "name" | "serialNumber" | "pon" | "rx" | "temperature" | "status" | "syncStatus"

function comparePonValues(a: string, b: string) {
  const toParts = (value: string) =>
    String(value)
      .split("/")
      .map((part) => Number(part) || 0)
  const partsA = toParts(a)
  const partsB = toParts(b)

  for (let index = 0; index < Math.max(partsA.length, partsB.length); index++) {
    const diff = (partsA[index] ?? 0) - (partsB[index] ?? 0)
    if (diff !== 0) return diff
  }

  return 0
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const oltId = url.searchParams.get("oltId") ?? ""
  const query = url.searchParams.get("query") ?? ""
  const status = url.searchParams.get("status") ?? "all"
  const pon = url.searchParams.get("pon") ?? ""
  const sortKey = (url.searchParams.get("sort") ?? "pon") as OnuSortKey
  const sortDirection = url.searchParams.get("direction") === "desc" ? ("desc" as const) : ("asc" as const)
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize")) || 25))
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)

  const state = await readMonitoringState()

  let oltOnus = state.onus
  if (oltId) oltOnus = oltOnus.filter((onu) => onu.oltId === oltId)

  const pons = [...new Set(oltOnus.map((onu) => onu.ponPort))]
    .filter(Boolean)
    .sort(comparePonValues)

  let onus = oltOnus
  if (pon) onus = onus.filter((onu) => onu.ponPort === pon)

  const search = query.trim().toLowerCase()
  if (search) onus = onus.filter((onu) => matchesOnuSearch(onu, search))

  if (status !== "all") onus = onus.filter((onu) => onu.status === status)

  const online = onus.filter((onu) => onu.status === "online").length
  const offline = onus.filter((onu) => onu.status !== "online").length

  const sorted = [...onus].sort((a, b) => {
    let valueA: string | number = ""
    let valueB: string | number = ""

    switch (sortKey) {
      case "name":
        valueA = a.name ?? ""
        valueB = b.name ?? ""
        break

      case "serialNumber":
        valueA = a.serialNumber ?? ""
        valueB = b.serialNumber ?? ""
        break

      case "pon":
        valueA = sortablePonKey(a)
        valueB = sortablePonKey(b)
        break

      case "rx":
        valueA = a.rxPower ?? -Infinity
        valueB = b.rxPower ?? -Infinity
        break

      case "temperature":
        valueA = a.temperatureC ?? -Infinity
        valueB = b.temperatureC ?? -Infinity
        break

      case "status":
        valueA = a.status ?? ""
        valueB = b.status ?? ""
        break

      case "syncStatus":
        valueA = a.syncStatus ?? ""
        valueB = b.syncStatus ?? ""
        break
    }

    if (typeof valueA === "number" && typeof valueB === "number") {
      return sortDirection === "asc" ? valueA - valueB : valueB - valueA
    }

    return sortDirection === "asc"
      ? String(valueA).localeCompare(String(valueB), "id", { numeric: true, sensitivity: "base" })
      : String(valueB).localeCompare(String(valueA), "id", { numeric: true, sensitivity: "base" })
  })

  const total = sorted.length
  const startIndex = (page - 1) * pageSize
  const paginatedOnus: Onu[] = sorted.slice(startIndex, startIndex + pageSize)

  return NextResponse.json({ onus: paginatedOnus, total, online, offline, page, pageSize, pons })
}
