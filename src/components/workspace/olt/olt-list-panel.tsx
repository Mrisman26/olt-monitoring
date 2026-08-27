import { RefreshCcw, Wifi, Database, History, Pencil, Trash2 } from "lucide-react"
import type { Olt, Onu } from "@/lib/types"
import { StatusBadge } from "@/components/status-badge"
import { OltHeaderInfo } from "./olt-header-info"
import { InfoTile } from "../ui/info-tile"
import { EmptyState } from "../ui/empty-state"
import { oltAccent, friendlySystemValue, displayDeviceType, displayLocation, supportsSnmpWriteTest } from "../utils"
import { panelClass, secondaryButtonClass, cyanButtonClass } from "../types"

export function OltListPanel({
  olts,
  onus,
  selectedOltId,
  notice,
  onSelect,
  onEdit,
  onTest,
  onTestWrite,
  onTestCli,
  onPollOnu,
  pollingOltId,
  onRemove,
  onInventory,
  onHwHistory,
}: {
  olts: Olt[]
  onus: Onu[]
  selectedOltId?: string
  notice: string
  onSelect: (id: string) => void
  onEdit: (olt: Olt) => void
  onTest: (olt: Olt) => void
  onTestWrite: (olt: Olt) => void
  onTestCli: (olt: Olt) => void
  onPollOnu: (olt: Olt) => void
  pollingOltId: string | null
  onRemove: (olt: Olt) => void
  onInventory: (type: "olt" | "onu", item: Olt | Onu) => void
  onHwHistory: (type: "olt" | "onu", item: Olt | Onu) => void
}) {
  return (
    <section className={panelClass}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Daftar OLT</h2>
          <p className="text-sm text-slate-500">{notice}</p>
        </div>
        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {olts.length} perangkat
        </span>
      </div>
      {olts.length === 0 ? (
        <EmptyState title="Database masih kosong" text="Tambahkan IP OLT asli di form sebelah kiri." />
      ) : (
        <div className="mt-4 space-y-3">
          {olts.map((olt) => {
            const accent = oltAccent(olt)
            const selected = selectedOltId === olt.id

            return (
              <div
                key={olt.id}
                className={`relative overflow-hidden rounded-3xl border shadow-sm transition ${
                  selected ? accent.selectedCard : `${accent.card} hover:-translate-y-0.5 hover:shadow-lg`
                }`}
              >
                <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accent.strip}`} />
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <OltHeaderInfo olt={olt} accent={accent} onSelect={() => onSelect(olt.id)} />
                    <StatusBadge value={olt.status} />
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
                    <InfoTile label="Nama perangkat" value={friendlySystemValue(olt, "name")} tone={accent.tile} />
                    <InfoTile label="Tipe perangkat" value={displayDeviceType(olt)} tone={accent.tile} />
                    <InfoTile label="Alamat IP" value={`${olt.ipAddress}:${olt.snmpPort}`} tone={accent.tile} />
                    <InfoTile label="Lokasi" value={displayLocation(olt)} tone={accent.tile} />
                    <InfoTile label="Uptime" value={olt.uptime || "-"} tone={accent.tile} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
                    <button
                      className={`${cyanButtonClass} ${pollingOltId === olt.id ? "animate-pulse" : ""}`}
                      type="button"
                      disabled={pollingOltId === olt.id}
                      onClick={() => onPollOnu(olt)}
                    >
                      <RefreshCcw className={`h-3.5 w-3.5 ${pollingOltId === olt.id ? "animate-spin" : ""}`} aria-hidden="true" />
                      {pollingOltId === olt.id ? "Polling..." : "Poll ONU"}
                    </button>

                    <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => onTest(olt)}
                    >
                      <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                      Test
                    </button>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => onTestWrite(olt)}
                      disabled={!olt.hasSnmpWrite || olt.writeMode !== "snmp" || !supportsSnmpWriteTest(olt)}
                      title={
                        !supportsSnmpWriteTest(olt)
                          ? "Vendor ini belum punya test write SNMP"
                          : !olt.hasSnmpWrite
                            ? "Isi Write Community untuk mengaktifkan test write"
                            : olt.writeMode !== "snmp"
                              ? "Test write hanya untuk mode SNMP"
                              : "Test Write Community"
                      }
                    >
                      <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                      Write
                    </button>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => onTestCli(olt)}
                      disabled={!olt.hasCliCredentials}
                      title={
                        !olt.hasCliCredentials
                          ? "Isi Username/Password CLI di pengaturan OLT untuk test Telnet"
                          : "Test koneksi CLI (Telnet)"
                      }
                    >
                      <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                      CLI
                    </button>

                    <span className="grow" aria-hidden="true" />

                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => onInventory("olt", olt)}
                      title="Kelola inventory OLT"
                    >
                      <Database className="h-3.5 w-3.5" aria-hidden="true" />
                      Inventaris
                    </button>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => onHwHistory("olt", olt)}
                      title="Riwayat perubahan hardware"
                    >
                      <History className="h-3.5 w-3.5" aria-hidden="true" />
                      Riwayat HW
                    </button>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => onEdit(olt)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      className="grid h-9 w-9 place-items-center rounded-xl border border-red-200 bg-white text-red-700 shadow-sm transition hover:bg-red-50"
                      type="button"
                      onClick={() => onRemove(olt)}
                      aria-label={`Hapus ${olt.name}`}
                      title={`Hapus ${olt.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
