"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { fieldClass } from "../types"

export function TextInput({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  type?: string
  onChange: (value: string) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === "password"
  const inputType = isPassword && showPassword ? "text" : type

  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="relative block">
        <input
          className={`${fieldClass} ${isPassword ? "pr-11" : ""}`}
          type={inputType}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
        {isPassword && (
          <button
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
            title={showPassword ? "Sembunyikan password" : "Lihat password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        )}
      </span>
    </label>
  )
}
