import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"

import bcrypt from "bcryptjs"
import mysql from "mysql2/promise"

import { getMysqlPool } from "@/lib/mysql-pool"
import type { AppRole, AuthAuditLog, PublicUser } from "@/lib/auth-types"

export type AuthUser = PublicUser & {
  passwordHash: string
}

export type AuthState = {
  users: AuthUser[]
  auditLogs: AuthAuditLog[]
}

const authJsonPath = path.join(process.cwd(), "data", "auth-db.json")

export function nowText() {
  return new Date().toLocaleString("id-ID")
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 12)
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function pushAudit(state: AuthState, actor: string, action: string, detail: string) {
  return {
    ...state,
    auditLogs: [
      {
        id: `audit-${Date.now()}-${randomUUID()}`,
        actor,
        action,
        detail,
        createdAt: nowText(),
      },
      ...state.auditLogs,
    ].slice(0, 200),
  }
}

export function defaultAuthState(): AuthState {
  const createdAt = nowText()

  return {
    users: [],
    auditLogs: [
      {
        id: `audit-${Date.now()}-${randomUUID()}`,
        actor: "system",
        action: "init",
        detail: "Sistem diinisialisasi. Silakan buat akun Super Admin pertama.",
        createdAt,
      },
    ],
  }
}

export async function isFirstTimeSetup(): Promise<boolean> {
  try {
    const state = await readAuthState()
    return state.users.length === 0
  } catch {
    return true
  }
}

export function normalizeAuthState(state: Partial<AuthState>): AuthState {
  const fallback = defaultAuthState()
  const users = Array.isArray(state.users) && state.users.length > 0 ? state.users : fallback.users

  return {
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt || nowText(),
      updatedAt: user.updatedAt || nowText(),
    })),
    auditLogs: Array.isArray(state.auditLogs) ? state.auditLogs : fallback.auditLogs,
  }
}

function rowToUser(row: mysql.RowDataPacket): AuthUser {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role as AppRole,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToAuditLog(row: mysql.RowDataPacket): AuthAuditLog {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    detail: row.detail,
    createdAt: row.created_at,
  }
}

const userColumns = "id, username, password_hash, name, role, created_at, updated_at"

const upsertUserSql =
  "INSERT INTO auth_users (id, username, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username), password_hash = VALUES(password_hash), name = VALUES(name), role = VALUES(role), created_at = VALUES(created_at), updated_at = VALUES(updated_at)"

const upsertAuditSql =
  "INSERT INTO auth_audit_logs (id, actor, action, detail, created_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE actor = VALUES(actor), action = VALUES(action), detail = VALUES(detail), created_at = VALUES(created_at)"

function sameUser(a: AuthUser, b: AuthUser) {
  return (
    a.username === b.username &&
    a.passwordHash === b.passwordHash &&
    a.name === b.name &&
    a.role === b.role &&
    a.createdAt === b.createdAt &&
    a.updatedAt === b.updatedAt
  )
}

function sameAuditLog(a: AuthAuditLog, b: AuthAuditLog) {
  return a.actor === b.actor && a.action === b.action && a.detail === b.detail && a.createdAt === b.createdAt
}

let authReadyPromise: Promise<void> | null = null

async function getPool(): Promise<mysql.Pool> {
  const activePool = await getMysqlPool()

  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      await createAuthTables(activePool)
      await migrateAuthFromJsonIfNeeded(activePool)
    })().catch((error) => {
      console.error("[auth-db] Inisialisasi tabel MySQL gagal:", error instanceof Error ? error.message : error)
      authReadyPromise = null
      throw error
    })
  }

  await authReadyPromise
  return activePool
}

async function createAuthTables(activePool: mysql.Pool) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS auth_users (
      id VARCHAR(100) NOT NULL,
      username VARCHAR(64) NOT NULL,
      password_hash VARCHAR(128) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL,
      created_at VARCHAR(100) NOT NULL,
      updated_at VARCHAR(100) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_auth_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id VARCHAR(200) NOT NULL,
      actor VARCHAR(100) NOT NULL,
      action VARCHAR(64) NOT NULL,
      detail TEXT NOT NULL,
      created_at VARCHAR(100) NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS auth_sessions (
      token VARCHAR(64) NOT NULL,
      user_id VARCHAR(100) NOT NULL,
      username VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      user_agent TEXT DEFAULT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      last_active_at BIGINT NOT NULL,
      PRIMARY KEY (token),
      KEY idx_sessions_user_id (user_id),
      KEY idx_sessions_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ]

  for (const statement of statements) {
    await activePool.query(statement)
  }
}

