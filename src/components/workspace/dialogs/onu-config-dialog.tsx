"use client"

import { FileCode, Plus, RefreshCcw, Save, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Olt, Onu, OnuOmciConfigResult } from "@/lib/types"
import {
  emptyInterfaceConfig,
  emptyOnuMngConfig,
  parseInterfaceConfig,
  parseOnuMngConfig,
  type ParsedInterfaceConfig,
  type ParsedOnuMngConfig,
} from "@/lib/onu-config"
import { ConfigBlock } from "../ui/config-block"
import { ConfigField } from "../ui/config-field"
import { secondaryButtonClass } from "../types"

function num(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function OnuConfigDialog({
  onu,
  olt,
  onClose,
}: {
  onu: Onu
  olt: Olt | null
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<OnuOmciConfigResult | null>(null)
  const [error, setError] = useState("")
  const [interfaceCfg, setInterfaceCfg] = useState<ParsedInterfaceConfig>(emptyInterfaceConfig())
  const [mngCfg, setMngCfg] = useState<ParsedOnuMngConfig>(emptyOnuMngConfig())
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveNotice, setSaveNotice] = useState("")

  const onuRef = useRef(onu)
  onuRef.current = onu
  const oltRef = useRef(olt)
  oltRef.current = olt

  const onuId = onu.id
  const oltId = olt?.id ?? ""

  const load = useCallback(async () => {
    const currentOnu = onuRef.current
    const currentOlt = oltRef.current
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/onu/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olt: currentOlt, onu: currentOnu }),
      })
      const data = (await response.json()) as OnuOmciConfigResult
      if (!data.ok) {
        setError(data.message)
        setResult(null)
        return
      }
      setResult(data)
      setInterfaceCfg(parseInterfaceConfig(data.interfaceConfig))
      setMngCfg(parseOnuMngConfig(data.onuMngConfig))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal membaca konfigurasi OMCI.")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [onuId, oltId])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  function startEdit() {
    if (!result) return
    setInterfaceCfg(parseInterfaceConfig(result.interfaceConfig))
    setMngCfg(parseOnuMngConfig(result.onuMngConfig))
    setSaveError("")
    setSaveNotice("")
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError("")
    setSaveNotice("")
  }

  async function saveConfig() {
    setSaving(true)
    setSaveError("")
    setSaveNotice("")
    try {
      const response = await fetch("/api/onu/config/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olt, onu, interfaceConfig: interfaceCfg, onuMngConfig: mngCfg }),
      })
      const data = (await response.json()) as { ok: boolean; message: string }
      if (!data.ok) {
        setSaveError(data.message)
        return
      }
      setSaveNotice(data.message)
      setEditing(false)
      await load()
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Gagal menyimpan konfigurasi.")
    } finally {
      setSaving(false)
    }
  }

  function nextId(items: { id: number }[]) {
    return items.reduce((max, item) => Math.max(max, item.id), 0) + 1
  }

  function renderSectionHeader(title: string, tone: string) {
    return (
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone}`} />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">{title}</h3>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="onu-config-title">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-sky-500/30 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 dark:border-slate-800 dark:from-sky-950/35 dark:via-slate-950 dark:to-indigo-950/25">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm dark:bg-sky-500/15 dark:text-sky-200">
                <FileCode className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p id="onu-config-title" className="text-base font-bold text-slate-950 dark:text-slate-50">
                  Konfigurasi OMCI
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {onu.name || onu.serialNumber} | {onu.ponPort}:{onu.onuIndex}
                  {olt ? ` — ${olt.name}` : ""}
                </p>
                {editing && (
                  <span className="mt-2 inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-300/30 dark:bg-amber-950/30 dark:text-amber-200">
                    Mode edit — perubahan akan dikirim ke OLT
                  </span>
                )}
              </div>
            </div>
            <button
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              type="button"
              onClick={onClose}
              aria-label="Tutup popup konfigurasi OMCI"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="max-h-[66vh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <RefreshCcw className="h-6 w-6 animate-spin text-[var(--accent)]" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Membaca konfigurasi dari OLT...
              </p>
              <p className="text-xs text-slate-400">Menjalankan show run int dan show onu run con via Telnet</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-200">
              <p className="font-semibold">Gagal membaca konfigurasi</p>
              <p className="mt-1 text-xs leading-5">{error}</p>
            </div>
          ) : editing ? (
            <div className="space-y-5">
              <section className="rounded-2xl border border-cyan-200/70 bg-white/75 p-4 dark:border-cyan-500/20 dark:bg-slate-900/70">
                {renderSectionHeader("Interface", "bg-cyan-400 shadow-cyan-400/50")}

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nama</span>
                    <ConfigField value={interfaceCfg.name} onChange={(value) => setInterfaceCfg({ ...interfaceCfg, name: value })} placeholder="Nama ONU di OLT" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Deskripsi</span>
                    <ConfigField value={interfaceCfg.description} onChange={(value) => setInterfaceCfg({ ...interfaceCfg, description: value })} placeholder="Contoh: 100M" />
                  </label>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">T-CONT</span>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => setInterfaceCfg({ ...interfaceCfg, tconts: [...interfaceCfg.tconts, { id: nextId(interfaceCfg.tconts), name: "T" + (interfaceCfg.tconts.length + 1), profile: "100M" }] })}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {interfaceCfg.tconts.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada T-CONT.</p>
                    ) : (
                      interfaceCfg.tconts.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <ConfigField value={String(item.id)} onChange={() => undefined} placeholder="ID" />
                          <ConfigField value={item.name} onChange={(value) => setInterfaceCfg({ ...interfaceCfg, tconts: interfaceCfg.tconts.map((i) => (i.id === item.id ? { ...i, name: value } : i)) })} placeholder="Nama" />
                          <ConfigField value={item.profile} onChange={(value) => setInterfaceCfg({ ...interfaceCfg, tconts: interfaceCfg.tconts.map((i) => (i.id === item.id ? { ...i, profile: value } : i)) })} placeholder="Profile" />
                          <button
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-300"
                            type="button"
                            onClick={() => setInterfaceCfg({ ...interfaceCfg, tconts: interfaceCfg.tconts.filter((i) => i.id !== item.id) })}
                            aria-label={`Hapus T-CONT ${item.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">GEMPORT</span>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => setInterfaceCfg({ ...interfaceCfg, gemports: [...interfaceCfg.gemports, { id: nextId(interfaceCfg.gemports), tcont: interfaceCfg.tconts[0]?.id ?? 1 }] })}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {interfaceCfg.gemports.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada GEMPORT.</p>
                    ) : (
                      interfaceCfg.gemports.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <ConfigField value={String(item.id)} onChange={() => undefined} placeholder="ID" />
                          <ConfigField value={String(item.tcont)} onChange={(value) => setInterfaceCfg({ ...interfaceCfg, gemports: interfaceCfg.gemports.map((i) => (i.id === item.id ? { ...i, tcont: num(value) } : i)) })} placeholder="T-CONT" mono />
                          <button
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-300"
                            type="button"
                            onClick={() => setInterfaceCfg({ ...interfaceCfg, gemports: interfaceCfg.gemports.filter((i) => i.id !== item.id) })}
                            aria-label={`Hapus GEMPORT ${item.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">SERVICE-PORT</span>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => setInterfaceCfg({ ...interfaceCfg, servicePorts: [...interfaceCfg.servicePorts, { id: nextId(interfaceCfg.servicePorts), vport: 1, userVlan: 0, vlan: 0 }] })}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {interfaceCfg.servicePorts.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada SERVICE-PORT.</p>
                    ) : (
                      interfaceCfg.servicePorts.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <ConfigField value={String(item.id)} onChange={() => undefined} placeholder="ID" />
                          <ConfigField value={String(item.vport)} onChange={(value) => setInterfaceCfg({ ...interfaceCfg, servicePorts: interfaceCfg.servicePorts.map((i) => (i.id === item.id ? { ...i, vport: num(value) } : i)) })} placeholder="VPort" mono />
                          <ConfigField value={String(item.userVlan)} onChange={(value) => setInterfaceCfg({ ...interfaceCfg, servicePorts: interfaceCfg.servicePorts.map((i) => (i.id === item.id ? { ...i, userVlan: num(value) } : i)) })} placeholder="User VLAN" mono />
                          <ConfigField value={String(item.vlan)} onChange={(value) => setInterfaceCfg({ ...interfaceCfg, servicePorts: interfaceCfg.servicePorts.map((i) => (i.id === item.id ? { ...i, vlan: num(value) } : i)) })} placeholder="VLAN" mono />
                          <button
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-300"
                            type="button"
                            onClick={() => setInterfaceCfg({ ...interfaceCfg, servicePorts: interfaceCfg.servicePorts.filter((i) => i.id !== item.id) })}
                            aria-label={`Hapus SERVICE-PORT ${item.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-emerald-200/70 bg-white/75 p-4 dark:border-emerald-500/20 dark:bg-slate-900/70">
                {renderSectionHeader("pon-onu-mng", "bg-emerald-400 shadow-emerald-400/50")}

                <div className="mt-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">SERVICE</span>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => setMngCfg({ ...mngCfg, services: [...mngCfg.services, { id: nextId(mngCfg.services), gemport: 1, vlan: 0 }] })}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {mngCfg.services.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada SERVICE.</p>
                    ) : (
                      mngCfg.services.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <ConfigField value={String(item.id)} onChange={() => undefined} placeholder="ID" />
                          <ConfigField value={String(item.gemport)} onChange={(value) => setMngCfg({ ...mngCfg, services: mngCfg.services.map((i) => (i.id === item.id ? { ...i, gemport: num(value) } : i)) })} placeholder="Gemport" mono />
                          <ConfigField value={String(item.vlan)} onChange={(value) => setMngCfg({ ...mngCfg, services: mngCfg.services.map((i) => (i.id === item.id ? { ...i, vlan: num(value) } : i)) })} placeholder="VLAN" mono />
                          <button
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-300"
                            type="button"
                            onClick={() => setMngCfg({ ...mngCfg, services: mngCfg.services.filter((i) => i.id !== item.id) })}
                            aria-label={`Hapus SERVICE ${item.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">WAN-IP (PPPoE)</span>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => setMngCfg({ ...mngCfg, wanIps: [...mngCfg.wanIps, { id: nextId(mngCfg.wanIps), mode: "pppoe", username: "", password: "", vlanProfile: "", host: 1 }] })}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {mngCfg.wanIps.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada WAN-IP.</p>
                    ) : (
                      mngCfg.wanIps.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center gap-2">
                          <ConfigField value={String(item.id)} onChange={() => undefined} placeholder="ID" />
                          <ConfigField value={item.mode} onChange={(value) => setMngCfg({ ...mngCfg, wanIps: mngCfg.wanIps.map((i) => (i.id === item.id ? { ...i, mode: value } : i)) })} placeholder="Mode" />
                          <ConfigField value={item.username} onChange={(value) => setMngCfg({ ...mngCfg, wanIps: mngCfg.wanIps.map((i) => (i.id === item.id ? { ...i, username: value } : i)) })} placeholder="Username" />
                          <ConfigField value={item.password} onChange={(value) => setMngCfg({ ...mngCfg, wanIps: mngCfg.wanIps.map((i) => (i.id === item.id ? { ...i, password: value } : i)) })} placeholder="Password" />
                          <ConfigField value={item.vlanProfile} onChange={(value) => setMngCfg({ ...mngCfg, wanIps: mngCfg.wanIps.map((i) => (i.id === item.id ? { ...i, vlanProfile: value } : i)) })} placeholder="VLAN Profile" />
                          <ConfigField value={String(item.host)} onChange={(value) => setMngCfg({ ...mngCfg, wanIps: mngCfg.wanIps.map((i) => (i.id === item.id ? { ...i, host: num(value) } : i)) })} placeholder="Host" mono />
                          <button
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-300"
                            type="button"
                            onClick={() => setMngCfg({ ...mngCfg, wanIps: mngCfg.wanIps.filter((i) => i.id !== item.id) })}
                            aria-label={`Hapus WAN-IP ${item.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">SECURITY-MGMT</span>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => setMngCfg({ ...mngCfg, securityMgmts: [...mngCfg.securityMgmts, { id: nextId(mngCfg.securityMgmts), state: "enable", mode: "forward", protocol: "web" }] })}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {mngCfg.securityMgmts.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada SECURITY-MGMT.</p>
                    ) : (
                      mngCfg.securityMgmts.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center gap-2">
                          <ConfigField value={String(item.id)} onChange={() => undefined} placeholder="ID" />
                          <ConfigField value={item.state} onChange={(value) => setMngCfg({ ...mngCfg, securityMgmts: mngCfg.securityMgmts.map((i) => (i.id === item.id ? { ...i, state: value } : i)) })} placeholder="State" />
                          <ConfigField value={item.mode} onChange={(value) => setMngCfg({ ...mngCfg, securityMgmts: mngCfg.securityMgmts.map((i) => (i.id === item.id ? { ...i, mode: value } : i)) })} placeholder="Mode" />
                          <ConfigField value={item.protocol} onChange={(value) => setMngCfg({ ...mngCfg, securityMgmts: mngCfg.securityMgmts.map((i) => (i.id === item.id ? { ...i, protocol: value } : i)) })} placeholder="Protocol" />
                          <button
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-300"
                            type="button"
                            onClick={() => setMngCfg({ ...mngCfg, securityMgmts: mngCfg.securityMgmts.filter((i) => i.id !== item.id) })}
                            aria-label={`Hapus SECURITY-MGMT ${item.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-5 text-amber-700 dark:border-amber-300/30 dark:bg-amber-950/30 dark:text-amber-200">
                Perubahan akan dikirim langsung ke OLT. Pastikan ID, vlan, dan profile sudah benar — kesalahan bisa memutus layanan pelanggan.
              </div>

              {saveError && (
                <div className="whitespace-pre-line rounded-2xl border border-red-200 bg-red-50/70 p-3 text-sm leading-6 text-red-700 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-200">
                  {saveError}
                </div>
              )}
              {saveNotice && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {saveNotice}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {saveNotice && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {saveNotice}
                </div>
              )}
              {saveError && (
                <div className="whitespace-pre-line rounded-2xl border border-red-200 bg-red-50/70 p-3 text-sm leading-6 text-red-700 dark:border-red-300/30 dark:bg-red-950/30 dark:text-red-200">
                  {saveError}
                </div>
              )}
              <ConfigBlock
                title="Interface"
                command={`show run int ${onu.ponPort}:${onu.onuIndex}`}
                content={result?.interfaceConfig ?? ""}
                tone="cyan"
              />
              <ConfigBlock
                title="pon-onu-mng"
                command={`show onu run con ${onu.ponPort}:${onu.onuIndex}`}
                content={result?.onuMngConfig ?? ""}
                tone="emerald"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end">
          {editing ? (
            <>
              <button className={secondaryButtonClass} type="button" onClick={cancelEdit} disabled={saving}>
                Batal
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => void saveConfig()}
                disabled={saving}
              >
                {saving ? <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Menyimpan..." : "Simpan ke OLT"}
              </button>
            </>
          ) : (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-500"
              type="button"
              onClick={startEdit}
            >
              <FileCode className="h-4 w-4" aria-hidden="true" />
              Edit Konfigurasi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
