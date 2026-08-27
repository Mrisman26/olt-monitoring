import { RefreshCcw } from "lucide-react"
import type { TelegramSettings } from "@/lib/types"
import { TextInput } from "../ui/text-input"
import { ToggleInput } from "../ui/toggle-input"
import { panelClass, cyanButtonClass } from "../types"

export function SettingsView({
  telegram,
  onTelegramChange,
  onTestTelegram,
}: {
  telegram: TelegramSettings
  onTelegramChange: (settings: TelegramSettings) => void
  onTestTelegram: (settings: TelegramSettings) => void
}) {
  function updateTelegram<K extends keyof TelegramSettings>(key: K, value: TelegramSettings[K]) {
    onTelegramChange({ ...telegram, [key]: value })
  }

  return (
    <section className={panelClass}>
      <h1 className="text-sm font-semibold text-slate-950">Setting Awal</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
          <p className="text-sm font-medium text-slate-950">Collector</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Collector membaca status OLT dan ONU/ONT secara berkala, lalu membuat alert otomatis saat terdeteksi gangguan atau perubahan status.
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            OLT yang sudah berjalan: HSGQ GPON, HSGQ EPON, dan VSOL.
          </div>
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-950/25 dark:text-amber-100">
            Dukungan untuk merk dan tipe OLT lainnya masih menunggu sampel perangkat. Jika Anda memiliki OLT yang belum terdaftar di aplikasi ini,
            silakan hubungi pengembang agar profil OID dapat dipelajari dan ditambahkan.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-950">Telegram Bot</p>
              <p className="mt-1 text-sm text-slate-500">Notifikasi ONT down dan command chat seperti /cek, /down, /olt, /summary, /menu.</p>
            </div>
            <button className={cyanButtonClass} type="button" onClick={() => onTestTelegram(telegram)}>
              Test Telegram
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <TextInput
              label="Bot Token"
              value={telegram.botToken}
              onChange={(value) => updateTelegram("botToken", value)}
              placeholder="123456:ABC..."
              type="password"
            />
            <TextInput
              label="Chat ID"
              value={telegram.chatId}
              onChange={(value) => updateTelegram("chatId", value)}
              placeholder="123456789"
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ToggleInput label="Aktifkan Telegram" checked={telegram.enabled} onChange={(value) => updateTelegram("enabled", value)} />
            <ToggleInput label="Aktifkan chat bot polling" checked={telegram.botPollingEnabled} onChange={(value) => updateTelegram("botPollingEnabled", value)} />
            <ToggleInput label="Notifikasi ONT down" checked={telegram.notifyOntDown} onChange={(value) => updateTelegram("notifyOntDown", value)} />
            <ToggleInput label="Notifikasi ONT recovery" checked={telegram.notifyRecovery} onChange={(value) => updateTelegram("notifyRecovery", value)} />
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-950">Perintah bot</p>
            <p className="mt-1">/menu, /cek nama pelanggan, /down, /olt, /summary</p>
          </div>
        </div>
      </div>
    </section>
  )
}
