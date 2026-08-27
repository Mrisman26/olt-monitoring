"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body>
        <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-red-100 text-red-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-950">Aplikasi Bermasalah</h1>
            <p className="mt-2 text-sm text-slate-600">
              {error.message || "Terjadi error kritis yang membutuhkan reload halaman."}
            </p>
            <button
              className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-bold text-white transition hover:bg-teal-500"
              type="button"
              onClick={() => reset()}
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
