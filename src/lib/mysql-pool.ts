import mysql from "mysql2/promise"

const DB_HOST = process.env.DB_HOST || "127.0.0.1"
const DB_PORT = Number(process.env.DB_PORT) || 3306
const DB_USER = process.env.DB_USER || "root"
const DB_PASSWORD = process.env.DB_PASSWORD || ""
const DB_NAME = process.env.DB_NAME || "olt_monitoring"

if (!/^[a-zA-Z0-9_-]+$/.test(DB_NAME)) {
  throw new Error("DB_NAME contains invalid characters. Only alphanumeric, underscore, and hyphen are allowed.")
}

let pool: mysql.Pool | null = null
let initPromise: Promise<void> | null = null

export async function getMysqlPool(): Promise<mysql.Pool> {
  if (pool) return pool

  if (!initPromise) {
    initPromise = (async () => {
      const connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
      })
      try {
        await connection.query(
          `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        )
      } finally {
        await connection.end()
      }

      pool = mysql.createPool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        connectionLimit: 15,
        charset: "utf8mb4",
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      })
    })().catch((error) => {
      console.error("[mysql-pool] Inisialisasi MySQL gagal:", error instanceof Error ? error.message : error)
      initPromise = null
      throw error
    })
  }

  await initPromise
  if (!pool) throw new Error("MySQL pool belum tersedia.")
  return pool
}
