import { sessionDurationMs, type AppRole, type AuthAuditLog, type AuthSession, type PublicUser } from "@/lib/auth-types"
import { hashPassword, comparePassword, nowText, pushAudit, readAuthState, writeAuthState, deleteUserSessions } from "@/lib/auth-db"
import type { AuthState, AuthUser } from "@/lib/auth-db"

function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function toSession(user: AuthUser): AuthSession {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    expiresAt: Date.now() + sessionDurationMs,
  }
}

function validateUserInput(input: { username?: string; name?: string; password?: string; role?: AppRole }, requirePassword: boolean) {
  const username = input.username?.trim()
  const name = input.name?.trim()
  const password = input.password ?? ""

  if (!username || !name || !input.role) return "Username, nama, dan role wajib diisi."
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return "Username minimal 3 karakter dan hanya boleh huruf, angka, titik, garis bawah, atau strip."
  if (requirePassword && password.length < 6) return "Password minimal 6 karakter."
  if (input.role !== "admin" && input.role !== "super-admin") return "Role tidak valid."

  return null
}

export async function listAuthData() {
  const state = await readAuthState()

  return {
    users: state.users.map(toPublicUser),
    auditLogs: state.auditLogs,
  }
}

export async function authenticateUser(username: string, password: string): Promise<AuthSession | null> {
  let state: AuthState = await readAuthState()
  const user = state.users.find((item) => item.username.toLowerCase() === username.trim().toLowerCase())
  const ok = Boolean(user && await comparePassword(password, user.passwordHash))

  state = pushAudit(state, username.trim() || "-", ok ? "login_success" : "login_failed", ok ? "Login berhasil." : "Percobaan login gagal.")
  await writeAuthState(state)

  return ok && user ? toSession(user) : null
}

export async function createUser(input: { username: string; name: string; password: string; role: AppRole; actor: string }) {
  let state: AuthState = await readAuthState()
  const validation = validateUserInput(input, true)
  if (validation) return { ok: false, message: validation }

  const username = input.username.trim()
  if (state.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, message: "Username sudah dipakai." }
  }

  const createdAt = nowText()
  const user: AuthUser = {
    id: `user-${Date.now()}`,
    username,
    name: input.name.trim(),
    role: input.role,
    passwordHash: hashPassword(input.password),
    createdAt,
    updatedAt: createdAt,
  }

  state = pushAudit({ ...state, users: [...state.users, user] }, input.actor, "user_create", `User ${username} dibuat sebagai ${input.role}.`)
  await writeAuthState(state)

  return { ok: true, message: "User berhasil ditambahkan.", users: state.users.map(toPublicUser), auditLogs: state.auditLogs }
}

export async function updateUser(input: { id: string; username: string; name: string; role: AppRole; password?: string; actor: string }) {
  let state: AuthState = await readAuthState()
  const target = state.users.find((user) => user.id === input.id)
  if (!target) return { ok: false, message: "User tidak ditemukan." }

  const validation = validateUserInput(input, false)
  if (validation) return { ok: false, message: validation }

  const username = input.username.trim()
  if (state.users.some((user) => user.id !== input.id && user.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, message: "Username sudah dipakai user lain." }
  }

  const nextRole = input.role
  if (target.role === "super-admin" && nextRole !== "super-admin" && state.users.filter((user) => user.role === "super-admin").length <= 1) {
    return { ok: false, message: "Minimal harus ada satu Super Admin." }
  }

  if (input.password && input.password.length < 6) return { ok: false, message: "Password minimal 6 karakter." }

  state = {
    ...state,
    users: state.users.map((user) =>
      user.id === input.id
        ? {
            ...user,
            username,
            name: input.name.trim(),
            role: nextRole,
            passwordHash: input.password ? hashPassword(input.password) : user.passwordHash,
            updatedAt: nowText(),
          }
        : user,
    ),
  }
  state = pushAudit(state, input.actor, "user_update", `User ${username} diperbarui${input.password ? " dan password diganti" : ""}.`)
  await writeAuthState(state)

  if (input.password) {
    await deleteUserSessions(input.id).catch(() => {})
  }

  return { ok: true, message: "User berhasil diperbarui.", users: state.users.map(toPublicUser), auditLogs: state.auditLogs }
}

export async function deleteUser(input: { id: string; actor: string }) {
  let state: AuthState = await readAuthState()
  const target = state.users.find((user) => user.id === input.id)
  if (!target) return { ok: false, message: "User tidak ditemukan." }
  if (target.role === "super-admin" && state.users.filter((user) => user.role === "super-admin").length <= 1) {
    return { ok: false, message: "Minimal harus ada satu Super Admin." }
  }

  state = pushAudit({ ...state, users: state.users.filter((user) => user.id !== input.id) }, input.actor, "user_delete", `User ${target.username} dihapus.`)
  await writeAuthState(state)

  await deleteUserSessions(input.id).catch(() => {})

  return { ok: true, message: "User berhasil dihapus.", users: state.users.map(toPublicUser), auditLogs: state.auditLogs }
}
