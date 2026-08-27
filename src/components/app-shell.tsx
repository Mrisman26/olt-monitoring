"use client"

import { Activity, Bell, ChevronsLeft, ChevronsRight, Gauge, Info, LogOut, Menu, Moon, Network, Settings, Shield, Sun, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"

import { authStorageKey, canAccessPath, roleLabels, type AuthSession } from "@/lib/auth-types"

const navItems = [
  { label: "Dashboard", icon: Gauge, href: "/", color: "cyan" },
  { label: "OLT", icon: Network, href: "/olts", color: "emerald" },
  { label: "ONU/ONT", icon: Activity, href: "/onus", color: "sky" },
  { label: "Alert", icon: Bell, href: "/alerts", color: "rose" },
  { label: "Setting", icon: Settings, href: "/settings", color: "amber" },
  { label: "System", icon: Shield, href: "/system", color: "violet" },
  // { label: "About", icon: Info, href: "/about", color: "cyan" },
]

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard Monitoring", subtitle: "Ringkasan polling, OLT, ONU/ONT, dan alert" },
  "/olts": { title: "Manajemen OLT", subtitle: "Tambah OLT dan test koneksi SNMP" },
  "/onus": { title: "Monitoring ONU/ONT", subtitle: "Data ONU/ONT akan muncul setelah polling OLT berjalan" },
  "/alerts": { title: "Alert", subtitle: "Gangguan dan perubahan status dari collector" },
  "/about": { title: "About", subtitle: "Tentang L1V Monitor dan dukungan pengembangan" },
  "/settings": { title: "Setting", subtitle: "Pengaturan awal aplikasi dan penyimpanan lokal" },
  "/system": { title: "System", subtitle: "Role akses, akun lokal, dan reset default" },
}

function getThemeSnapshot() {
  if (typeof window === "undefined") return false

  const savedTheme = window.localStorage.getItem("mikroin-theme")
  if (savedTheme) return savedTheme === "dark"

  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function subscribeThemeChange(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener("mikroin-theme-change", callback)

  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener("mikroin-theme-change", callback)
  }
}

function getAuthSnapshot() {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(authStorageKey) ?? ""
}

