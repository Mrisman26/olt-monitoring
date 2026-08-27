import type { Olt, Onu, RebootOnuRequest, RebootOnuResult, RenameOnuRequest, RenameOnuResult, TrafficSample } from "@/lib/types"
import { getOidProfile } from "@/lib/oid-catalog"

export const baseSystemOids = {
  sysDescr: "1.3.6.1.2.1.1.1.0",
  sysObjectId: "1.3.6.1.2.1.1.2.0",
  sysUpTime: "1.3.6.1.2.1.1.3.0",
  sysName: "1.3.6.1.2.1.1.5.0",
  sysLocation: "1.3.6.1.2.1.1.6.0",
}

type SnmpTestTarget = Pick<Olt, "ipAddress" | "snmpPort" | "snmpVersion" | "readCommunity" | "oidProfile">
type SnmpWriteTarget = Pick<Olt, "ipAddress" | "snmpPort" | "snmpVersion" | "readCommunity" | "writeCommunity" | "oidProfile">

type SnmpSession = ReturnType<typeof import("net-snmp").createSession>

type SnmpRow = {
  oid: string
  value: string
}

type PartialOnu = {
  ontIndex: string
  name?: string
  serial?: string
  model?: string
  runState?: string
  rxPower?: number | null
  txPower?: number | null
  temperature?: number | null
  lastDownReason?: string
  lastOnline?: string
  lastOffline?: string
}

const hsgqGponOids = {
  ontInfoBase: "1.3.6.1.4.1.50224.3.12.2.1",
  ontName: "1.3.6.1.4.1.50224.3.12.2.1.2",
  runState: "1.3.6.1.4.1.50224.3.12.2.1.4",
  serial: "1.3.6.1.4.1.50224.3.12.2.1.15",
  lastDownReason: "1.3.6.1.4.1.50224.3.12.2.1.22",
  opticalBase: "1.3.6.1.4.1.50224.3.12.3.1",
  rxPower: "1.3.6.1.4.1.50224.3.12.3.1.4",
  txPower: "1.3.6.1.4.1.50224.3.12.3.1.5",
  temperature: "1.3.6.1.4.1.50224.3.12.3.1.8",
}

const hsgqEponOids = {
  ontInfoBase: "1.3.6.1.4.1.50224.3.3.2.1",
  ontName: "1.3.6.1.4.1.50224.3.3.2.1.2",
  runState: "1.3.6.1.4.1.50224.3.3.2.1.8",
  serial: "1.3.6.1.4.1.50224.3.3.2.1.7",
  lastDownReason: "1.3.6.1.4.1.50224.3.3.2.1.31",
  opticalBase: "1.3.6.1.4.1.50224.3.3.3.1",
  rxPower: "1.3.6.1.4.1.50224.3.3.3.1.4",
  txPower: "",
  temperature: "1.3.6.1.4.1.50224.3.3.3.1.8",
}

const vsolGponOids = {
  productType: "1.3.6.1.4.1.37950.1.1.5.10.14.6.0",
  statusCode: "1.3.6.1.4.1.37950.1.1.6.1.1.1.1.5",
  lastDownReason: "1.3.6.1.4.1.37950.1.1.6.1.1.1.1.10",
  serial: "1.3.6.1.4.1.37950.1.1.6.1.1.2.1.5",
  model: "1.3.6.1.4.1.37950.1.1.6.1.1.2.1.6",
  temperature: "1.3.6.1.4.1.37950.1.1.6.1.1.3.1.3",
  rxPower: "1.3.6.1.4.1.37950.1.1.6.1.1.3.1.7",
  ifDescr: "1.3.6.1.2.1.2.2.1.2",
  ifAlias: "1.3.6.1.2.1.31.1.1.1.18",
}

const zteC320Oids = {
  onuReboot: "1.3.6.1.4.1.3902.1012.3.50.11.3.1.1",
  onuName: "1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.2",
  onuType: "1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.1",
  onuDescription: "1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.3",
  onuSerial: "1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.18",
  onuStatus: "1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.4",
  onuLastOnline: "1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.5",
  onuLastOffline: "1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.6",
  onuLastDownReason: "1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.7",
  opticalBase: "1.3.6.1.4.1.3902.1082.500.20.2.2.2.1",
  rxPower: "1.3.6.1.4.1.3902.1082.500.20.2.2.2.1.10",
  txPower: "1.3.6.1.4.1.3902.1082.500.20.2.2.2.1.12",
}

function valueToText(value: unknown) {
  if (Buffer.isBuffer(value)) {
    const text = value.toString("utf8").replace(/\0/g, "").trim()
    return /^[\x20-\x7E\r\n\t]*$/.test(text) ? text : value.toString("hex").toUpperCase()
  }

  if (value === null || value === undefined) {
    return ""
  }

  return String(value)
}

