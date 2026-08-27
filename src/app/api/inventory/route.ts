import { NextResponse } from "next/server"

import { readMonitoringState, writeMonitoringState, insertHardwareHistory } from "@/lib/server-db"
import type { HardwareHistoryEntry, InventoryFields, MonitoringState, Olt, Onu } from "@/lib/types"
import { requireAuth, getClientIp } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

const inventoryFieldLabels: Record<keyof InventoryFields, string> = {
  model: "Model",
  serialNumber: "Serial Number",
  warrantyExpiry: "Garansi",
  installDate: "Tanggal Pasang",
  notes: "Catatan",
}

export async function PUT(request: Request) {
  const auth = await requireAuth(request)
  if (!auth.ok) return auth.response

  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(`inventory:${ip}`, 30, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfterMs / 1000)} detik.` },
      { status: 429 },
    )
  }

  const body = (await request.json()) as {
    targetType: "olt" | "onu"
    targetId: string
    inventory: InventoryFields
  }

  const { targetType, targetId, inventory } = body

  if (!targetType || !targetId) {
    return NextResponse.json({ ok: false, message: "Target type dan ID wajib diisi." }, { status: 400 })
  }

  const state = await readMonitoringState()

  let oldInventory: InventoryFields | undefined
  if (targetType === "olt") {
    const target = state.olts.find((olt) => olt.id === targetId)
    oldInventory = target?.inventory
  } else {
    const target = state.onus.find((onu) => onu.id === targetId)
    oldInventory = target?.inventory
  }

  const nextState = { ...state }

  if (targetType === "olt") {
    nextState.olts = state.olts.map((olt) => {
      if (olt.id !== targetId) return olt
      return { ...olt, inventory: { ...olt.inventory, ...inventory } }
    })
  } else {
    nextState.onus = state.onus.map((onu) => {
      if (onu.id !== targetId) return onu
      return { ...onu, inventory: { ...onu.inventory, ...inventory } }
    })
  }

  await writeMonitoringState(nextState, state)

  const now = new Date().toISOString()
  const diffFields = Object.keys(inventory) as (keyof InventoryFields)[]
  for (const field of diffFields) {
    const oldVal = oldInventory?.[field] ?? ""
    const newVal = inventory[field] ?? ""
    if (oldVal !== newVal) {
      const entry: HardwareHistoryEntry = {
        targetType,
        targetId,
        fieldName: inventoryFieldLabels[field] ?? field,
        oldValue: oldVal || null,
        newValue: newVal || null,
        actor: auth.session.username,
        timestamp: now,
      }
      await insertHardwareHistory(entry)
    }
  }

  return NextResponse.json({ ok: true, message: `${targetType === "olt" ? "OLT" : "ONU"} inventory berhasil diperbarui.` })
}