function subscribeAuthChange(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener("mikroin-auth-change", callback)

  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener("mikroin-auth-change", callback)
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const pageTitle = titles[pathname] ?? titles["/"]
  const darkMode = useSyncExternalStore(subscribeThemeChange, getThemeSnapshot, () => false)
  const authSnapshot = useSyncExternalStore(subscribeAuthChange, getAuthSnapshot, () => "")
  const session = useMemo(() => {
    if (!authSnapshot) return null
    try {
      return JSON.parse(authSnapshot) as AuthSession
    } catch {
      return null
    }
  }, [authSnapshot])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light"
  }, [darkMode])

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem("mikroin-sidebar-collapsed") === "1"
  })

  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem("mikroin-sidebar-collapsed", sidebarCollapsed ? "1" : "0")
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!authSnapshot || !session) {
      if (authSnapshot) window.localStorage.removeItem(authStorageKey)
      router.replace("/login")
      return
    }

    if (!session.expiresAt || Date.now() > session.expiresAt) {
      window.localStorage.removeItem(authStorageKey)
      window.dispatchEvent(new Event("mikroin-auth-change"))
      router.replace("/login")
      return
    }

    if (!canAccessPath(session.role, pathname)) {
      router.replace("/")
    }
  }, [authSnapshot, pathname, router, session])

  function toggleTheme() {
    const nextDarkMode = !darkMode

    document.documentElement.classList.toggle("dark", nextDarkMode)
    document.documentElement.style.colorScheme = nextDarkMode ? "dark" : "light"
    window.localStorage.setItem("mikroin-theme", nextDarkMode ? "dark" : "light")
    window.dispatchEvent(new Event("mikroin-theme-change"))
  }

  function menuIconClass(color: string, active: boolean) {
    const lightStyles: Record<string, string> = {
      cyan: active
        ? "bg-teal-100 text-teal-800 ring-1 ring-teal-200"
        : "bg-teal-50 text-teal-700 group-hover:bg-teal-100",
      emerald: active
        ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
        : "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100",
      sky: active
        ? "bg-sky-100 text-sky-800 ring-1 ring-sky-200"
        : "bg-sky-50 text-sky-700 group-hover:bg-sky-100",
      rose: active
        ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
        : "bg-rose-50 text-rose-700 group-hover:bg-rose-100",
      amber: active
        ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
        : "bg-amber-50 text-amber-700 group-hover:bg-amber-100",
      violet: active
        ? "bg-violet-100 text-violet-800 ring-1 ring-violet-200"
        : "bg-violet-50 text-violet-700 group-hover:bg-violet-100",
    }
    const darkStyles: Record<string, string> = {
      cyan: active
        ? "bg-teal-400/25 text-teal-100 ring-1 ring-teal-300/30"
        : "bg-teal-400/10 text-teal-200 group-hover:bg-teal-400/20",
      emerald: active
        ? "bg-emerald-400/25 text-emerald-100 ring-1 ring-emerald-300/30"
        : "bg-emerald-400/10 text-emerald-200 group-hover:bg-emerald-400/20",
      sky: active
        ? "bg-sky-400/25 text-sky-100 ring-1 ring-sky-300/30"
        : "bg-sky-400/10 text-sky-200 group-hover:bg-sky-400/20",
      rose: active
        ? "bg-rose-400/25 text-rose-100 ring-1 ring-rose-300/30"
        : "bg-rose-400/10 text-rose-200 group-hover:bg-rose-400/20",
      amber: active
        ? "bg-amber-400/25 text-amber-100 ring-1 ring-amber-300/30"
        : "bg-amber-400/10 text-amber-200 group-hover:bg-amber-400/20",
      violet: active
        ? "bg-violet-400/25 text-violet-100 ring-1 ring-violet-300/30"
        : "bg-violet-400/10 text-violet-200 group-hover:bg-violet-400/20",
    }

    const styles = darkMode ? darkStyles : lightStyles
    return styles[color] ?? styles.cyan
  }

  function menuActiveClass(color: string) {
    const lightStyles: Record<string, string> = {
      cyan: "border-teal-200 bg-teal-50 text-teal-900 shadow-sm",
      emerald: "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm",
      sky: "border-sky-200 bg-sky-50 text-sky-900 shadow-sm",
      rose: "border-rose-200 bg-rose-50 text-rose-900 shadow-sm",
      amber: "border-amber-200 bg-amber-50 text-amber-900 shadow-sm",
      violet: "border-violet-200 bg-violet-50 text-violet-900 shadow-sm",
    }
    const darkStyles: Record<string, string> = {
      cyan: "border-teal-400/30 bg-teal-400/15 text-teal-100 shadow-lg shadow-teal-950/30",
      emerald: "border-emerald-400/30 bg-emerald-400/15 text-emerald-100 shadow-lg shadow-emerald-950/20",
      sky: "border-sky-400/30 bg-sky-400/15 text-sky-100 shadow-lg shadow-sky-950/25",
      rose: "border-rose-400/30 bg-rose-400/15 text-rose-100 shadow-lg shadow-rose-950/20",
      amber: "border-amber-400/30 bg-amber-400/15 text-amber-100 shadow-lg shadow-amber-950/20",
      violet: "border-violet-400/30 bg-violet-400/15 text-violet-100 shadow-lg shadow-violet-950/20",
    }

    const styles = darkMode ? darkStyles : lightStyles
    return styles[color] ?? styles.cyan
  }

  async function logout() {
    window.localStorage.removeItem(authStorageKey)
    window.dispatchEvent(new Event("mikroin-auth-change"))
    try { await fetch("/api/auth/logout", { method: "POST" }) } catch { /* best-effort */ }
    router.replace("/login")
  }

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--app-bg)] text-sm font-semibold text-slate-600">
        Memeriksa akses...
      </div>
    )
  }

  const accessibleNavItems = navItems.filter((item) => canAccessPath(session.role, item.href))
  const sidebarClass = [
    "fixed inset-y-0 left-0 z-50 flex flex-col overflow-y-auto border-r transition-[width,transform] duration-300",
    darkMode
      ? "border-teal-300/10 bg-gradient-to-b from-[#050d12] via-[#07141b] to-[#040b0f] text-slate-100 shadow-2xl shadow-cyan-950/50"
      : "border-slate-200/80 bg-white/80 text-slate-950 shadow-[0_0_40px_-18px_rgba(13,118,110,0.35)] backdrop-blur-xl",
    sidebarCollapsed ? "w-64 lg:w-20" : "w-64",
    mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
  ].join(" ")
  const sidebarHeaderClass = [
    "flex h-16 shrink-0 items-center gap-2 border-b px-4",
    darkMode ? "border-white/10" : "border-slate-200/80",
    sidebarCollapsed ? "lg:justify-center lg:px-0" : "",
  ].join(" ")
  const brandTitleClass = darkMode
    ? "text-base font-semibold tracking-wide text-white"
    : "text-base font-semibold tracking-wide text-slate-950"
  const brandSubtitleClass = darkMode ? "text-xs text-teal-100/70" : "text-xs text-teal-700"
  const inactiveMenuClass = darkMode
    ? "border-transparent text-slate-300 hover:border-teal-300/20 hover:bg-teal-300/10 hover:text-white"
    : "border-transparent text-slate-600 hover:border-teal-600/20 hover:bg-teal-600/[0.06] hover:text-slate-950"
  const collectorPanelClass = darkMode
    ? "mx-3 mb-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-xs text-emerald-100"
    : "mx-3 mb-3 rounded-2xl border border-teal-600/15 bg-gradient-to-br from-teal-50/90 to-cyan-50/70 p-4 text-xs text-teal-800"
  const collectorTextClass = darkMode ? "mt-2 text-emerald-100/65" : "mt-2 text-teal-700"

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-950">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={sidebarClass}>
        <div className={sidebarHeaderClass}>
          <button
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white/70 text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 lg:hidden"
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Tutup menu"
            title="Tutup menu"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className={`flex min-w-0 flex-1 items-center gap-3 ${sidebarCollapsed ? "lg:flex-none" : ""}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-400 via-cyan-400 to-sky-500 shadow-lg shadow-teal-600/25 ring-1 ring-white/40 dark:ring-teal-300/30">
              <h1>L1V</h1>
            </div>
            <div className={`min-w-0 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              <p className={brandTitleClass}>L1V Monitor</p>
              <p className={brandSubtitleClass}>OLT Operations Center</p>
            </div>
          </div>
        </div>
        <nav className="shrink-0 space-y-2 p-3">
          {accessibleNavItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href

            return (
              <Link
                key={item.label}
                className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                  active ? menuActiveClass(item.color) : inactiveMenuClass
                } ${sidebarCollapsed ? "lg:justify-center lg:px-0" : ""}`}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${menuIconClass(item.color, active)}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className={`truncate ${sidebarCollapsed ? "lg:hidden" : ""}`}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={`shrink-0 px-3 pb-2 ${sidebarCollapsed ? "lg:px-1" : ""}`}>
          <button
            className="hidden w-full items-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-3 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 lg:flex"
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            title={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className={`truncate ${sidebarCollapsed ? "lg:hidden" : ""}`}>
              {sidebarCollapsed ? "Buka" : "Ciutkan"}
            </span>
          </button>
        </div>

        {sidebarCollapsed ? (
          <div
            className="mx-auto mb-3 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10"
            title="Collector ready"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
          </div>
        ) : (
          <div className={collectorPanelClass}>
            <div className="flex items-center gap-2 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
              Collector ready
            </div>
            <p className={collectorTextClass}>Siap membaca OLT dan ONU/ONT.</p>
          </div>
        )}
      </aside>

      <div className={`transition-[padding] duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/70 px-4 backdrop-blur-xl lg:px-6 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka menu"
              title="Buka menu"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-950">{pageTitle.title}</p>
              <p className="truncate text-xs text-slate-500">{pageTitle.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm md:inline-flex">
              <Shield className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
              {session.name} | {roleLabels[session.role]}
            </span>
            <span className="hidden items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Collector ready
            </span>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              type="button"
              onClick={toggleTheme}
              aria-label={darkMode ? "Gunakan light mode" : "Gunakan dark mode"}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
            <Link
              className="hidden items-center gap-2 rounded-xl border border-slate-300 bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:inline-flex"
              href="/alerts"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              Alert
            </Link>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
              type="button"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