export function formatSysUpTime(raw: string | undefined | null) {
  if (!raw) return "-"

  const ticks = Number(raw)
  if (!Number.isFinite(ticks) || ticks <= 0) return raw || "-"

  const totalSeconds = Math.floor(ticks / 100)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days} hari`)
  if (hours > 0) parts.push(`${hours} jam`)
  if (minutes > 0) parts.push(`${minutes} menit`)
  if (parts.length === 0) return `${totalSeconds} detik`
  return parts.join(", ")
}

function oidCompare(a: string, b: string) {
  const left = a.split(".").map(Number)
  const right = b.split(".").map(Number)
  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? -1
    const rightValue = right[index] ?? -1
    if (leftValue !== rightValue) return leftValue - rightValue
  }

  return 0
}

function isInSubtree(oid: string, rootOid: string) {
  return oid === rootOid || oid.startsWith(`${rootOid}.`)
}

function toNumber(value: string | undefined) {
  if (!value || value === "NULL" || value === "N/A") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function opticalScale(value: string | undefined) {
  const number = toNumber(value)
  if (number === null || number === -2147483648) return null
  return number / 100
}

/**
 * ZTE C320 ONU RX optical power encoding for
 * 1.3.6.1.4.1.3902.1082.500.20.2.2.2.1.10
 *
 * The OLT returns an unsigned 16-bit raw value:
 *   65535              = unavailable / ONU offline
 *   0..30000           = raw * 0.002 - 30 dBm
 *   30001..65534       = (raw - 65536) * 0.002 - 30 dBm
 */
function zteRxPowerScale(value: string | undefined) {
  const number = toNumber(value)
  if (number === null || number === -2147483648 || number === 65535) return null

  if (number > 30000) {
    return Number((((number - 65536) * 0.002) - 30).toFixed(3))
  }

  return Number((number * 0.002 - 30).toFixed(3))
}

function decodeHsgqOntIndex(index: string) {
  const raw = Number(index)
  if (!Number.isFinite(raw)) {
    return { ponPort: "-", ontId: "-", ponOnt: "-" }
  }

  const base = raw - 16777216
  const ponPort = Math.floor(base / 256)
  const ontId = raw % 256

  return {
    ponPort: String(ponPort),
    ontId: String(ontId),
    ponOnt: `${ponPort}/${ontId}`,
  }
}

function statusFromRunState(runState: string | undefined): Onu["status"] {
  if (String(runState) === "1") return "online"
  return "offline"
}

function statusFromZteRunState(runState: string | undefined): Onu["status"] {
  // ZTE C320 status values observed from live device:
  //   4 = Online, 7 = Offline
  // other codes are treated as offline for monitoring purposes.
  const value = String(runState)
  if (value === "4") return "online"
  return "offline"
}

function statusFromVsolCode(statusCode: string | undefined): Onu["status"] {
  if (String(statusCode) === "3") return "online"
  return "offline"
}

function normalizeDownReason(value: string | undefined) {
  const text = String(value || "").trim()
  if (!text || text === "0") return null

  const numericReasons: Record<string, string> = {
    "1": "LOS",
    "2": "LOSi",
    "3": "LOFi",
    "4": "Dying gasp",
    "5": "LOAMi",
    "6": "Deactive",
    "7": "Reset",
    "8": "Re-register",
    "9": "Power off",
  }

  return numericReasons[text] || text
}

function normalizeZteSerial(value: string | undefined) {
  const text = String(value || "").trim()
  if (!text) return ""

  const match = text.match(/^\d+,(.*)$/)
  if (match && match[1]) return match[1].trim()

  return text
}

function createSnmpSession(snmp: typeof import("net-snmp"), olt: SnmpTestTarget) {
  const version = olt.snmpVersion === "v1" ? snmp.Version1 : snmp.Version2c

  return snmp.createSession(olt.ipAddress, olt.readCommunity, {
    version,
    port: olt.snmpPort || 161,
    timeout: 15000,
    retries: 2,
  })
}

function createSnmpWriteSession(snmp: typeof import("net-snmp"), olt: SnmpWriteTarget) {
  const version = olt.snmpVersion === "v1" ? snmp.Version1 : snmp.Version2c
  const community = olt.writeCommunity?.trim()

  if (!community) {
    throw new Error("Write Community belum diisi.")
  }

  return snmp.createSession(olt.ipAddress, community, {
    version,
    port: olt.snmpPort || 161,
    timeout: 15000,
    retries: 2,
  })
}

function hsgqOntIndexFromOnu(olt: Olt, onu: Onu) {
  const idPrefix = `${olt.id}-`
  if (onu.id.startsWith(idPrefix)) return onu.id.slice(idPrefix.length)

  const ponPort = Number(onu.ponPort)
  const onuIndex = Number(onu.onuIndex)
  if (!Number.isFinite(ponPort) || !Number.isFinite(onuIndex)) return null

  return String(16777216 + ponPort * 256 + onuIndex)
}

function decodeVsolOntIndex(index: string) {
  const [ponPort, ontId] = String(index || "").split(".")

  return {
    ponPort: ponPort || "-",
    ontId: ontId || "-",
    ponOnt: ponPort && ontId ? `${ponPort}/${ontId}` : "-",
  }
}

function decodeZteIndex(index: string) {
  // index format: <encodedPon>.<onuId>
  const parts = String(index || "").split(".")
  if (parts.length < 2) return { board: 0, pon: 0, onuId: 0 }

  const encoded = Number(parts[0])
  const onuId = Number(parts[1])
  if (!Number.isFinite(encoded) || !Number.isFinite(onuId)) return { board: 0, pon: 0, onuId: 0 }

  const board1Base = 285278464
  const board2Base = 285278720

  if (encoded > board2Base && encoded <= board2Base + 16) {
    return { board: 2, pon: encoded - board2Base, onuId }
  }
  if (encoded > board1Base && encoded <= board1Base + 16) {
    return { board: 1, pon: encoded - board1Base, onuId }
  }

  return { board: 0, pon: 0, onuId: 0 }
}

function ztePonParts(ponPort: string) {
  return String(ponPort || "").split("/").map(Number).filter(Number.isFinite)
}

function comparePonPort(a: string, b: string) {
  const left = ztePonParts(a)
  const right = ztePonParts(b)
  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0
    const rightValue = right[index] ?? 0
    if (leftValue !== rightValue) return leftValue - rightValue
  }

  return 0
}

function mapZteOnus(olt: Olt, items: PartialOnu[]): Onu[] {
  return items
    .filter((item) => item.name || item.serial || item.runState || item.rxPower !== undefined)
    .map((item) => {
      const idx = decodeZteIndex(item.ontIndex)
      const status = statusFromZteRunState(item.runState)
      const board = idx.board > 0 ? `${idx.board}/` : ""
      const fallbackName = item.serial ? `ONU-${item.serial}` : `ONU-${board}${idx.pon}/${idx.onuId}`

      return {
        id: `${olt.id}-${item.ontIndex}`,
        oltId: olt.id,
        name: item.name || fallbackName,
        serialNumber: item.serial || "-",
        ponPort: idx.board > 0 ? `${idx.board}/${idx.pon}` : String(idx.pon),
        onuIndex: String(idx.onuId),
        status,
        rxPower: item.rxPower ?? 0,
        txPower: item.txPower ?? 0,
        temperatureC: item.temperature ?? null,
        downReason: normalizeDownReason(item.lastDownReason),
        distanceMeters: 0,
        lastSeen: "Baru saja",
        syncStatus: "synced" as const,
      }
    })
    .sort((a, b) => {
      const ponComparison = comparePonPort(a.ponPort, b.ponPort)
      if (ponComparison !== 0) return ponComparison
      return Number(a.onuIndex) - Number(b.onuIndex)
    })
}

function getVsolPonCount(productType: string | undefined) {
  const match = String(productType || "").match(/OLT-(\d+)G/i)
  const ponCount = match ? Number(match[1]) : 4

  return Number.isFinite(ponCount) && ponCount > 0 ? ponCount : 4
}

function parseVsolIfDescr(value: string | undefined) {
  const match = String(value || "")
    .trim()
    .match(/^GPON0?(\d+)ONU(\d+)\s*(.*)$/i)

  if (!match) return null

  const pon = Number(match[1])
  const ont = Number(match[2])
  const name = String(match[3] || "").trim()

  if (!pon || !ont) return null

  return {
    ontIndex: `${pon}.${ont}`,
    name,
  }
}

function parseVsolIfDescrName(value: string | undefined) {
  const parsed = parseVsolIfDescr(value)
  if (!parsed?.name) return null
  return parsed
}

function vsolInterfaceIndexFromOnu(onu: Onu) {
  const ponPort = Number(onu.ponPort)
  const onuIndex = Number(onu.onuIndex)

  if (!Number.isFinite(ponPort) || !Number.isFinite(onuIndex) || ponPort < 1 || onuIndex < 1) return null

  if (ponPort === 1) return String(onuIndex + 9)
  if (ponPort === 2) return String(onuIndex + 81)
  if (ponPort === 3) return String(onuIndex + 144)
  if (ponPort === 4) return String(onuIndex + 145)

  return null
}

function isDefaultVsolAlias(value: string | undefined) {
  return /^GPON0\/\d+:\d+$/i.test(String(value || "").trim())
}

function findVsolIfDescrTarget(rows: SnmpRow[], onu?: Onu) {
  if (onu) {
    const ontIndex = `${onu.ponPort}.${onu.onuIndex}`
    const found = rows.find((row) => parseVsolIfDescr(row.value)?.ontIndex === ontIndex)
    if (found) return found
  }

  return rows.find((row) => parseVsolIfDescr(row.value))
}

function findVsolAliasTarget(rows: SnmpRow[], onu?: Onu) {
  if (onu) {
    const interfaceIndex = vsolInterfaceIndexFromOnu(onu)
    const foundByOid = interfaceIndex ? rows.find((row) => row.oid === `${vsolGponOids.ifAlias}.${interfaceIndex}`) : undefined
    if (foundByOid) return foundByOid
  }

  return rows.find((row) => row.value && !isDefaultVsolAlias(row.value)) ?? rows.find((row) => row.value)
}

function vsolInterfaceIndexFromOid(oid: string, baseOid: string) {
  return oid.startsWith(`${baseOid}.`) ? oid.replace(`${baseOid}.`, "") : null
}

function mapVsolInterfaceIndexes(ifDescrRows: SnmpRow[]) {
  const indexes = new Map<string, string>()

  for (const row of ifDescrRows) {
    const parsed = parseVsolIfDescr(row.value)
    const interfaceIndex = vsolInterfaceIndexFromOid(row.oid, vsolGponOids.ifDescr)

    if (parsed?.ontIndex && interfaceIndex) {
      indexes.set(parsed.ontIndex, interfaceIndex)
    }
  }

  return indexes
}

async function walk(snmp: typeof import("net-snmp"), session: SnmpSession, rootOid: string, maxRows = 12000) {
  const rows: SnmpRow[] = []
  let cursor = rootOid

  while (rows.length < maxRows) {
    const varbinds = await new Promise<Array<Array<{ oid: string; value: unknown }> | { oid: string; value: unknown }>>((resolve, reject) => {
      session.getBulk([cursor], 0, 25, (error, result) => {
        if (error) {
          reject(error)
          return
        }
        resolve(result)
      })
    })
    const list = Array.isArray(varbinds[0]) ? (varbinds[0] as Array<{ oid: string; value: unknown }>) : (varbinds as Array<{ oid: string; value: unknown }>)
    let moved = false

    for (const varbind of list) {
      if (!varbind?.oid || !isInSubtree(varbind.oid, rootOid)) return rows
      if (oidCompare(varbind.oid, cursor) <= 0) continue
      if (!snmp.isVarbindError(varbind)) {
        rows.push({ oid: varbind.oid, value: valueToText(varbind.value) })
      }
      cursor = varbind.oid
      moved = true
      if (rows.length >= maxRows) return rows
    }

    if (!moved) return rows
  }

  return rows
}

async function getRows(snmp: typeof import("net-snmp"), session: SnmpSession, oids: string[]) {
  if (oids.length === 0) return [] as SnmpRow[]

  return new Promise<SnmpRow[] | null>((resolve) => {
    session.get(oids, (error: Error | null, varbinds: Array<{ oid: string; value: unknown }>) => {
      if (error) {
        resolve(null)
        return
      }

      const rows: SnmpRow[] = []
      for (const varbind of varbinds) {
        if (!snmp.isVarbindError(varbind)) {
          rows.push({ oid: varbind.oid, value: valueToText(varbind.value) })
        }
      }
      resolve(rows)
    })
  })
}

async function getRowsWithFallback(snmp: typeof import("net-snmp"), session: SnmpSession, oids: string[]): Promise<SnmpRow[]> {
  const rows = await getRows(snmp, session, oids)
  if (rows !== null) return rows
  if (oids.length <= 1) return []

  const middle = Math.ceil(oids.length / 2)
  const [left, right] = await Promise.all([
    getRowsWithFallback(snmp, session, oids.slice(0, middle)),
    getRowsWithFallback(snmp, session, oids.slice(middle)),
  ])

  return [...left, ...right]
}

async function getColumnForIndexes(snmp: typeof import("net-snmp"), session: SnmpSession, baseOid: string, indexes: string[], chunkSize = 24) {
  const rows: SnmpRow[] = []

  for (let index = 0; index < indexes.length; index += chunkSize) {
    const chunk = indexes.slice(index, index + chunkSize).map((item) => `${baseOid}.${item}`)
    const chunkRows = await getRowsWithFallback(snmp, session, chunk)
    rows.push(...chunkRows)
  }

  return rows
}

function assignByColumn(target: Map<string, PartialOnu>, rows: SnmpRow[], baseOid: string, key: keyof PartialOnu, transform: (value: string) => PartialOnu[keyof PartialOnu] = (value) => value) {
  rows
    .filter((row) => row.oid.startsWith(`${baseOid}.`))
    .forEach((row) => {
      const index = row.oid.replace(`${baseOid}.`, "")
      if (!target.has(index)) target.set(index, { ontIndex: index })
      const item = target.get(index)
      if (item) {
        Object.assign(item, { [key]: transform(row.value) })
      }
    })
}

function assignVsolNames(target: Map<string, PartialOnu>, rows: SnmpRow[]) {
  rows.forEach((row) => {
    const parsed = parseVsolIfDescrName(row.value)
    if (!parsed) return

    if (!target.has(parsed.ontIndex)) target.set(parsed.ontIndex, { ontIndex: parsed.ontIndex })
    const item = target.get(parsed.ontIndex)
    if (item) {
      item.name = parsed.name
    }
  })
}

function assignVsolAliasNames(target: Map<string, PartialOnu>, rows: SnmpRow[], interfaceIndexByOntIndex: Map<string, string>) {
  rows.forEach((row) => {
    const interfaceIndex = vsolInterfaceIndexFromOid(row.oid, vsolGponOids.ifAlias)
    const value = String(row.value || "").trim()

    if (!interfaceIndex || !value || isDefaultVsolAlias(value)) return

    for (const [ontIndex, mappedInterfaceIndex] of interfaceIndexByOntIndex.entries()) {
      if (mappedInterfaceIndex !== interfaceIndex) continue
      if (!target.has(ontIndex)) target.set(ontIndex, { ontIndex })
      const item = target.get(ontIndex)
      if (item) item.name = value
      return
    }
  })
}

function assignOpticalColumn(target: Map<string, PartialOnu>, rows: SnmpRow[], baseOid: string, key: keyof PartialOnu) {
  if (!baseOid) return

  rows
    .filter((row) => row.oid.startsWith(`${baseOid}.`))
    .forEach((row) => {
      const rawIndex = row.oid.replace(`${baseOid}.`, "")
      const parts = rawIndex.split(".")
      const isZteEncoded = parts.length > 2 && Number(parts[0]) >= 100000000
      const index = isZteEncoded ? `${parts[0]}.${parts[1]}` : parts[0]
      const suffix = isZteEncoded ? parts.slice(2).join(".") : parts.slice(1).join(".")
      const isMainReading = suffix === "" || suffix === "0.0" || suffix === "1"

      if (!target.has(index)) target.set(index, { ontIndex: index })
      const item = target.get(index)
      if (item && (isMainReading || item[key] === undefined || item[key] === null)) {
        const scaledValue = baseOid === zteC320Oids.rxPower
          ? zteRxPowerScale(row.value)
          : opticalScale(row.value)

        Object.assign(item, { [key]: scaledValue })
      }
    })
}

function mapVsolOnus(olt: Olt, items: PartialOnu[]): Onu[] {
  return items
    .filter((item) => item.serial || item.model || item.rxPower !== undefined || item.runState)
    .map((item) => {
      const decoded = decodeVsolOntIndex(item.ontIndex)
      const status = statusFromVsolCode(item.runState)
      const fallbackName = item.serial ? `ONU-${item.serial}` : `ONU-${decoded.ponOnt}`

      return {
        id: `${olt.id}-${item.ontIndex}`,
        oltId: olt.id,
        name: item.name || fallbackName,
        serialNumber: item.serial || "-",
        ponPort: decoded.ponPort,
        onuIndex: decoded.ontId,
        status,
        rxPower: item.rxPower ?? 0,
        txPower: item.txPower ?? 0,
        temperatureC: item.temperature ?? null,
        downReason: normalizeDownReason(item.lastDownReason),
        distanceMeters: 0,
        lastSeen: "Baru saja",
        syncStatus: "synced" as const,
      }
    })
    .sort((a, b) => {
      const aPon = Number(a.ponPort)
      const bPon = Number(b.ponPort)
      if (aPon !== bPon) return aPon - bPon
      return Number(a.onuIndex) - Number(b.onuIndex)
    })
}

function mapHsgqOnus(olt: Olt, items: PartialOnu[]): Onu[] {
  return items
    .filter((item) => item.name || item.serial || item.runState || item.rxPower !== undefined)
    .map((item) => {
      const decoded = decodeHsgqOntIndex(item.ontIndex)
      const status = statusFromRunState(item.runState)
      const fallbackName = item.serial ? `ONU-${item.serial}` : `ONU-${decoded.ponOnt}`

      return {
        id: `${olt.id}-${item.ontIndex}`,
        oltId: olt.id,
        name: item.name || fallbackName,
        serialNumber: item.serial || "-",
        ponPort: decoded.ponPort,
        onuIndex: decoded.ontId,
        status,
        rxPower: item.rxPower ?? 0,
        txPower: item.txPower ?? 0,
        temperatureC: item.temperature ?? null,
        downReason: normalizeDownReason(item.lastDownReason),
        distanceMeters: 0,
        lastSeen: "Baru saja",
        syncStatus: "synced" as const,
      }
    })
    .sort((a, b) => {
      const aPon = Number(a.ponPort)
      const bPon = Number(b.ponPort)
      if (aPon !== bPon) return aPon - bPon
      return Number(a.onuIndex) - Number(b.onuIndex)
    })
}

async function pollVsolOnusFromOlt(snmp: typeof import("net-snmp"), session: SnmpSession, olt: Olt) {
  const systemRows = await getRowsWithFallback(snmp, session, [baseSystemOids.sysDescr, baseSystemOids.sysObjectId, baseSystemOids.sysUpTime, baseSystemOids.sysName, vsolGponOids.productType])
  const systemValues = Object.fromEntries(systemRows.map((row) => [row.oid, row.value]))
  const ponCount = getVsolPonCount(systemValues[vsolGponOids.productType])
  const uptime = formatSysUpTime(systemValues[baseSystemOids.sysUpTime])
  const generatedIndexes: string[] = []

  for (let pon = 1; pon <= ponCount; pon += 1) {
    for (let onu = 1; onu <= 128; onu += 1) {
      generatedIndexes.push(`${pon}.${onu}`)
    }
  }

  const onusByIndex = new Map<string, PartialOnu>()
  const statusRows = await getColumnForIndexes(snmp, session, vsolGponOids.statusCode, generatedIndexes, 24)

  assignByColumn(onusByIndex, statusRows, vsolGponOids.statusCode, "runState")

  const indexes = [...onusByIndex.keys()].sort((a, b) => {
    const left = decodeVsolOntIndex(a)
    const right = decodeVsolOntIndex(b)
    const leftPon = Number(left.ponPort)
    const rightPon = Number(right.ponPort)

    if (leftPon !== rightPon) return leftPon - rightPon
    return Number(left.ontId) - Number(right.ontId)
  })

  const [serialRows, modelRows, lastDownReasonRows, temperatureRows, rxPowerRows, ifDescrRows, ifAliasRows] = await Promise.all([
    getColumnForIndexes(snmp, session, vsolGponOids.serial, indexes, 24),
    getColumnForIndexes(snmp, session, vsolGponOids.model, indexes, 24),
    getColumnForIndexes(snmp, session, vsolGponOids.lastDownReason, indexes, 24),
    getColumnForIndexes(snmp, session, vsolGponOids.temperature, indexes, 12),
    getColumnForIndexes(snmp, session, vsolGponOids.rxPower, indexes, 12),
    walk(snmp, session, vsolGponOids.ifDescr, 320),
    walk(snmp, session, vsolGponOids.ifAlias, 320),
  ])

  assignByColumn(onusByIndex, serialRows, vsolGponOids.serial, "serial")
  assignByColumn(onusByIndex, modelRows, vsolGponOids.model, "model")
  assignByColumn(onusByIndex, lastDownReasonRows, vsolGponOids.lastDownReason, "lastDownReason")
  assignByColumn(onusByIndex, temperatureRows, vsolGponOids.temperature, "temperature", toNumber)
  assignByColumn(onusByIndex, rxPowerRows, vsolGponOids.rxPower, "rxPower", toNumber)
  const interfaceIndexByOntIndex = mapVsolInterfaceIndexes(ifDescrRows)
  assignVsolNames(onusByIndex, ifDescrRows)
  assignVsolAliasNames(onusByIndex, ifAliasRows, interfaceIndexByOntIndex)

  return { onus: mapVsolOnus(olt, [...onusByIndex.values()]), uptime }
}

export async function testSnmpConnection(olt: SnmpTestTarget) {
  if (!olt.ipAddress || !olt.readCommunity) {
    return {
      ok: false,
      message: "IP dan community SNMP wajib diisi.",
    }
  }

  const snmp = await import("net-snmp")
  const profile = getOidProfile(olt.oidProfile)
  const systemOids = profile.items.filter((item) => item.kind === "system").map((item) => item.oid)
  const session = createSnmpSession(snmp, olt)

  try {
    const values = await new Promise<Record<string, string>>((resolve, reject) => {
      session.get(systemOids, (error: Error | null, varbinds: Array<{ oid: string; value: unknown }>) => {
        if (error) {
          reject(error)
          return
        }

        const result: Record<string, string> = {}
        for (const varbind of varbinds) {
          result[varbind.oid] = valueToText(varbind.value)
        }
        resolve(result)
      })
    })

    return {
      ok: true,
      message: `SNMP berhasil ke ${olt.ipAddress}:${olt.snmpPort || 161}. Profil OID: ${profile.name}.`,
      values,
      oids: profile.items,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "SNMP test gagal.",
      oids: profile.items,
    }
  } finally {
    session.close()
  }
}

export async function pollOnusFromOlt(olt: Olt) {
  if (!olt.ipAddress || !olt.readCommunity) {
    return {
      ok: false,
      message: "IP dan community SNMP wajib diisi.",
      onus: [] as Onu[],
    }
  }

  if (olt.oidProfile !== "hsgq-gpon" && olt.oidProfile !== "hsgq-epon" && olt.oidProfile !== "vsol-gpon" && olt.oidProfile !== "zte-c320") {
    return {
      ok: false,
      message: `Polling ONU untuk profile ${olt.oidProfile} belum aktif. Saat ini yang aktif: VSOL GPON, HSGQ GPON/EPON, ZTE C320.`,
      onus: [] as Onu[],
    }
  }

  const snmp = await import("net-snmp")
  const session = createSnmpSession(snmp, olt)

  try {
    if (olt.oidProfile === "vsol-gpon") {
      const { onus, uptime } = await pollVsolOnusFromOlt(snmp, session, olt)

      return {
        ok: true,
        message: `Polling ONU selesai. Ditemukan ${onus.length} ONU/ONT dari ${olt.name}.`,
        onus,
        uptime,
      }
    }

    if (olt.oidProfile === "zte-c320") {
      const onusByIndex = new Map<string, PartialOnu>()

      const [nameRows, typeRows, serialRows, statusRows, lastDownRows, lastOnlineRows, lastOfflineRows, uptimeRows] = await Promise.all([
        walk(snmp, session, zteC320Oids.onuName, 1200),
        walk(snmp, session, zteC320Oids.onuType, 1200),
        walk(snmp, session, zteC320Oids.onuSerial, 1200),
        walk(snmp, session, zteC320Oids.onuStatus, 1200),
        walk(snmp, session, zteC320Oids.onuLastDownReason, 1200),
        walk(snmp, session, zteC320Oids.onuLastOnline, 1200),
        walk(snmp, session, zteC320Oids.onuLastOffline, 1200),
        getRowsWithFallback(snmp, session, [baseSystemOids.sysUpTime]),
      ])

      assignByColumn(onusByIndex, nameRows, zteC320Oids.onuName, "name")
      assignByColumn(onusByIndex, typeRows, zteC320Oids.onuType, "model")
      assignByColumn(onusByIndex, serialRows, zteC320Oids.onuSerial, "serial", normalizeZteSerial)
      assignByColumn(onusByIndex, statusRows, zteC320Oids.onuStatus, "runState")
      assignByColumn(onusByIndex, lastDownRows, zteC320Oids.onuLastDownReason, "lastDownReason")
      assignByColumn(onusByIndex, lastOnlineRows, zteC320Oids.onuLastOnline, "lastOnline")
      assignByColumn(onusByIndex, lastOfflineRows, zteC320Oids.onuLastOffline, "lastOffline")

      // ZTE C320 dapat hang saat walk tree rxPower (enumerasi besar). Dipakai
      // get chunked per-ONU seperti VSOL agar agent tidak jenuh. Jika tetap
      // gagal, polling dilanjutkan tanpa rxPower (rxPower jadi 0).
      try {
        const opticalRows = await getColumnForIndexes(
          snmp,
          session,
          zteC320Oids.rxPower,
          [...onusByIndex.keys()].map((index) => `${index}.1`),
          24,
        )
        assignOpticalColumn(onusByIndex, opticalRows, zteC320Oids.rxPower, "rxPower")
      } catch (error) {
        console.warn(`[snmp] Gagal membaca rxPower ${olt.name}: ${error instanceof Error ? error.message : error}. Dilanjutkan tanpa rxPower.`)
      }

      try {
        const txOpticalRows = await getColumnForIndexes(
          snmp,
          session,
          zteC320Oids.txPower,
          [...onusByIndex.keys()].map((index) => `${index}.1`),
          24,
        )
        assignOpticalColumn(onusByIndex, txOpticalRows, zteC320Oids.txPower, "txPower")
      } catch (error) {
        console.warn(`[snmp] Gagal membaca txPower ${olt.name}: ${error instanceof Error ? error.message : error}. Dilanjutkan tanpa txPower.`)
      }

      const onus = mapZteOnus(olt, [...onusByIndex.values()])
      const uptime = formatSysUpTime(uptimeRows.find((r) => r.oid === baseSystemOids.sysUpTime)?.value)

      return {
        ok: true,
        message: `Polling ONU selesai. Ditemukan ${onus.length} ONU/ONT dari ${olt.name}.`,
        onus,
        uptime,
      }
    }

    const oids = olt.oidProfile === "hsgq-epon" ? hsgqEponOids : hsgqGponOids
    const [ontInfoRows, opticalRows, uptimeRows] = await Promise.all([walk(snmp, session, oids.ontInfoBase), walk(snmp, session, oids.opticalBase), getRowsWithFallback(snmp, session, [baseSystemOids.sysUpTime])])
    const onusByIndex = new Map<string, PartialOnu>()

    assignByColumn(onusByIndex, ontInfoRows, oids.ontName, "name")
    assignByColumn(onusByIndex, ontInfoRows, oids.runState, "runState")
    assignByColumn(onusByIndex, ontInfoRows, oids.serial, "serial")
    assignByColumn(onusByIndex, ontInfoRows, oids.lastDownReason, "lastDownReason")
    assignOpticalColumn(onusByIndex, opticalRows, oids.rxPower, "rxPower")
    assignOpticalColumn(onusByIndex, opticalRows, oids.txPower, "txPower")
    assignOpticalColumn(onusByIndex, opticalRows, oids.temperature, "temperature")

    const onus = mapHsgqOnus(olt, [...onusByIndex.values()])
    const uptime = formatSysUpTime(uptimeRows.find((r) => r.oid === baseSystemOids.sysUpTime)?.value)

    return {
      ok: true,
      message: `Polling ONU selesai. Ditemukan ${onus.length} ONU/ONT dari ${olt.name}.`,
      onus,
      uptime,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Polling ONU gagal.",
      onus: [] as Onu[],
    }
  } finally {
    session.close()
  }
}

export async function testOnuRenameWrite(olt: Olt) {
  if (!olt.writeCommunity?.trim()) {
    return {
      ok: false,
      message: "Write Community belum diisi. Test write dan fitur rename masih nonaktif.",
    }
  }

  if (olt.writeMode !== "snmp") {
    return {
      ok: false,
      message: "Mode rename ONU harus SNMP untuk menjalankan Test Write.",
    }
  }

  if (olt.oidProfile === "hsgq-epon") {
    return {
      ok: false,
      message: "HSGQ EPON belum mendukung rename via SNMP. OID nama ONU EPON bisa dibaca, tetapi OLT menolak saat ditulis.",
    }
  }

  if (olt.oidProfile !== "hsgq-gpon" && olt.oidProfile !== "vsol-gpon" && olt.oidProfile !== "zte-c320") {
    return {
      ok: false,
      message: `Test Write untuk profile ${olt.oidProfile} belum tersedia. Saat ini yang aktif: VSOL GPON, HSGQ GPON, dan ZTE C320.`,
    }
  }

  const snmp = await import("net-snmp")
  const isVsol = olt.oidProfile === "vsol-gpon"
  const isZte = olt.oidProfile === "zte-c320"
  const readSession = createSnmpSession(snmp, olt)

  try {
    const rows = isZte
      ? await walk(snmp, readSession, zteC320Oids.onuName, 1200)
      : isVsol
      ? await walk(snmp, readSession, vsolGponOids.ifAlias, 320)
      : await walk(snmp, readSession, hsgqGponOids.ontName, 1)
    const target = isZte ? rows[0] : isVsol ? findVsolAliasTarget(rows) : rows[0]

    if (!target?.oid || !target.value) {
      return {
        ok: false,
        message: isZte
          ? "Test Write belum bisa dilakukan karena belum ada nama ONU ZTE C320 yang terbaca dari OLT."
          : isVsol
          ? "Test Write belum bisa dilakukan karena belum ada alias ONU VSOL yang terbaca dari OLT."
          : "Test Write belum bisa dilakukan karena belum ada nama ONU/ONT yang terbaca dari OLT.",
      }
    }

    const writeSession = createSnmpWriteSession(snmp, olt)

    try {
      await new Promise<void>((resolve, reject) => {
        sessionSet(writeSession, snmp.ObjectType.OctetString, target.oid, target.value, (error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })

      return {
        ok: true,
        message: isZte
          ? "Write Community valid untuk ZTE C320. OID nama ONU berhasil diakses dan dapat diuji dengan write pada nama yang sama."
          : isVsol
          ? "Write Community valid untuk alias VSOL. Nama dari aplikasi akan dijaga saat polling ulang karena nama utama VSOL masih dibaca dari ifDescr."
          : "Write Community valid. Rename ONU/ONT siap digunakan.",
      }
    } finally {
      writeSession.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ""

    if (isVsol && message.includes("NotWritable")) {
      return {
        ok: false,
        message:
          "Test Write menjangkau OLT VSOL, tetapi OID alias ONU/ONT masih ditolak (NotWritable). Pastikan SNMP Read-Write aktif dan Write Community benar.",
      }
    }

    return {
      ok: false,
      message: error instanceof Error ? `Test Write gagal: ${error.message}` : "Test Write gagal.",
    }
  } finally {
    readSession.close()
  }
}

function zteOntIndexFromOnu(olt: Olt, onu: Onu) {
  const idPrefix = `${olt.id}-`
  if (!onu.id.startsWith(idPrefix)) return null
  return onu.id.slice(idPrefix.length)
}

function sessionSet(
  session: SnmpSession,
  type: number,
  oid: string,
  value: string | number,
  callback: (error: Error | null) => void,
) {
  session.set([{ oid, type, value }], (error) => callback(error))
}

export async function renameOnuOnDevice({ olt, onu, nextName }: RenameOnuRequest): Promise<RenameOnuResult> {
  const cleanName = nextName.trim()

  if (!cleanName) {
    return {
      ok: false,
      syncedToDevice: false,
      message: "Nama ONU/ONT tidak boleh kosong.",
    }
  }

  if (cleanName.length > 64) {
    return {
      ok: false,
      syncedToDevice: false,
      message: "Nama ONU/ONT maksimal 64 karakter agar aman dikirim ke OLT.",
    }
  }

  if (olt.writeMode === "none") {
    return {
      ok: true,
      syncedToDevice: false,
      message: "Nama tersimpan di aplikasi. OLT ini belum punya metode write yang aktif.",
    }
  }

  if (olt.writeMode === "snmp") {
    if (olt.oidProfile === "hsgq-epon") {
      return {
        ok: false,
        syncedToDevice: false,
        message: "HSGQ EPON belum mendukung rename via SNMP. OID nama ONU EPON bisa dibaca, tetapi OLT menolak saat ditulis.",
      }
    }

    if (olt.oidProfile !== "hsgq-gpon" && olt.oidProfile !== "vsol-gpon" && olt.oidProfile !== "zte-c320") {
      return {
        ok: false,
        syncedToDevice: false,
        message: `SNMP rename untuk profile ${olt.oidProfile} belum tersedia. Saat ini yang aktif: VSOL GPON, HSGQ GPON, dan ZTE C320.`,
      }
    }

    if (olt.oidProfile === "vsol-gpon") {
      const snmp = await import("net-snmp")
      const readSession = createSnmpSession(snmp, olt)

      try {
        const ifDescrRows = await walk(snmp, readSession, vsolGponOids.ifDescr, 320)
        const ifDescrTarget = findVsolIfDescrTarget(ifDescrRows, onu)
        const dynamicInterfaceIndex = ifDescrTarget ? vsolInterfaceIndexFromOid(ifDescrTarget.oid, vsolGponOids.ifDescr) : null
        const fallbackInterfaceIndex = vsolInterfaceIndexFromOnu(onu)
        const targetIndex = dynamicInterfaceIndex || fallbackInterfaceIndex

        if (!targetIndex) {
          return {
            ok: false,
            syncedToDevice: false,
            message: "Index ONU/ONT VSOL tidak valid, rename ke OLT dibatalkan.",
          }
        }

        const targetOid = `${vsolGponOids.ifAlias}.${targetIndex}`
        const session = createSnmpWriteSession(snmp, olt)

        try {
          await new Promise<void>((resolve, reject) => {
            sessionSet(session, snmp.ObjectType.OctetString, targetOid, cleanName, (error) => {
              if (error) {
                reject(error)
                return
              }
              resolve()
            })
          })

          return {
            ok: true,
            syncedToDevice: false,
            message:
              `Nama ${onu.serialNumber} disimpan di aplikasi. OLT VSOL menerima write ke alias, tetapi nama utama ONU masih dibaca dari ifDescr yang read-only, jadi aplikasi akan menjaga nama ini saat polling ulang.`,
          }
        } finally {
          session.close()
        }
      } catch (error) {
        return {
          ok: false,
          syncedToDevice: false,
          message: error instanceof Error ? `Rename ke OLT VSOL gagal: ${error.message}` : "Rename ke OLT VSOL gagal.",
        }
      } finally {
        readSession.close()
      }
    }

    if (olt.oidProfile === "zte-c320") {
      const deviceIndex = zteOntIndexFromOnu(olt, onu)
      if (!deviceIndex) {
        return {
          ok: false,
          syncedToDevice: false,
          message: "Index ONU/ONT ZTE tidak valid, rename ke OLT dibatalkan.",
        }
      }

      const snmp = await import("net-snmp")
      const session = createSnmpWriteSession(snmp, olt)
      const targetOid = `${zteC320Oids.onuName}.${deviceIndex}`

      try {
        await new Promise<void>((resolve, reject) => {
          sessionSet(session, snmp.ObjectType.OctetString, targetOid, cleanName, (error) => {
            if (error) {
              reject(error)
              return
            }
            resolve()
          })
        })

        return {
          ok: true,
          syncedToDevice: true,
          message: `Nama ${onu.serialNumber} berhasil diubah di aplikasi dan OLT ZTE C320.`,
        }
      } catch (error) {
        return {
          ok: false,
          syncedToDevice: false,
          message: error instanceof Error ? `Rename ke OLT ZTE C320 gagal: ${error.message}` : "Rename ke OLT ZTE C320 gagal.",
        }
      } finally {
        session.close()
      }
    }

    const deviceIndex = hsgqOntIndexFromOnu(olt, onu)
    if (!deviceIndex) {
      return {
        ok: false,
        syncedToDevice: false,
        message: "Index ONU/ONT tidak valid, rename ke OLT dibatalkan.",
      }
    }

    const snmp = await import("net-snmp")
    const oids = hsgqGponOids
    const session = createSnmpWriteSession(snmp, olt)
    const targetOid = `${oids.ontName}.${deviceIndex}`

    try {
      await new Promise<void>((resolve, reject) => {
        sessionSet(session, snmp.ObjectType.OctetString, targetOid, cleanName, (error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })

      return {
        ok: true,
        syncedToDevice: true,
        message: `Nama ${onu.serialNumber} berhasil diubah di aplikasi dan OLT.`,
      }
    } catch (error) {
      return {
        ok: false,
        syncedToDevice: false,
        message: error instanceof Error ? `Rename ke OLT gagal: ${error.message}` : "Rename ke OLT gagal.",
      }
    } finally {
      session.close()
    }
  }

  return {
    ok: true,
    syncedToDevice: false,
    message: `Nama tersimpan di aplikasi. Metode ${olt.writeMode.toUpperCase()} untuk ${onu.serialNumber} siap disambungkan ke adapter vendor.`,
  }
}

export async function rebootOnuOnDevice({ olt, onu }: RebootOnuRequest): Promise<RebootOnuResult> {
  if (!olt.writeCommunity?.trim()) {
    return {
      ok: false,
      message: "Write Community belum diisi. Fitur reboot ONU nonaktif.",
    }
  }

  if (olt.writeMode !== "snmp") {
    return {
      ok: false,
      message: "Reboot ONU via SNMP memerlukan mode write SNMP pada pengaturan OLT.",
    }
  }

  if (olt.oidProfile !== "zte-c320") {
    return {
      ok: false,
      message: `Reboot ONU via SNMP untuk profile ${olt.oidProfile} belum tersedia. Saat ini yang aktif: ZTE C320.`,
    }
  }

  const [slot, pon] = onu.ponPort.split("/").map(Number)
  if (!Number.isInteger(slot) || !Number.isInteger(pon) || !onu.onuIndex) {
    return {
      ok: false,
      message: "Informasi slot/port ONU tidak valid, reboot ke OLT dibatalkan.",
    }
  }

  const deviceIndex = `${0x10000000 + (slot << 16) + (pon << 8)}.${onu.onuIndex}`
  const snmp = await import("net-snmp")
  const session = createSnmpWriteSession(snmp, olt)
  const targetOid = `${zteC320Oids.onuReboot}.${deviceIndex}`

  try {
    await new Promise<void>((resolve, reject) => {
      sessionSet(session, snmp.ObjectType.Integer, targetOid, 1, (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })

    return {
      ok: true,
      message: `Perintah reboot terkirim ke OLT ZTE C320 untuk ${onu.name || onu.serialNumber} (${onu.ponPort}:${onu.onuIndex}).`,
    }
  } catch (error) {
    let detail = error instanceof Error ? error.message : "Error SNMP tak dikenal."

    try {
      const readSnmp = await import("net-snmp")
      const readSession = createSnmpSession(readSnmp, olt)
      const rows = await walk(readSnmp, readSession, zteC320Oids.onuReboot, 200)
      readSession.close()

      if (rows.length === 0) {
        detail = `${detail}. Diagnostik: walk ${zteC320Oids.onuReboot} di OLT tidak menemukan instance apa pun (tree reboot mungkin tidak tersedia di firmware V2.1).`
      } else {
        const samples = rows.slice(0, 6).map((row) => row.oid).join(", ")
        detail = `${detail}. Diagnostik: instance tree reboot yang ada di OLT: ${samples}`
      }
    } catch (walkError) {
      detail = `${detail}. (Diagnostik walk gagal: ${walkError instanceof Error ? walkError.message : "SNMP error"})`
    }

    return {
      ok: false,
      message: `Reboot ONU gagal: ${detail}`,
    }
  } finally {
    session.close()
  }
}
const ifMibOids = {
  ifDescr: "1.3.6.1.2.1.2.2.1.2",
  ifHCInOctets: "1.3.6.1.2.1.31.1.1.1.6",
  ifHCOutOctets: "1.3.6.1.2.1.31.1.1.1.10",
  ifHCInUcastPkts: "1.3.6.1.2.1.31.1.1.1.7",
  ifHCOutUcastPkts: "1.3.6.1.2.1.31.1.1.1.11",
  ifSpeed: "1.3.6.1.2.1.2.2.1.5",
  ifHighSpeed: "1.3.6.1.2.1.31.1.1.1.15",
}

type IfCounterMap = Map<string, { inOctets: bigint; outOctets: bigint; inPkts: bigint; outPkts: bigint; ifSpeed: number }>

function parseGponOnuIfDescr(value: string) {
  const text = String(value || "").trim()

  const gponMatch3 = text.match(/gpon-onu_(\d+)\/(\d+)\/(\d+):(\d+)/i)
  if (gponMatch3) {
    return { ponPort: `${gponMatch3[1]}/${gponMatch3[2]}`, onuIndex: gponMatch3[3], subIndex: gponMatch3[4] }
  }

  const gponMatch2 = text.match(/gpon-onu_(\d+)\/(\d+):(\d+)/i)
  if (gponMatch2) {
    return { ponPort: gponMatch2[1], onuIndex: gponMatch2[2], subIndex: gponMatch2[3] }
  }

  const v1Match = text.match(/GPON0?(\d+)ONU(\d+)/i)
  if (v1Match) {
    return { ponPort: v1Match[1], onuIndex: v1Match[2], subIndex: "" }
  }

  return null
}

function mapIfIndexToOnuId(rows: SnmpRow[], onus: Onu[]): Map<string, string> {
  const result = new Map<string, string>()

  const onuByPon = new Map<string, string>()
  for (const onu of onus) {
    onuByPon.set(`${onu.ponPort}:${onu.onuIndex}`, onu.id)
  }

  for (const row of rows) {
    const ifIndex = vsolInterfaceIndexFromOid(row.oid, ifMibOids.ifDescr)
    if (!ifIndex) continue

    const parsed = parseGponOnuIfDescr(row.value)
    if (!parsed) continue

    const onuId = onuByPon.get(`${parsed.ponPort}:${parsed.onuIndex}`)
    if (onuId) {
      result.set(ifIndex, onuId)
    }
  }

  return result
}

function buildCounterMap(
  inOctetsRows: SnmpRow[],
  outOctetsRows: SnmpRow[],
  inPktsRows: SnmpRow[],
  outPktsRows: SnmpRow[],
  speedRows: SnmpRow[],
): IfCounterMap {
  const map = new Map<string, { inOctets: bigint; outOctets: bigint; inPkts: bigint; outPkts: bigint; ifSpeed: number }>()

  function ensure(index: string) {
    if (!map.has(index)) {
      map.set(index, { inOctets: 0n, outOctets: 0n, inPkts: 0n, outPkts: 0n, ifSpeed: 0 })
    }
    return map.get(index)!
  }

  for (const row of inOctetsRows) {
    const idx = vsolInterfaceIndexFromOid(row.oid, ifMibOids.ifHCInOctets)
    if (idx) ensure(idx).inOctets = BigInt(row.value || "0")
  }

  for (const row of outOctetsRows) {
    const idx = vsolInterfaceIndexFromOid(row.oid, ifMibOids.ifHCOutOctets)
    if (idx) ensure(idx).outOctets = BigInt(row.value || "0")
  }

  for (const row of inPktsRows) {
    const idx = vsolInterfaceIndexFromOid(row.oid, ifMibOids.ifHCInUcastPkts)
    if (idx) ensure(idx).inPkts = BigInt(row.value || "0")
  }

  for (const row of outPktsRows) {
    const idx = vsolInterfaceIndexFromOid(row.oid, ifMibOids.ifHCOutUcastPkts)
    if (idx) ensure(idx).outPkts = BigInt(row.value || "0")
  }

  for (const row of speedRows) {
    const idx = vsolInterfaceIndexFromOid(row.oid, ifMibOids.ifHighSpeed)
    if (idx) {
      const speed = Number(row.value || "0")
      const entry = map.get(idx)
      if (entry && speed > 0) entry.ifSpeed = speed * 1_000_000
    }
  }

  return map
}

export type IfTrafficCounters = {
  inOctets: bigint
  outOctets: bigint
  inPkts: bigint
  outPkts: bigint
  ifSpeed: number
}

const zteTrafficOids = {
  base1015: "1.3.6.1.4.1.3902.1015.1010.5.56.1.1",
  inOctets1015: "1.3.6.1.4.1.3902.1015.1010.5.56.1.1.2",
  outOctets1015: "1.3.6.1.4.1.3902.1015.1010.5.56.1.1.3",
  inPkts1015: "1.3.6.1.4.1.3902.1015.1010.5.56.1.1.4",
  outPkts1015: "1.3.6.1.4.1.3902.1015.1010.5.56.1.1.5",
  base1082: "1.3.6.1.4.1.3902.1082.500.10.2.5.1",
  inOctets1082: "1.3.6.1.4.1.3902.1082.500.10.2.5.1.1.2",
  outOctets1082: "1.3.6.1.4.1.3902.1082.500.10.2.5.1.1.3",
  inPkts1082: "1.3.6.1.4.1.3902.1082.500.10.2.5.1.1.4",
  outPkts1082: "1.3.6.1.4.1.3902.1082.500.10.2.5.1.1.5",
}

function extractOidSuffix(oid: string, baseOid: string): string | null {
  if (!oid.startsWith(`${baseOid}.`)) return null
  return oid.slice(baseOid.length + 1)
}

async function pollTrafficCountersZte(
  snmp: typeof import("net-snmp"),
  session: SnmpSession,
  olt: Olt,
  onus: Onu[],
): Promise<Map<string, IfTrafficCounters>> {
  const onuByEncoded = new Map<string, string>()
  for (const onu of onus) {
    const prefix = `${olt.id}-`
    if (onu.id.startsWith(prefix)) {
      const encoded = onu.id.slice(prefix.length)
      onuByEncoded.set(encoded, onu.id)
    }
  }

  if (onuByEncoded.size === 0) return new Map()

  const rows = await walk(snmp, session, zteTrafficOids.inOctets1015, 2000)
  if (rows.length > 0) {
    console.log(`[snmp] Traffic ZTE ${olt.name}: tree 1015 → ${rows.length} rows`)
    return await buildZteTrafficMap(snmp, session, olt, onus, onuByEncoded, "1015")
  }

  const fallbackRows = await walk(snmp, session, zteTrafficOids.inOctets1082, 2000)
  if (fallbackRows.length > 0) {
    console.log(`[snmp] Traffic ZTE ${olt.name}: tree 1082 → ${fallbackRows.length} rows`)
    return await buildZteTrafficMap(snmp, session, olt, onus, onuByEncoded, "1082")
  }

  console.log(`[snmp] Traffic ZTE ${olt.name}: vendor traffic MIB tidak ditemukan`)
  return new Map()
}

function counterToBigInt(value: string): bigint {
  const v = String(value || "").trim()
  if (/^[0-9]+$/.test(v)) return BigInt(v)
  if (/^[0-9A-Fa-f]+$/.test(v)) return BigInt(`0x${v}`)
  return 0n
}

function ensureCounter(counterByIndex: Map<string, { inOctets: bigint; outOctets: bigint; inPkts: bigint; outPkts: bigint; ifSpeed: number }>, idx: string) {
  if (!counterByIndex.has(idx)) {
    counterByIndex.set(idx, { inOctets: 0n, outOctets: 0n, inPkts: 0n, outPkts: 0n, ifSpeed: 0 })
  }
  return counterByIndex.get(idx)!
}

function decodeZteTrafficIndex(trafficIdx: string): { board: number; pon: number; onu: number } | null {
  const n = Number(trafficIdx)
  if (!Number.isFinite(n) || n <= 0) return null
  const type = (n >> 28) & 0xF
  if (type !== 9) return null
  const shelf = ((n >> 24) & 0xF) + 1
  const pon = ((n >> 16) & 0xF) + 1
  const onu = ((n >> 8) & 0xFF) + 1
  if (shelf <= 0 || pon <= 0 || onu <= 0) return null
  return { board: shelf, pon, onu }
}

function buildZteEncodedKey(board: number, pon: number, onu: number): string {
  const board1Base = 285278464
  const board2Base = 285278720
  const encodedPon = board >= 2 ? board2Base + pon : board1Base + pon
  return `${encodedPon}.${onu}`
}

async function buildZteTrafficMap(
  snmp: typeof import("net-snmp"),
  session: SnmpSession,
  olt: Olt,
  onus: Onu[],
  onuByEncoded: Map<string, string>,
  tree: "1015" | "1082",
): Promise<Map<string, IfTrafficCounters>> {
  const [inOctRows, outOctRows, inPktRows, outPktRows] = await Promise.all([
    walk(snmp, session, tree === "1015" ? zteTrafficOids.inOctets1015 : zteTrafficOids.inOctets1082, 2000),
    walk(snmp, session, tree === "1015" ? zteTrafficOids.outOctets1015 : zteTrafficOids.outOctets1082, 2000),
    walk(snmp, session, tree === "1015" ? zteTrafficOids.inPkts1015 : zteTrafficOids.inPkts1082, 2000),
    walk(snmp, session, tree === "1015" ? zteTrafficOids.outPkts1015 : zteTrafficOids.outPkts1082, 2000),
  ])

  console.log(`[snmp] Traffic ${olt.name}: inOct=${inOctRows.length} outOct=${outOctRows.length} inPkt=${inPktRows.length} outPkt=${outPktRows.length}`)

  const counterByIndex = new Map<string, { inOctets: bigint; outOctets: bigint; inPkts: bigint; outPkts: bigint; ifSpeed: number }>()

  for (const row of inOctRows) {
    const idx = extractOidSuffix(row.oid, tree === "1015" ? zteTrafficOids.inOctets1015 : zteTrafficOids.inOctets1082)
    if (idx) ensureCounter(counterByIndex, idx).inOctets = counterToBigInt(row.value)
  }
  for (const row of outOctRows) {
    const idx = extractOidSuffix(row.oid, tree === "1015" ? zteTrafficOids.outOctets1015 : zteTrafficOids.outOctets1082)
    if (idx) ensureCounter(counterByIndex, idx).outOctets = counterToBigInt(row.value)
  }
  for (const row of inPktRows) {
    const idx = extractOidSuffix(row.oid, tree === "1015" ? zteTrafficOids.inPkts1015 : zteTrafficOids.inPkts1082)
    if (idx) ensureCounter(counterByIndex, idx).inPkts = counterToBigInt(row.value)
  }
  for (const row of outPktRows) {
    const idx = extractOidSuffix(row.oid, tree === "1015" ? zteTrafficOids.outPkts1015 : zteTrafficOids.outPkts1082)
    if (idx) ensureCounter(counterByIndex, idx).outPkts = counterToBigInt(row.value)
  }

  const result = new Map<string, IfTrafficCounters>()
  let matched = 0
  let unmatched = 0

  for (const [idx, counters] of counterByIndex) {
    let onuId = onuByEncoded.get(idx)

    if (!onuId) {
      const parts = idx.split(".")
      if (parts.length >= 2) {
        const key = `${parts[0]}.${parts[1]}`
        onuId = onuByEncoded.get(key)
      }
    }

    if (!onuId && tree === "1015") {
      const decoded = decodeZteTrafficIndex(idx)
      if (decoded) {
        const key = buildZteEncodedKey(decoded.board, decoded.pon, decoded.onu)
        onuId = onuByEncoded.get(key)
        if (!onuId) {
          const keyNoOffset = buildZteEncodedKey(decoded.board, decoded.pon, decoded.onu - 1)
          onuId = onuByEncoded.get(keyNoOffset)
        }
      }
    }

    if (onuId) {
      result.set(onuId, counters)
      matched++
    } else {
      unmatched++
    }
  }

  if (unmatched > 0) {
    const sampleIdx = [...counterByIndex.keys()].slice(0, 3)
    console.warn(`[snmp] Traffic ${olt.name}: ${unmatched} index tidak ter-map, contoh: ${sampleIdx.join(", ")}`)
  }

  console.log(`[snmp] Traffic ${olt.name}: ${matched} ONU terkumpul`)
  return result
}

async function pollTrafficCountersIfMib(
  snmp: typeof import("net-snmp"),
  session: SnmpSession,
  olt: Olt,
  onus: Onu[],
): Promise<Map<string, IfTrafficCounters>> {
  const ifDescrRows = await walk(snmp, session, ifMibOids.ifDescr, 2000)
  const ifIndexByOnuId = mapIfIndexToOnuId(ifDescrRows, onus)

  if (ifIndexByOnuId.size === 0) {
    return new Map()
  }

  const ifIndexes = [...ifIndexByOnuId.keys()]

  const [inOctetsRows, outOctetsRows, inPktsRows, outPktsRows, speedRows] = await Promise.all([
    getColumnForIndexes(snmp, session, ifMibOids.ifHCInOctets, ifIndexes, 50),
    getColumnForIndexes(snmp, session, ifMibOids.ifHCOutOctets, ifIndexes, 50),
    getColumnForIndexes(snmp, session, ifMibOids.ifHCInUcastPkts, ifIndexes, 50),
    getColumnForIndexes(snmp, session, ifMibOids.ifHCOutUcastPkts, ifIndexes, 50),
    getColumnForIndexes(snmp, session, ifMibOids.ifHighSpeed, ifIndexes, 50),
  ])

  const ifCounters = buildCounterMap(inOctetsRows, outOctetsRows, inPktsRows, outPktsRows, speedRows)

  const result = new Map<string, IfTrafficCounters>()
  for (const [ifIndex, onuId] of ifIndexByOnuId.entries()) {
    const counters = ifCounters.get(ifIndex)
    if (counters) {
      result.set(onuId, counters)
    }
  }

  console.log(`[snmp] Traffic ${olt.name}: ${result.size} ONU counters terkumpul`)

  return result
}

export async function pollTrafficCounters(olt: Olt, onus: Onu[]): Promise<Map<string, IfTrafficCounters>> {
  if (!olt.ipAddress || !olt.readCommunity) return new Map()

  const snmp = await import("net-snmp")
  const session = createSnmpSession(snmp, olt)

  try {
    if (olt.oidProfile === "zte-c320") {
      return await pollTrafficCountersZte(snmp, session, olt, onus)
    }

    return await pollTrafficCountersIfMib(snmp, session, olt, onus)
  } catch (error) {
    console.warn(`[snmp] Gagal membaca traffic counters ${olt.name}: ${error instanceof Error ? error.message : error}`)
    return new Map()
  } finally {
    session.close()
  }
}