async function migrateAuthFromJsonIfNeeded(activePool: mysql.Pool) {
  const [countRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS c FROM auth_users")
  if (Number(countRows[0]?.c ?? 0) > 0) return

  let state: AuthState
  try {
    const raw = await readFile(authJsonPath, "utf8")
    state = normalizeAuthState(JSON.parse(raw) as Partial<AuthState>)
  } catch {
    state = defaultAuthState()
  }

  const connection = await activePool.getConnection()
  try {
    await connection.beginTransaction()
    for (const user of state.users) {
      await connection.query(upsertUserSql, [user.id, user.username, user.passwordHash, user.name, user.role, user.createdAt, user.updatedAt])
    }
    for (const log of state.auditLogs) {
      await connection.query(upsertAuditSql, [log.id, log.actor, log.action, log.detail, log.createdAt])
    }
    await connection.commit()
    console.log(`[auth-db] Migrasi auth selesai: ${state.users.length} user, ${state.auditLogs.length} audit log dari JSON ke MySQL.`)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function readAuthState(): Promise<AuthState> {
  try {
    const activePool = await getPool()
    const [userRows] = await activePool.query<mysql.RowDataPacket[]>(`SELECT ${userColumns} FROM auth_users`)
    const [auditRows] = await activePool.query<mysql.RowDataPacket[]>(
      "SELECT id, actor, action, detail, created_at FROM auth_audit_logs ORDER BY id DESC",
    )

    return normalizeAuthState({
      users: userRows.map(rowToUser),
      auditLogs: auditRows.map(rowToAuditLog),
    })
  } catch (error) {
    console.error("[auth-db] Gagal membaca MySQL:", error instanceof Error ? error.message : error)
    return defaultAuthState()
  }
}

export async function writeAuthState(state: AuthState) {
  const activePool = await getPool()
  const prev = await readAuthState()

  const connection = await activePool.getConnection()
  try {
    await connection.beginTransaction()
    await syncUsers(connection, prev.users, state.users)
    await syncAuditLogs(connection, prev.auditLogs, state.auditLogs)
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  return state
}

async function syncUsers(conn: mysql.PoolConnection, previous: AuthUser[], next: AuthUser[]) {
  const prevById = new Map(previous.map((user) => [user.id, user]))

  for (const user of next) {
    const prevUser = prevById.get(user.id)
    if (prevUser && sameUser(prevUser, user)) continue
    await conn.query(upsertUserSql, [user.id, user.username, user.passwordHash, user.name, user.role, user.createdAt, user.updatedAt])
  }

  const nextIds = new Set(next.map((user) => user.id))
  const removedIds = [...prevById.keys()].filter((id) => !nextIds.has(id))
  if (removedIds.length > 0) {
    await conn.query("DELETE FROM auth_users WHERE id IN (?)", [removedIds])
  }
}

async function syncAuditLogs(conn: mysql.PoolConnection, previous: AuthAuditLog[], next: AuthAuditLog[]) {
  const prevById = new Map(previous.map((log) => [log.id, log]))

  for (const log of next) {
    const prevLog = prevById.get(log.id)
    if (prevLog && sameAuditLog(prevLog, log)) continue
    await conn.query(upsertAuditSql, [log.id, log.actor, log.action, log.detail, log.createdAt])
  }

  const nextIds = new Set(next.map((log) => log.id))
  const removedIds = [...prevById.keys()].filter((id) => !nextIds.has(id))
  if (removedIds.length > 0) {
    await conn.query("DELETE FROM auth_audit_logs WHERE id IN (?)", [removedIds])
  }
}

export async function initAuthDb() {
  await getPool()
}

export type SessionData = {
  token: string
  userId: string
  username: string
  name: string
  role: AppRole
  ipAddress: string | null
  userAgent: string | null
  createdAt: number
  expiresAt: number
  lastActiveAt: number
}

export async function createSession(session: SessionData): Promise<void> {
  const activePool = await getPool()
  await activePool.query(
    "INSERT INTO auth_sessions (token, user_id, username, name, role, ip_address, user_agent, created_at, expires_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [session.token, session.userId, session.username, session.name, session.role, session.ipAddress, session.userAgent, session.createdAt, session.expiresAt, session.lastActiveAt],
  )
}

export async function getSession(token: string): Promise<SessionData | null> {
  const activePool = await getPool()
  const [rows] = await activePool.query<mysql.RowDataPacket[]>(
    "SELECT * FROM auth_sessions WHERE token = ? AND expires_at > ?",
    [token, Date.now()],
  )

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    token: row.token,
    userId: row.user_id,
    username: row.username,
    name: row.name,
    role: row.role as AppRole,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastActiveAt: row.last_active_at,
  }
}

export async function updateSessionActivity(token: string): Promise<void> {
  const activePool = await getPool()
  await activePool.query(
    "UPDATE auth_sessions SET last_active_at = ? WHERE token = ?",
    [Date.now(), token],
  )
}

export async function deleteSession(token: string): Promise<void> {
  const activePool = await getPool()
  await activePool.query("DELETE FROM auth_sessions WHERE token = ?", [token])
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const activePool = await getPool()
  await activePool.query("DELETE FROM auth_sessions WHERE user_id = ?", [userId])
}

export async function cleanupExpiredSessions(): Promise<number> {
  const activePool = await getPool()
  const [result] = await activePool.query<mysql.ResultSetHeader>(
    "DELETE FROM auth_sessions WHERE expires_at <= ?",
    [Date.now()],
  )
  return result.affectedRows
}

const MAX_SESSIONS_PER_USER = 5

export async function enforceSessionLimit(userId: string): Promise<void> {
  const activePool = await getPool()
  const [rows] = await activePool.query<mysql.RowDataPacket[]>(
    "SELECT token FROM auth_sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_active_at DESC",
    [userId, Date.now()],
  )

  if (rows.length > MAX_SESSIONS_PER_USER) {
    const tokensToDelete = rows.slice(MAX_SESSIONS_PER_USER).map((row) => row.token)
    if (tokensToDelete.length > 0) {
      await activePool.query(
        "DELETE FROM auth_sessions WHERE token IN (?)",
        [tokensToDelete],
      )
    }
  }
}
