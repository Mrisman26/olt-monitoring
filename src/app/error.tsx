"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">Terjadi Kesalahan</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {error.message || " aplikasi mengalami error yang tidak terduga."}
        </p>
        <button
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-bold text-white transition hover:bg-teal-500"
          type="button"
          onClick={() => reset()}
        >
          Coba Lagi
        </button>
      </div>
    </div>
  )
}
