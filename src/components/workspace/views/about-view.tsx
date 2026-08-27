import Image from "next/image"
import { HeartHandshake, Info, Mail, MessageCircle } from "lucide-react"
import { panelClass } from "../types"

export function AboutView() {
  const features = [
    "Monitoring OLT via SNMP",
    "Data ONU/ONT, RX, suhu, dan kasus down",
    "Alert down/recovery",
    "Notifikasi Telegram",
    "Role Admin dan Super Admin",
    "Chat Bot Telegram",
  ]

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className={panelClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">
              About L1V Monitor
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Monitoring OLT dan ONU/ONT yang ringan untuk operasional jaringan.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              L1V Monitor adalah aplikasi monitoring OLT dan ONU/ONT berbasis SNMP untuk membantu teknisi memantau jaringan fiber secara cepat,
              rapi, dan terpusat. Aplikasi ini menampilkan status OLT, daftar pelanggan ONU/ONT, power RX, suhu perangkat, alert gangguan, serta
              notifikasi Telegram ketika terjadi perubahan status seperti ONT down, recovery, atau OLT tidak dapat dihubungi. L1V Monitor juga
              dilengkapi chat bot Telegram untuk membantu pengecekan data pelanggan, ONT down, status OLT, dan ringkasan jaringan langsung dari chat.
            </p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20">
            <Info className="h-7 w-7" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div key={feature} className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 text-sm font-bold text-cyan-900 shadow-sm dark:bg-cyan-950/20 dark:text-cyan-50">
              {feature}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white/60 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-950">WhatsApp</p>
                <p className="text-sm font-semibold text-slate-600">085353368296</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/60 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-950">Email</p>
                <p className="break-all text-sm font-semibold text-slate-600">radius.mikroin@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm">
              <HeartHandshake className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-50">Dukungan Pengembangan</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-200">Bantu pengembangan fitur L1V Monitor.</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-emerald-900 dark:text-emerald-50">
            Jika aplikasi ini membantu operasional jaringan Anda, dukungan donasi sangat berarti untuk pengembangan, perawatan, dan penambahan fitur.
            Untuk permintaan hak akses Super Admin atau dukungan lanjutan, silakan hubungi pengembang melalui WhatsApp atau email.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <Image className="h-auto w-full rounded-2xl" src="/QRIS.svg" alt="QRIS donasi L1V Monitor" width={720} height={1120} priority={false} />
        </div>
      </aside>
    </section>
  )
}
