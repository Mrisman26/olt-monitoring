"use client"

import { Database, RefreshCcw, Save, X } from "lucide-react"
import { useState } from "react"
import type { Olt, Onu, InventoryFields } from "@/lib/types"
import type { ToastTone } from "../types"
import { TextInput } from "../ui/text-input"
import { secondaryButtonClass } from "../types"

export function InventoryEditDialog({
  targetType,
  item,
  onClose,
  onToast,
}: {
  targetType: "olt" | "onu"
  item: Olt | Onu
  onClose: () => void
  onToast: (msg: string, tone?: ToastTone) => void
}) {
  const inv = item.inventory ?? {}
  const [form, setForm] = useState<InventoryFields>({
    model: inv.model ?? "",
    serialNumber: inv.serialNumber ?? "",
    warrantyExpiry: inv.warrantyExpiry ?? "",
    installDate: inv.installDate ?? "",
    notes: inv.notes ?? "",
  })
  const [saving, setSaving] = useState(false)

  function updateField<K extends keyof InventoryFields>(key: K, value: InventoryFields[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const response = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId: item.id, inventory: form }),
      })
      const result = (await response.json()) as { ok: boolean; message: string }
      if (result.ok) {
        onToast(result.message, "success")
        onClose()
      } else {
        onToast(result.message, "error")
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Gagal menyimpan inventory.", "error")
    } finally {
      setSaving(false)
    }
  }

  const label = targetType === "olt" ? "OLT" : "ONU"

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="inventory-title">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-emerald-500/30 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5 dark:from-emerald-950/35 dark:via-slate-950 dark:to-cyan-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-200">
                <Database className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p id="inventory-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  Inventory {label}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {item.name} | {item.id}
                </p>
              </div>
            </div>
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
              onClick={onClose}
              aria-label="Tutup inventory"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <TextInput label="Model Perangkat" value={form.model ?? ""} onChange={(v) => updateField("model", v)} placeholder="GTGH-RG852G-W6" />
          <TextInput label="Serial Number" value={form.serialNumber ?? ""} onChange={(v) => updateField("serialNumber", v)} placeholder="ZHDDXXXXXXX" />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Tanggal Pasang" value={form.installDate ?? ""} onChange={(v) => updateField("installDate", v)} placeholder="2024-01-15" />
            <TextInput label="Garansi Hingga" value={form.warrantyExpiry ?? ""} onChange={(v) => updateField("warrantyExpiry", v)} placeholder="2027-01-15" />
          </div>
          <TextInput label="Catatan" value={form.notes ?? ""} onChange={(v) => updateField("notes", v)} placeholder="Catatan tambahan" />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end">
          <button className={secondaryButtonClass} type="button" onClick={onClose}>
            Batal
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Menyimpan..." : "Simpan Inventory"}
          </button>
        </div>
      </div>
    </div>
  )
}
