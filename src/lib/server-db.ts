import mysql from "mysql2/promise"

import { getMysqlPool } from "@/lib/mysql-pool"
import type { MonitoringState, Olt, Onu, Alert, TrafficSample, RxPowerSample, HardwareHistoryEntry, OnuStatusLog } from "@/lib/types"

export const emptyMonitoringState: MonitoringState = {
  olts: [],
  onus: [],
  alerts: [],
  settings: {
    telegram: {
      enabled: false,
      botToken: "",
      chatId: "",
      notifyOntDown: true,
      notifyRecovery: true,
      botPollingEnabled: false,
      lastUpdateId: 0,
    },
  },
}

export function normalizeMonitoringState(state: Partial<MonitoringState>): MonitoringState {
  return {
    olts: Array.isArray(state.olts) ? state.olts : [],
    onus: Array.isArray(state.onus) ? state.onus : [],
    alerts: Array.isArray(state.alerts) ? state.alerts : [],
    settings: {
      telegram: {
        ...emptyMonitoringState.settings.telegram,
        ...(state.settings?.telegram ?? {}),
      },
    },
  }
}

let readyPromise: Promise<void> | null = null

export function historyEnabled() {
  return process.env["MONITOR_HISTORY_ENABLED"] !== "false"
}

async function getPool(): Promise<mysql.Pool> {
  const activePool = await getMysqlPool()

  if (!readyPromise) {
    readyPromise = (async () => {
      await createTables(activePool)
      await migrateFromJsonIfNeeded(activePool)
    })().catch((error) => {
      console.error("[monitoring-db] Inisialisasi tabel MySQL gagal:", error instanceof Error ? error.message : error)
      readyPromise = null
      throw error
    })
  }

  await readyPromise
  return activePool
}

