"use client"

import { ShieldCheck, UserPlus } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function SetupForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [message, setMessage] = useState("Buat akun Super Admin pertama untuk memulai.")

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json() as Promise<{ isFirstTime: boolean }>)
      .then((result) => {
        if (!result.isFirstTime) {
          router.replace("/login")
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [router])

  async function setup() {
    setLoading(true)
    setMessage("Membuat akun Super Admin...")

    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name, password }),
      })
      const result = (await response.json()) as { ok: boolean; message: string }

      if (!result.ok) {
        setMessage(result.message)
        return
      }

      setMessage("Akun berhasil dibuat. Mengarahkan ke login...")
      setTimeout(() => router.replace("/login"), 1500)
    } catch {
      setMessage("Gagal membuat akun. Cek server lokal.")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--app-bg)] text-sm font-semibold text-slate-600">
        Memeriksa...
      </div>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--app-bg)] text-slate-950">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-teal-400/25 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl" />
      </div>
      <section className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1fr_430px]">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-teal-500/20 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:bg-white/10">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-400 to-cyan-400 text-slate-950 shadow-lg shadow-teal-600/25">
              <Image src="/Logo.png" alt="L1V Logo" width={40} height={40} className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-950">L1V Monitor</p>
              <p className="text-xs text-teal-700">OLT Operations Center</p>
            </div>
          </div>
          <h1 className="mt-8 max-w-2xl text-5xl font-black leading-tight tracking-tight text-slate-950">
            Selamat datang di <span className="text-gradient">L1V Monitor</span>.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Buat akun Super Admin pertama untuk mengakses dashboard monitoring OLT, ONU/ONT, dan alert jaringan.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_2px_4px_rgba(11,32,36,0.06),0_32px_64px_-24px_rgba(11,32,36,0.25)] backdrop-blur dark:bg-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950">Setup Akun</p>
              <p className="mt-1 text-xs text-slate-500">Buat akun Super Admin pertama.</p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-slate-950 shadow-lg shadow-teal-600/25">
              <UserPlus className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Username</span>
              <input
                className="mt-1 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)]"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="Username (min. 3 karakter)"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Nama Lengkap</span>
              <input
                className="mt-1 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)]"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Nama lengkap"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Password</span>
              <input
                className="mt-1 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--ring)]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password (min. 8 karakter)"
                type="password"
                autoComplete="new-password"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void setup()
                }}
              />
            </label>
            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-700 to-cyan-700 px-4 text-sm font-bold text-white shadow-lg shadow-teal-900/30 transition hover:from-teal-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={loading || !username.trim() || !name.trim() || !password}
              onClick={() => void setup()}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {loading ? "Membuat..." : "Buat Akun Super Admin"}
            </button>
          </div>
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium text-slate-600">{message}</p>
        </div>
      </section>
    </main>
  )
}
