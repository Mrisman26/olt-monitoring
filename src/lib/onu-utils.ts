import type { Onu } from "@/lib/types"

export function zteInterfaceName(ponPort: string, onuIndex: string) {
  return `gpon-onu_1/${ponPort}:${onuIndex}`
}

export function onuPonLabel(onu: Onu) {
  return `${onu.ponPort}:${onu.onuIndex}`
}

export function sortablePonKey(onu: Onu) {
  const pon = String(onu.ponPort)
    .split("/")
    .map((segment) => segment.padStart(2, "0"))
    .join("/")
  return `${pon}:${String(onu.onuIndex).padStart(5, "0")}`
}

export function matchesOnuSearch(onu: Onu, search: string) {
  const query = search.trim().toLowerCase()

  if (!query) return true

  return [
    onu.name,
    onu.serialNumber,
    onuPonLabel(onu),
    zteInterfaceName(onu.ponPort, onu.onuIndex),
    onu.status,
    onu.syncStatus,
    onu.downReason,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query))
}
