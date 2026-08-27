import { Router, Save, Plus } from "lucide-react"
import type { Olt } from "@/lib/types"
import type { OltForm } from "../types"
import { panelClass, secondaryButtonClass } from "../types"
import { TextInput } from "../ui/text-input"
import { SelectInput } from "../ui/select-input"

export function OltFormPanel({
  form,
  editingOltName,
  onCancelEdit,
  onSave,
  onUpdate,
  onVendorChange,
}: {
  form: OltForm
  editingOltName?: string
  onCancelEdit: () => void
  onSave: () => void
  onUpdate: <K extends keyof OltForm>(key: K, value: OltForm[K]) => void
  onVendorChange: (vendor: Olt["vendor"]) => void
}) {
  const isEditing = Boolean(editingOltName)
  const secretHint = "tersimpan, biarkan kosong jika tidak diubah"

  return (
    <section className={panelClass}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-950">{isEditing ? "Edit OLT" : "Tambah OLT"}</h1>
          <p className="mt-1 text-xs text-slate-500">
            {isEditing ? `Mengubah konfigurasi ${editingOltName}.` : "Masukkan akses SNMP untuk mulai monitoring."}
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600/10 text-teal-800">
          <Router className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        <TextInput label="Nama OLT" value={form.name} onChange={(value) => onUpdate("name", value)} placeholder="OLT-AREA-01" />
        <TextInput label="IP/Host" value={form.ipAddress} onChange={(value) => onUpdate("ipAddress", value)} placeholder="192.168.1.10" />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            label="Vendor"
            value={form.vendor}
            onChange={(value) => onVendorChange(value as Olt["vendor"])}
            options={["VSOL", "HSGQ GPON", "HSGQ EPON", "Huawei", "ZTE", "FiberHome", "Other"]}
          />
          <SelectInput
            label="Mode rename ONU"
            value={form.writeMode}
            onChange={(value) => onUpdate("writeMode", value as Olt["writeMode"])}
            options={["none", "snmp", "cli", "api"]}
          />
        </div>
        <TextInput
          label="Nama Kartu"
          value={form.cardName}
          onChange={(value) => onUpdate("cardName", value)}
          placeholder="GTGH"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Port" value={form.snmpPort} onChange={(value) => onUpdate("snmpPort", value)} placeholder="161" />
          <TextInput label="Community" value={form.readCommunity} onChange={(value) => onUpdate("readCommunity", value)} placeholder="public" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Write Community"
            value={form.writeCommunity}
            onChange={(value) => onUpdate("writeCommunity", value)}
            placeholder={isEditing ? secretHint : "private atau sama dengan community"}
          />
          <TextInput label="Polling (detik)" value={form.pollingInterval} onChange={(value) => onUpdate("pollingInterval", value)} placeholder="60 detik" />
        </div>
        {(form.writeMode === "cli" || form.vendor === "ZTE") && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 p-3">
            <p className="text-xs font-semibold text-slate-700">Akses CLI (Telnet) untuk reboot ONU</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <TextInput label="Port" value={form.cliPort} onChange={(value) => onUpdate("cliPort", value)} placeholder="23" />
              <TextInput label="Username" value={form.cliUsername} onChange={(value) => onUpdate("cliUsername", value)} placeholder={isEditing ? secretHint : "root / admin"} />
              <TextInput
                label="Password"
                type="password"
                value={form.cliPassword}
                onChange={(value) => onUpdate("cliPassword", value)}
                placeholder={isEditing ? secretHint : "Password CLI OLT"}
              />
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 px-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/25 transition hover:from-teal-600 hover:to-cyan-600"
            type="button"
            onClick={onSave}
          >
            {isEditing ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {isEditing ? "Simpan Perubahan" : "Simpan OLT"}
          </button>
          {isEditing && (
            <button className={secondaryButtonClass} type="button" onClick={onCancelEdit}>
              Batal Edit
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