async function createTables(activePool: mysql.Pool) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS olt_monitor_olts (
      id VARCHAR(100) NOT NULL,
      data LONGTEXT NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS olt_monitor_onus (
      id VARCHAR(200) NOT NULL,
      olt_id VARCHAR(100) NOT NULL,
      data LONGTEXT NOT NULL,
      PRIMARY KEY (id),
      KEY idx_olt_id (olt_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS olt_monitor_alerts (
      id VARCHAR(200) NOT NULL,
      olt_id VARCHAR(100) NOT NULL,
      data LONGTEXT NOT NULL,
      PRIMARY KEY (id),
      KEY idx_olt_id (olt_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS olt_monitor_settings (
      id TINYINT NOT NULL,
      data LONGTEXT NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ]

  if (historyEnabled()) {
    statements.push(
      `CREATE TABLE IF NOT EXISTS olt_monitor_traffic (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        olt_id VARCHAR(100) NOT NULL,
        onu_id VARCHAR(200) NOT NULL,
        ts DATETIME NOT NULL,
        input_bps BIGINT UNSIGNED NOT NULL DEFAULT 0,
        output_bps BIGINT UNSIGNED NOT NULL DEFAULT 0,
        input_pps INT UNSIGNED NOT NULL DEFAULT 0,
        output_pps INT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        KEY idx_onu_ts (onu_id, ts),
        KEY idx_olt_ts (olt_id, ts)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS olt_monitor_rx_power (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        olt_id VARCHAR(100) NOT NULL,
        onu_id VARCHAR(200) NOT NULL,
        rx_power DOUBLE NOT NULL DEFAULT 0,
        tx_power DOUBLE NOT NULL DEFAULT 0,
        ts DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_rx_onu_ts (onu_id, ts),
        KEY idx_rx_olt_ts (olt_id, ts)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS olt_monitor_hw_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        target_type ENUM('olt','onu') NOT NULL,
        target_id VARCHAR(200) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        actor VARCHAR(100) DEFAULT 'system',
        ts DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_hw_target (target_type, target_id, ts)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      `CREATE TABLE IF NOT EXISTS olt_monitor_onu_status_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        onu_id VARCHAR(200) NOT NULL,
        olt_id VARCHAR(100) NOT NULL,
        status ENUM('online','offline') NOT NULL,
        cause VARCHAR(255) DEFAULT NULL,
        ts DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_status_onu_ts (onu_id, ts),
        KEY idx_status_olt_ts (olt_id, ts)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    )
  }

  for (const statement of statements) {
    await activePool.query(statement)
  }
}

async function migrateFromJsonIfNeeded(activePool: mysql.Pool) {
  const [markerRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT id FROM olt_monitor_settings WHERE id = 0")
  if (markerRows.length > 0) return

  const [countRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS c FROM olt_monitor_olts")
  if (Number(countRows[0]?.c ?? 0) > 0) {
    await activePool.query("INSERT INTO olt_monitor_settings (id, data) VALUES (0, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)", [JSON.stringify({ migratedFromJson: true })])
    return
  }
}

async function bulkUpsertOnus(conn: mysql.PoolConnection, onus: Onu[]) {
  const batch: string[][] = []
  for (const onu of onus) {
    batch.push([onu.id, onu.oltId, JSON.stringify(onu)])
  }
  for (let index = 0; index < batch.length; index += 500) {
    await conn.query("INSERT INTO olt_monitor_onus (id, olt_id, data) VALUES ? ON DUPLICATE KEY UPDATE olt_id = VALUES(olt_id), data = VALUES(data)", [batch.slice(index, index + 500)])
  }
}

async function chunkedIn(conn: mysql.PoolConnection, sql: string, ids: string[]) {
  if (ids.length === 0) return
  for (let index = 0; index < ids.length; index += 1000) {
    await conn.query(sql, [ids.slice(index, index + 1000)])
  }
}

export async function readMonitoringState(): Promise<MonitoringState> {
  // Sengaja tidak menangkap error: jika DB gagal dibaca, pemanggil harus gagal
  // juga. Mengembalikan state kosong berisiko menimpa/menghapus data asli.
  const activePool = await getPool()
  const [oltRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT data FROM olt_monitor_olts")
  const [onuRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT data FROM olt_monitor_onus")
  const [alertRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT data FROM olt_monitor_alerts")
  const [settingsRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT data FROM olt_monitor_settings WHERE id = 1")

  const olts = oltRows.map((row) => JSON.parse(row.data) as Olt)
  const onus = onuRows.map((row) => JSON.parse(row.data) as Onu)
  const alerts = alertRows.map((row) => JSON.parse(row.data) as Alert)
  const settings = settingsRows.length > 0 ? (JSON.parse(settingsRows[0].data) as MonitoringState["settings"]) : emptyMonitoringState.settings

  return normalizeMonitoringState({ olts, onus, alerts, settings })
}

export async function getOltById(id: string): Promise<Olt | null> {
  const activePool = await getPool()
  const [rows] = await activePool.query<mysql.RowDataPacket[]>("SELECT data FROM olt_monitor_olts WHERE id = ?", [id])
  if (rows.length === 0) return null
  return JSON.parse(rows[0].data) as Olt
}

export async function resolveOltWithSecrets(bodyOlt: Olt | undefined | null): Promise<Olt | undefined | null> {
  // Klien hanya menerima OLT tanpa field rahasia (disanitasi di GET/SSE).
  // Ambil ulang OLT lengkap dari database berdasarkan id.
  if (!bodyOlt?.id) return bodyOlt
  const stored = await getOltById(bodyOlt.id)
  return stored ?? bodyOlt
}

export async function mergeOltWithSecrets<T extends Partial<Olt> & { id?: string }>(bodyOlt: T): Promise<T> {
  // Untuk route "test": nilai yang diketik user di form menang, sisanya diisi
  // dari database agar kredensial tersanitasi tetap terpakai.
  const stored = bodyOlt?.id ? await getOltById(bodyOlt.id) : null
  if (!stored) return bodyOlt
  return {
    ...stored,
    ...bodyOlt,
    readCommunity: bodyOlt.readCommunity?.trim() || stored.readCommunity,
    writeCommunity: bodyOlt.writeCommunity?.trim() || stored.writeCommunity,
    cliUsername: bodyOlt.cliUsername?.trim() || stored.cliUsername,
    cliPassword: bodyOlt.cliPassword || stored.cliPassword,
  } as T
}

export async function readMonitoringStateLite(): Promise<MonitoringState> {
  const activePool = await getPool()
  const [oltRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT data FROM olt_monitor_olts")
  const [alertRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT data FROM olt_monitor_alerts")
  const [settingsRows] = await activePool.query<mysql.RowDataPacket[]>("SELECT data FROM olt_monitor_settings WHERE id = 1")

  const olts = oltRows.map((row) => JSON.parse(row.data) as Olt)
  const alerts = alertRows.map((row) => JSON.parse(row.data) as Alert)
  const settings = settingsRows.length > 0 ? (JSON.parse(settingsRows[0].data) as MonitoringState["settings"]) : emptyMonitoringState.settings

  return normalizeMonitoringState({ olts, onus: [], alerts, settings })
}

export async function writeMonitoringState(state: MonitoringState, previous?: MonitoringState) {
  const activePool = await getPool()
  const prev = previous ?? (await readMonitoringState())

  const connection = await activePool.getConnection()
  try {
    await connection.beginTransaction()
    await syncSettings(connection, state.settings)
    await syncOlts(connection, prev.olts, state.olts)
    await syncOnus(connection, prev.onus, state.onus)
    await syncAlerts(connection, prev.alerts, state.alerts)
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  return state
}

async function syncSettings(conn: mysql.PoolConnection, settings: MonitoringState["settings"]) {
  await conn.query("INSERT INTO olt_monitor_settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)", [JSON.stringify(settings)])
}

async function syncOlts(conn: mysql.PoolConnection, previous: Olt[], next: Olt[]) {
  const prevById = new Map(previous.map((olt) => [olt.id, olt]))

  for (const olt of next) {
    const data = JSON.stringify(olt)
    const prevOlt = prevById.get(olt.id)
    if (prevOlt && JSON.stringify(prevOlt) === data) continue

    await conn.query("INSERT INTO olt_monitor_olts (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)", [olt.id, data])
  }

  const nextIds = new Set(next.map((olt) => olt.id))
  const removedIds = [...prevById.keys()].filter((id) => !nextIds.has(id))

  if (removedIds.length > 0) {
    await chunkedIn(conn, "DELETE FROM olt_monitor_onus WHERE olt_id IN (?)", removedIds)
    await chunkedIn(conn, "DELETE FROM olt_monitor_alerts WHERE olt_id IN (?)", removedIds)
    await chunkedIn(conn, "DELETE FROM olt_monitor_olts WHERE id IN (?)", removedIds)
  }
}

async function syncOnus(conn: mysql.PoolConnection, previous: Onu[], next: Onu[]) {
  const prevById = new Map(previous.map((onu) => [onu.id, onu]))
  const changed: Onu[] = []

  for (const onu of next) {
    const prevOnu = prevById.get(onu.id)
    if (prevOnu && prevOnu.oltId === onu.oltId && JSON.stringify(prevOnu) === JSON.stringify(onu)) continue
    changed.push(onu)
  }

  await bulkUpsertOnus(conn, changed)

  const nextIds = new Set(next.map((onu) => onu.id))
  const removedIds = [...prevById.keys()].filter((id) => !nextIds.has(id))
  await chunkedIn(conn, "DELETE FROM olt_monitor_onus WHERE id IN (?)", removedIds)
}

async function syncAlerts(conn: mysql.PoolConnection, previous: Alert[], next: Alert[]) {
  const prevById = new Map(previous.map((alert) => [alert.id, alert]))
  const changed: Alert[] = []

  for (const alert of next) {
    const prevAlert = prevById.get(alert.id)
    if (prevAlert && JSON.stringify(prevAlert) === JSON.stringify(alert)) continue
    changed.push(alert)
  }

  for (const alert of changed) {
    await conn.query("INSERT INTO olt_monitor_alerts (id, olt_id, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE olt_id = VALUES(olt_id), data = VALUES(data)", [alert.id, alert.oltId, JSON.stringify(alert)])
  }

  const nextIds = new Set(next.map((alert) => alert.id))
  const removedIds = [...prevById.keys()].filter((id) => !nextIds.has(id))
  await chunkedIn(conn, "DELETE FROM olt_monitor_alerts WHERE id IN (?)", removedIds)
}

export async function initMonitoringDb() {
  await getPool()
}

export async function insertTrafficSamples(samples: TrafficSample[]) {
  if (!historyEnabled() || samples.length === 0) return
  const activePool = await getPool()

  for (let index = 0; index < samples.length; index += 200) {
    const chunk = samples.slice(index, index + 200)
    const values = chunk.map((s) => [s.oltId, s.onuId, s.timestamp, s.inputBps, s.outputBps, s.inputPps, s.outputPps])
    await activePool.query(
      "INSERT INTO olt_monitor_traffic (olt_id, onu_id, ts, input_bps, output_bps, input_pps, output_pps) VALUES ?",
      [values],
    )
  }
}

export async function readTrafficSamples(onuId: string, hours: number): Promise<TrafficSample[]> {
  if (!historyEnabled()) return []
  try {
    const activePool = await getPool()
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ")
    const [rows] = await activePool.query<mysql.RowDataPacket[]>(
      "SELECT id, olt_id AS oltId, onu_id AS onuId, ts AS timestamp, input_bps AS inputBps, output_bps AS outputBps, input_pps AS inputPps, output_pps AS outputPps FROM olt_monitor_traffic WHERE onu_id = ? AND ts >= ? ORDER BY ts ASC",
      [onuId, since],
    )
    return rows as TrafficSample[]
  } catch (error) {
    console.error("[monitoring-db] Gagal membaca traffic:", error instanceof Error ? error.message : error)
    return []
  }
}

export async function cleanupOldTraffic(olderThanDays = 30) {
  if (!historyEnabled()) return
  try {
    const activePool = await getPool()
    const cutoff = new Date(Date.now() - olderThanDays * 86400 * 1000).toISOString().slice(0, 19).replace("T", " ")
    await activePool.query("DELETE FROM olt_monitor_traffic WHERE ts < ? LIMIT 5000", [cutoff])
  } catch (error) {
    console.error("[monitoring-db] Gagal cleanup traffic:", error instanceof Error ? error.message : error)
  }
}

export async function insertRxPowerSamples(samples: RxPowerSample[]) {
  if (!historyEnabled() || samples.length === 0) return
  const activePool = await getPool()

  for (let index = 0; index < samples.length; index += 200) {
    const chunk = samples.slice(index, index + 200)
    const values = chunk.map((s) => [s.oltId, s.onuId, s.rxPower, s.txPower, s.timestamp])
    await activePool.query(
      "INSERT INTO olt_monitor_rx_power (olt_id, onu_id, rx_power, tx_power, ts) VALUES ?",
      [values],
    )
  }
}

export async function readRxPowerSamples(onuId: string, hours: number): Promise<RxPowerSample[]> {
  if (!historyEnabled()) return []
  try {
    const activePool = await getPool()
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ")
    const [rows] = await activePool.query<mysql.RowDataPacket[]>(
      "SELECT id, olt_id AS oltId, onu_id AS onuId, rx_power AS rxPower, tx_power AS txPower, ts AS timestamp FROM olt_monitor_rx_power WHERE onu_id = ? AND ts >= ? ORDER BY ts ASC",
      [onuId, since],
    )
    return rows as RxPowerSample[]
  } catch (error) {
    console.error("[monitoring-db] Gagal membaca rx power:", error instanceof Error ? error.message : error)
    return []
  }
}

export async function cleanupOldRxPower(olderThanDays = 30) {
  if (!historyEnabled()) return
  try {
    const activePool = await getPool()
    const cutoff = new Date(Date.now() - olderThanDays * 86400 * 1000).toISOString().slice(0, 19).replace("T", " ")
    await activePool.query("DELETE FROM olt_monitor_rx_power WHERE ts < ? LIMIT 5000", [cutoff])
  } catch (error) {
    console.error("[monitoring-db] Gagal cleanup rx power:", error instanceof Error ? error.message : error)
  }
}

export async function insertHardwareHistory(entry: HardwareHistoryEntry) {
  if (!historyEnabled()) return
  try {
    const activePool = await getPool()
    await activePool.query(
      "INSERT INTO olt_monitor_hw_history (target_type, target_id, field_name, old_value, new_value, actor, ts) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [entry.targetType, entry.targetId, entry.fieldName, entry.oldValue ?? null, entry.newValue ?? null, entry.actor ?? "system", entry.timestamp],
    )
  } catch (error) {
    console.error("[monitoring-db] Gagal insert hardware history:", error instanceof Error ? error.message : error)
  }
}

export async function readHardwareHistory(targetType: "olt" | "onu", targetId: string, limit = 50): Promise<HardwareHistoryEntry[]> {
  if (!historyEnabled()) return []
  try {
    const activePool = await getPool()
    const [rows] = await activePool.query<mysql.RowDataPacket[]>(
      "SELECT target_type AS targetType, target_id AS targetId, field_name AS fieldName, old_value AS oldValue, new_value AS newValue, actor, ts AS timestamp FROM olt_monitor_hw_history WHERE target_type = ? AND target_id = ? ORDER BY ts DESC LIMIT ?",
      [targetType, targetId, limit],
    )
    return rows as HardwareHistoryEntry[]
  } catch (error) {
    console.error("[monitoring-db] Gagal membaca hardware history:", error instanceof Error ? error.message : error)
    return []
  }
}

export async function insertOnuStatusLog(entry: OnuStatusLog) {
  if (!historyEnabled()) return
  try {
    const activePool = await getPool()
    await activePool.query(
      "INSERT INTO olt_monitor_onu_status_log (onu_id, olt_id, status, cause, ts) VALUES (?, ?, ?, ?, ?)",
      [entry.onuId, entry.oltId, entry.status, entry.cause || null, entry.timestamp],
    )
  } catch (error) {
    console.error("[monitoring-db] Gagal insert onu status log:", error instanceof Error ? error.message : error)
  }
}

export async function readOnuStatusLog(onuId: string, limit = 200): Promise<OnuStatusLog[]> {
  if (!historyEnabled()) return []
  try {
    const activePool = await getPool()
    const [rows] = await activePool.query<mysql.RowDataPacket[]>(
      "SELECT id, onu_id AS onuId, olt_id AS oltId, status, cause, ts AS timestamp FROM olt_monitor_onu_status_log WHERE onu_id = ? ORDER BY ts DESC LIMIT ?",
      [onuId, limit],
    )
    return rows as OnuStatusLog[]
  } catch (error) {
    console.error("[monitoring-db] Gagal membaca onu status log:", error instanceof Error ? error.message : error)
    return []
  }
}

export async function cleanupOldOnuStatusLog(olderThanDays = 90) {
  if (!historyEnabled()) return
  try {
    const activePool = await getPool()
    const cutoff = new Date(Date.now() - olderThanDays * 86400 * 1000).toISOString().slice(0, 19).replace("T", " ")
    await activePool.query("DELETE FROM olt_monitor_onu_status_log WHERE ts < ? LIMIT 5000", [cutoff])
  } catch (error) {
    console.error("[monitoring-db] Gagal cleanup onu status log:", error instanceof Error ? error.message : error)
  }
}
