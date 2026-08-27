import net from "node:net"

import type { Olt, Onu, OnuConfigItemKind, OnuConfigUpdateItem, OnuConfigUpdateResult, OnuHistoryEntry, OnuHistoryResult, OnuOmciConfigResult, RenameOnuResult, UncfgOnuResult } from "@/lib/types"
import { zteInterfaceName } from "@/lib/onu-utils"
import { diffInterfaceConfig, diffOnuMngConfig, parseInterfaceConfig, parseOnuMngConfig, type ParsedInterfaceConfig, type ParsedOnuMngConfig } from "@/lib/onu-config"

export type CliResult = {
  ok: boolean
  message: string
}

function sanitizeCliInput(input: string): string {
  return input
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[|;`$<>]/g, "")
    .trim()
}

type Waiter = {
  regex: RegExp
  resolve: (text: string) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

function stripTelnet(buffer: Buffer) {
  const output: number[] = []
  let index = 0

  while (index < buffer.length) {
    const byte = buffer[index]

    if (byte !== 0xff) {
      output.push(byte)
      index += 1
      continue
    }

    index += 1
    if (index >= buffer.length) break

    const command = buffer[index]
    index += 1

    if (command === 0xff) {
      output.push(0xff)
      continue
    }

    if (command === 0xfa) {
      while (index < buffer.length) {
        if (buffer[index] === 0xff && buffer[index + 1] === 0xf0) {
          index += 2
          break
        }
        index += 1
      }
      continue
    }

    // IAC WILL/WONT/DO/DONT diikuti 1 byte opsi (mis. NAWS). Lewati opsi.
    if (index < buffer.length) {
      index += 1
    }
  }

  return Buffer.from(output)
}

const promptPattern = /(?:^|\n)[\w./-]+(?:\([^)]*\))*[>#$]?\s*$/

class TelnetSession {
  private socket: net.Socket
  private buffer = ""
  private raw = ""
  private waiter: Waiter | null = null

  constructor(host: string, port: number) {
    this.socket = net.createConnection({ host, port })
    this.socket.setNoDelay(true)
    this.socket.on("data", (chunk) => {
      const text = stripTelnet(chunk).toString("utf8")
      if (!text) return
      this.raw = (this.raw + text).slice(-800)
      this.buffer += text
      this.flush()
    })
    this.socket.on("error", (error) => this.fail(error))
    this.socket.on("close", () => this.fail(new Error("Koneksi Telnet ditutup oleh OLT.")))
  }

  connect(timeoutMs = 10000) {
    if (this.socket.connecting) {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.socket.destroy()
          reject(new Error(`Tidak bisa terhubung ke Telnet ${this.socket.remoteAddress ?? ""} (timeout ${timeoutMs} ms).`))
        }, timeoutMs)
        this.socket.once("connect", () => {
          clearTimeout(timer)
          this.sendNaws(512, 100)
          resolve()
        })
        this.socket.once("error", (error) => {
          clearTimeout(timer)
          reject(error)
        })
      })
    }
    return Promise.resolve()
  }

  private sendNaws(width: number, height: number) {
    const b = Buffer.from([
      0xff, 0xfb, 0x1f, // IAC WILL NAWS
      0xff, 0xfa, 0x1f, // IAC SB NAWS
      0x00, width >> 8,
      0x00, width & 0xff,
      0x00, height >> 8,
      0x00, height & 0xff,
      0xff, 0xf0, // IAC SE
    ])
    this.socket.write(b)
  }

  private fail(error: Error) {
    if (this.waiter) {
      clearTimeout(this.waiter.timer)
      const reject = this.waiter.reject
      this.waiter = null
      reject(error)
    }
  }

  private flush() {
    const waiter = this.waiter
    if (!waiter) return

    const match = this.buffer.match(waiter.regex)
    if (!match) return

    this.waiter = null
    clearTimeout(waiter.timer)
    waiter.resolve(this.buffer)
  }

  waitFor(regex: RegExp, timeoutMs = 10000) {
    return new Promise<string>((resolve, reject) => {
      if (this.waiter) {
        reject(new Error("Operasi baca Telnet sebelumnya belum selesai."))
        return
      }

      if (this.buffer.match(regex)) {
        const text = this.buffer
        this.buffer = ""
        resolve(text)
        return
      }

      const timer = setTimeout(() => {
        if (this.waiter) {
          this.waiter = null
          reject(new Error(`Timeout menunggu respons CLI (${timeoutMs} ms).`))
        }
      }, timeoutMs)

      this.waiter = {
        regex,
        resolve: (text) => {
          clearTimeout(timer)
          this.buffer = ""
          resolve(text)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
        timer,
      }
    })
  }

  async send(line: string) {
    this.buffer = ""
    this.socket.write(`${line}\r\n`)
  }

  async sendTyped(line: string, delayMs = 20) {
    this.buffer = ""
    for (const char of line) {
      this.socket.write(char)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
    this.socket.write("\r\n")
  }

  async sendRaw(data: string) {
    this.socket.write(data)
  }

  async close() {
    try {
      this.socket.end()
    } catch {
      // abaikan saat socket sudah tertutup
    }
  }

  tail(limit = 300) {
    const clean = this.raw.replace(/\r\n/g, "\n").trim()
    return clean.length > limit ? `...${clean.slice(-limit)}` : clean
  }

  async destroy() {
    this.socket.destroy()
  }
}

async function waitForCliPrompt(telnet: TelnetSession, timeoutMs = 8000) {
  return telnet.waitFor(promptPattern, timeoutMs)
}

async function loginTelnet(olt: Olt, telnet: TelnetSession) {
  const username = olt.cliUsername?.trim()
  const password = olt.cliPassword?.trim()
  if (!username || !password) {
    throw new Error("Username/Password CLI belum diisi di pengaturan OLT.")
  }

  await telnet.connect()
  await telnet.waitFor(/(?:login|username|name)\s*[:>]\s*$/i, 8000)
  await telnet.send(username)
  await telnet.waitFor(/password\s*[:>]\s*$/i, 8000)
  await telnet.send(password)

  const loginPrompt = await waitForCliPrompt(telnet)
  if (/>\s*$/.test(loginPrompt)) {
    await telnet.send("enable")
    try {
      await telnet.waitFor(/password\s*[:>]\s*$/i, 3000)
      await telnet.send(password)
    } catch {
      // sudah di mode privileged tanpa password enable
    }
    await waitForCliPrompt(telnet)
  }
}

export async function testCliConnection(olt: Olt): Promise<CliResult> {
  const username = olt.cliUsername?.trim()
  const password = olt.cliPassword?.trim()
  if (!username || !password) {
    return { ok: false, message: "Username/Password CLI belum diisi di pengaturan OLT." }
  }

  const telnet = new TelnetSession(olt.ipAddress, olt.cliPort || 23)

  try {
    await loginTelnet(olt, telnet)
    await telnet.close()

    return { ok: true, message: `Koneksi CLI ke ${olt.ipAddress}:${olt.cliPort || 23} berhasil (Telnet).` }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? `Test CLI gagal: ${error.message} — respons CLI: ${telnet.tail()}` : "Test CLI gagal." }
  } finally {
    try {
      await telnet.destroy()
    } catch {
      // abaikan
    }
  }
}

export async function getUncfgOnuViaTelnet(olt: Olt): Promise<UncfgOnuResult> {
  const telnet = new TelnetSession(olt.ipAddress, olt.cliPort || 23)

  try {
    await loginTelnet(olt, telnet)

    await telnet.send("show gpon onu uncfg")
    const output = await readCommandOutput(telnet)

    await telnet.close()

    const lines = output.split("\n").map((l) => l.trim()).filter(Boolean)
    const entries: { interfaceId: string; serialNumber: string; state: string }[] = []

    for (const line of lines) {
      if (/^onu\s*index|^---|^\s*$/i.test(line)) continue
      if (/^(show\s|ZTE|ZXA)/i.test(line)) continue

      const parts = line.split(/\s{2,}/)
      if (parts.length >= 3) {
        entries.push({
          interfaceId: parts[0].trim(),
          serialNumber: parts[1].trim(),
          state: parts[2].trim(),
        })
      }
    }

    return {
      ok: true,
      message: entries.length > 0
        ? `Ditemukan ${entries.length} ONU yang belum dikonfigurasi.`
        : `Tidak ada ONU unconfigured yang ditemukan.`,
      entries,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? `Gagal membaca ONU unconfigured: ${error.message} — respons CLI: ${telnet.tail()}` : "Gagal membaca ONU unconfigured.",
      entries: [],
    }
  } finally {
    try {
      await telnet.destroy()
    } catch {
      // abaikan
    }
  }
}

export async function rebootOnuViaTelnet(olt: Olt, onu: Onu): Promise<CliResult> {
  const interfaceId = zteInterfaceName(onu.ponPort, onu.onuIndex)
  const telnet = new TelnetSession(olt.ipAddress, olt.cliPort || 23)

  try {
    await loginTelnet(olt, telnet)

    await telnet.send("config t")
    await telnet.waitFor(/\(config\)[>#]?\s*$/i, 8000)

    await telnet.send(`pon-onu-mng ${interfaceId}`)
    await telnet.waitFor(/\(gpon-onu-mng[^)]*\)[>#]?\s*$/i, 8000)

    await telnet.send("reboot")
    const afterReboot = await telnet.waitFor(
      /(?:\(gpon-onu-mng[^)]*\)[>#]?\s*$|(?:y\/n|sure|confirm|\([yYnN]\))[^\n]*[:?>]\s*$)/i,
      12000,
    )

    if (/(?:y\/n|sure|confirm|\([yYnN]\))[^\n]*[:?>]\s*$/i.test(afterReboot)) {
      if (/unavailable|not\s*found|does\s*not\s*exist|%Code/i.test(afterReboot)) {
        await telnet.send("n")
        await telnet.send("exit")
        await telnet.close()
        return {
          ok: false,
          message: `OLT menolak reboot: ONU ${onu.serialNumber} tidak tersedia atau sudah offline.`,
        }
      }
      await telnet.send("y")
      const afterConfirm = await telnet.waitFor(/\(gpon-onu-mng[^)]*\)[>#]?\s*$/i, 10000)

      if (/unavailable|not\s*found|does\s*not\s*exist|error|fail|%Code/i.test(afterConfirm)) {
        await telnet.send("exit")
        await telnet.close()
        return {
          ok: false,
          message: `Reboot ditolak oleh OLT: ${afterConfirm.trim()}. ONU ${onu.serialNumber} mungkin sudah offline atau tidak terdaftar.`,
        }
      }
    }

    await telnet.send("exit")
    await telnet.close()

    return {
      ok: true,
      message: `Perintah reboot CLI terkirim ke OLT untuk ${interfaceId} (${onu.name || onu.serialNumber}).`,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? `Reboot ONU gagal: ${error.message} — respons CLI: ${telnet.tail()}` : "Reboot ONU gagal.",
    }
  } finally {
    try {
      await telnet.destroy()
    } catch {
      // abaikan
    }
  }
}

export async function deleteOnuViaTelnet(olt: Olt, onu: Onu): Promise<CliResult> {
  const interfaceId = zteInterfaceName(onu.ponPort, onu.onuIndex)
  const telnet = new TelnetSession(olt.ipAddress, olt.cliPort || 23)

  try {
    await loginTelnet(olt, telnet)

    await telnet.send("config t")
    await telnet.waitFor(/\(config\)[>#]?\s*$/i, 8000)

    await telnet.send(`interface ${interfaceId}`)
    await telnet.waitFor(/\(config-if[^)]*\)[>#]?\s*$/i, 8000)

    await telnet.send(`no onu ${onu.onuIndex}`)
    const afterNoOnu = await telnet.waitFor(
      /(?:\(config-if[^)]*\)[>#]?\s*$|(?:y\/n|sure|confirm|\([yYnN]\))[^\n]*[:?>]\s*$)/i,
      12000,
    )

    if (/(?:y\/n|sure|confirm|\([yYnN]\))[^\n]*[:?>]\s*$/i.test(afterNoOnu)) {
      if (/unavailable|not\s*found|does\s*not\s*exist|%Code/i.test(afterNoOnu)) {
        await telnet.send("n")
        await telnet.send("exit")
        await telnet.close()
        return {
          ok: false,
          message: `OLT menolak hapus: ONU ${onu.serialNumber} tidak tersedia atau sudah dihapus.`,
        }
      }
      await telnet.send("y")
      const afterConfirm = await telnet.waitFor(
        /(?:\(config-if[^)]*\)[>#]?\s*$|(?:config[^)]*\)[>#]?\s*$))/i,
        10000,
      )

      if (/unavailable|not\s*found|does\s*not\s*exist|error|fail|%Code/i.test(afterConfirm)) {
        await telnet.send("exit")
        await telnet.close()
        return {
          ok: false,
          message: `Hapus ONU ditolak oleh OLT: ${afterConfirm.trim()}. ONU ${onu.serialNumber} mungkin sudah tidak ada.`,
        }
      }
    }

    await telnet.send("exit")
    await telnet.close()

    return {
      ok: true,
      message: `ONU ${onu.serialNumber} (${interfaceId}) berhasil dihapus dari OLT ${olt.name}.`,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? `Hapus ONU gagal: ${error.message} — respons CLI: ${telnet.tail()}` : "Hapus ONU gagal.",
    }
  } finally {
    try {
      await telnet.destroy()
    } catch {
      // abaikan
    }
  }
}

export async function renameOnuViaTelnet(olt: Olt, onu: Onu, nextName: string): Promise<RenameOnuResult> {
  const cleanName = sanitizeCliInput(nextName)
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

  const interfaceId = zteInterfaceName(onu.ponPort, onu.onuIndex)
  const telnet = new TelnetSession(olt.ipAddress, olt.cliPort || 23)

  try {
    await loginTelnet(olt, telnet)

    await telnet.send("config t")
    await telnet.waitFor(/\(config\)[>#]?\s*$/i, 8000)

    await telnet.send(`interface ${interfaceId}`)
    await telnet.waitFor(/\(config-if[^)]*\)[>#]?\s*$/i, 8000)

    await telnet.send(`name ${cleanName}`)
    await telnet.waitFor(/\(config-if[^)]*\)[>#]?\s*$/i, 8000)

    await telnet.send("exit")
    await telnet.close()

    return {
      ok: true,
      syncedToDevice: true,
      message: `Nama ${onu.serialNumber} berhasil diubah di aplikasi dan OLT ZTE C320.`,
    }
  } catch (error) {
    return {
      ok: false,
      syncedToDevice: false,
      message: error instanceof Error ? `Rename via CLI gagal: ${error.message} — respons CLI: ${telnet.tail()}` : "Rename via CLI gagal.",
    }
  } finally {
    try {
      await telnet.destroy()
    } catch {
      // abaikan
    }
  }
}

function parseOnuDetailInfo(raw: string): OnuHistoryResult {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())

  function readField(key: string) {
    const line = lines.find((item) => item.trim().startsWith(`${key}:`))
    if (!line) return ""
    const index = line.indexOf(":")
    return line.slice(index + 1).trim()
  }

  const summary: OnuHistoryResult["summary"] = {
    interfaceId: readField("ONU interface"),
    name: readField("Name"),
    type: readField("Type"),
    state: readField("State"),
    serialNumber: readField("Serial number"),
    onlineDuration: readField("Online Duration"),
  }

  const history: OnuHistoryEntry[] = []
  const tableStart = lines.findIndex((line) => /Authpass\s+Time/i.test(line))
  const dateTimePattern = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/
  const zeroTimePattern = /^0000-00-00\s+00:00:00$/
  if (tableStart !== -1) {
    for (const line of lines.slice(tableStart + 1)) {
      const trimmed = line.trim()
      const match = trimmed.match(/^(\d+)\s+(.*)$/)
      if (!match) continue
      const index = match[1]
      const rest = match[2]
      const times: string[] = rest.match(new RegExp(dateTimePattern.source, "g")) ?? []
      if (times.length < 2 && !/^\d+\s*$/.test(trimmed)) {
        // fallback pemisahan kolom lama bila format tanggal tidak terbaca
        const parts = trimmed.split(/\s{2,}/)
        if (parts.length < 3 || !/^\d+$/.test(parts[0])) continue
        times.push(...[parts[1], parts[2]])
      }
      const authpassTime = times[0] ?? ""
      const offlineTime = times[1] ?? ""
      // Lewati slot buffer kosong (belum ada riwayat tercatat)
      if ((!authpassTime || zeroTimePattern.test(authpassTime)) && (!offlineTime || zeroTimePattern.test(offlineTime))) continue
      const cause = rest.replace(authpassTime, "").replace(offlineTime, "").trim() || ""
      history.push({
        index,
        authpassTime,
        offlineTime,
        cause,
      })
    }
  }

  if (history.length === 0) {
    return {
      ok: false,
      message: "Riwayat up/down tidak ditemukan di respons OLT. Pastikan ONU/ONT sudah pernah tercatat.",
      summary,
      history,
    }
  }

  return {
    ok: true,
    message: `Riwayat up/down ${summary.name || summary.interfaceId || "ONU/ONT"} berhasil dibaca dari OLT.`,
    summary,
    history,
  }
}

const moreOrPromptPattern = /(--More[^\n]*|(?:^|\n)[\w./-]+(?:\([^)]*\))*[>#$]\s*$)/i

async function readCommandOutput(telnet: TelnetSession, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  let output = ""

  while (Date.now() < deadline) {
    const remaining = Math.max(1500, deadline - Date.now())
    const chunk = await telnet.waitFor(moreOrPromptPattern, remaining)

    if (/--More/i.test(chunk)) {
      output += chunk.replace(/--More[^\n]*/i, "")
      await telnet.sendRaw(" ")
      continue
    }

    output += chunk
    break
  }

  return output
}

export async function getOnuHistoryViaTelnet(olt: Olt, onu: Onu): Promise<OnuHistoryResult> {
  const interfaceId = zteInterfaceName(onu.ponPort, onu.onuIndex)
  const telnet = new TelnetSession(olt.ipAddress, olt.cliPort || 23)

  try {
    await loginTelnet(olt, telnet)

    await telnet.send(`show gpon onu detail-info ${interfaceId}`)
    const output = await readCommandOutput(telnet)

    return parseOnuDetailInfo(output)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? `Gagal membaca riwayat up/down: ${error.message} — respons CLI: ${telnet.tail()}` : "Gagal membaca riwayat up/down.",
      history: [],
    }
  } finally {
    try {
      await telnet.destroy()
    } catch {
      // abaikan
    }
  }
}

function cleanShowOutput(raw: string): string {
  let lines = raw.replace(/\r\n/g, "\n").split("\n")

  while (lines.length > 0 && lines[0].trim() === "") lines.shift()
  if (lines.length > 0 && /^show\s+/i.test(lines[0].trim())) lines.shift()

  while (lines.length > 0) {
    const last = lines[lines.length - 1].trim()
    if (last === "" || promptPattern.test(last)) {
      lines.pop()
      continue
    }
    break
  }

  return unwrapContinuationLines(lines).join("\n").trim()
}

const statementStart = /^(?:wan-ip|service|security-mgmt|tcont|gemport|service-port|name|description)\s/

function unwrapContinuationLines(lines: string[]): string[] {
  const result: string[] = []
  let lastRaw: string | null = null
  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    // Baris "!" adalah penutup blok konfigurasi ZTE, bukan kelanjutan perintah.
    if (!trimmed || trimmed === "!") continue
    if (result.length > 0 && !statementStart.test(trimmed)) {
      const prevHadSpace = lastRaw !== null && /\s$/.test(lastRaw)
      result[result.length - 1] = result[result.length - 1].trimEnd() + (prevHadSpace ? " " : "") + trimmed
      lastRaw = rawLine
      continue
    }
    result.push(trimmed)
    lastRaw = rawLine
  }
  return result
}

export async function getOnuOmciConfigViaTelnet(olt: Olt, onu: Onu): Promise<OnuOmciConfigResult> {
  const interfaceId = zteInterfaceName(onu.ponPort, onu.onuIndex)
  const telnet = new TelnetSession(olt.ipAddress, olt.cliPort || 23)

  try {
    await loginTelnet(olt, telnet)

    await telnet.send(`show run int ${interfaceId}`)
    const interfaceRaw = await readCommandOutput(telnet)

    await telnet.send(`show onu run con ${interfaceId}`)
    const onuMngRaw = await readCommandOutput(telnet)

    const interfaceConfig = cleanShowOutput(interfaceRaw)
    const onuMngConfig = cleanShowOutput(onuMngRaw)

    return {
      ok: true,
      message: `Konfigurasi OMCI ${interfaceId} berhasil dibaca dari OLT.`,
      interfaceConfig,
      onuMngConfig,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? `Gagal membaca konfigurasi OMCI: ${error.message} — respons CLI: ${telnet.tail()}` : "Gagal membaca konfigurasi OMCI.",
      interfaceConfig: "",
      onuMngConfig: "",
    }
  } finally {
    try {
      await telnet.destroy()
    } catch {
      // abaikan
    }
  }
}

const configPrompt = /\(config\)[>#]?\s*$/i
const configIfPrompt = /\(config-if[^)]*\)[>#]?\s*$/i
const gponOnuMngPrompt = /\(gpon-onu-mng[^)]*\)[>#]?\s*$/i

type ConfigCommand = {
  text: string
  rank: number
  fallbackDelete?: string
  kind?: OnuConfigItemKind
  id?: number
}

type SkippedConfigItem = {
  kind: OnuConfigItemKind
  id?: number
  reason: string
}

function buildWanIpCommand(item: OnuConfigUpdateItem): string {
  const mode = item.mode || "pppoe"
  let command = `wan-ip ${item.id} mode ${mode}`
  if (mode === "pppoe") {
    const safeUsername = sanitizeCliInput(item.username ?? "")
    const safePassword = sanitizeCliInput(item.password ?? "")
    command += ` username ${safeUsername} password ${safePassword}`
  }
  if (item.vlanProfile) {
    command += ` vlan-profile ${sanitizeCliInput(item.vlanProfile)}`
  }
  if (item.host && item.host !== 0) {
    command += ` host ${item.host}`
  }
  return command.trim()
}

function buildInterfaceCommands(item: OnuConfigUpdateItem, forceDelete = false): ConfigCommand[] {
  switch (item.kind) {
    case "name":
      return [{ text: `name ${sanitizeCliInput(item.value ?? "")}`.trim(), rank: 6, kind: item.kind }]
    case "description":
      return [{ text: `description ${sanitizeCliInput(item.value ?? "")}`.trim(), rank: 6, kind: item.kind }]
    case "tcont": {
      const create = `tcont ${item.id} name ${sanitizeCliInput(item.name ?? "")} profile ${sanitizeCliInput(item.profile ?? "")}`.trim()
      if (item.action === "delete") return [{ text: `no tcont ${item.id}`, rank: 2, kind: item.kind, id: item.id }]
      if (forceDelete) return [{ text: `no tcont ${item.id}`, rank: 2, kind: item.kind, id: item.id }, { text: create, rank: 3, kind: item.kind, id: item.id }]
      return [{ text: create, rank: 3, fallbackDelete: `no tcont ${item.id}`, kind: item.kind, id: item.id }]
    }
    case "gemport": {
      const create = `gemport ${item.id} tcont ${item.tcont ?? ""}`.trim()
      if (item.action === "delete") return [{ text: `no gemport ${item.id}`, rank: 1, kind: item.kind, id: item.id }]
      if (forceDelete) return [{ text: `no gemport ${item.id}`, rank: 1, kind: item.kind, id: item.id }, { text: create, rank: 4, kind: item.kind, id: item.id }]
      return [{ text: create, rank: 4, fallbackDelete: `no gemport ${item.id}`, kind: item.kind, id: item.id }]
    }
    case "service-port": {
      const create = `service-port ${item.id} vport ${item.vport ?? ""} user-vlan ${item.userVlan ?? ""} vlan ${item.vlan ?? ""}`.trim()
      if (item.action === "delete") return [{ text: `no service-port ${item.id}`, rank: 0, kind: item.kind, id: item.id }]
      if (forceDelete) return [{ text: `no service-port ${item.id}`, rank: 0, kind: item.kind, id: item.id }, { text: create, rank: 5, kind: item.kind, id: item.id }]
      return [{ text: create, rank: 5, fallbackDelete: `no service-port ${item.id}`, kind: item.kind, id: item.id }]
    }
    default:
      throw new Error(`Item "${item.kind}" bukan bagian konfigurasi interface.`)
  }
}

function buildOnuMngCommands(item: OnuConfigUpdateItem, forceDelete = false): ConfigCommand[] {
  switch (item.kind) {
    case "service": {
      const create = `service ${item.id} gemport ${item.gemport ?? ""} vlan ${item.vlan ?? ""}`.trim()
      if (item.action === "delete") return [{ text: `no service ${item.id}`, rank: 0, kind: item.kind, id: item.id }]
      if (forceDelete) return [{ text: `no service ${item.id}`, rank: 0, kind: item.kind, id: item.id }, { text: create, rank: 1, kind: item.kind, id: item.id }]
      return [{ text: create, rank: 1, fallbackDelete: `no service ${item.id}`, kind: item.kind, id: item.id }]
    }
    case "wan-ip": {
      const create = buildWanIpCommand(item)
      if (item.action === "delete") return [{ text: `no wan-ip ${item.id}`, rank: 2, kind: item.kind, id: item.id }]
      if (forceDelete) return [{ text: `no wan-ip ${item.id}`, rank: 2, kind: item.kind, id: item.id }, { text: create, rank: 3, kind: item.kind, id: item.id }]
      return [{ text: create, rank: 3, fallbackDelete: `no wan-ip ${item.id}`, kind: item.kind, id: item.id }]
    }
    case "security-mgmt": {
      const create = `security-mgmt ${item.id} state ${sanitizeCliInput(item.state ?? "enable")} mode ${sanitizeCliInput(item.mode ?? "forward")} protocol ${sanitizeCliInput(item.protocol ?? "web")}`.trim()
      if (item.action === "delete") return [{ text: `no security-mgmt ${item.id}`, rank: 2, kind: item.kind, id: item.id }]
      if (forceDelete) return [{ text: `no security-mgmt ${item.id}`, rank: 2, kind: item.kind, id: item.id }, { text: create, rank: 3, kind: item.kind, id: item.id }]
      return [{ text: create, rank: 3, fallbackDelete: `no security-mgmt ${item.id}`, kind: item.kind, id: item.id }]
    }
    default:
      throw new Error(`Item "${item.kind}" bukan bagian konfigurasi pon-onu-mng.`)
  }
}

function isOltError(text: string) {
  const errorLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^%\s/.test(line) || /^%Code\s/i.test(line) || /unknown\s+me/i.test(line) || /^(invalid|unknown command|command not found|too many|not allowed|failed|error|denied|rejected)/i.test(line) || /\bfailed to\b/i.test(line))
  return errorLines[0] ?? null
}

// ONT menolak fitur karena managed entity tidak dikenal, mis:
// "%Code 63993-GPONRM : ONT return error:unknown ME."
function isUnsupportedMeError(message: string) {
  return /unknown\s+me/i.test(message) || /%Code\s+\d+/i.test(message)
}

async function sendConfigCommand(telnet: TelnetSession, prompt: RegExp, command: string) {
  const useTyped = command.length > 60
  console.log(`[cli] sendConfigCommand: ${useTyped ? "sendTyped" : "send"} (${command.length} char)`)
  if (useTyped) {
    await telnet.sendTyped(command)
  } else {
    await telnet.send(command)
  }

  const response = await telnet.waitFor(
    /(?:\(config-if[^)]*\)|\(gpon-onu-mng[^)]*\))[>#]?\s*$|(?:y\/n|sure|confirm|\([yYnN]\))[^\n]*[:?>]\s*$/i,
    12000,
  )

  if (/(?:y\/n|sure|confirm|\([yYnN]\))/i.test(response)) {
    await telnet.send("y")
    await telnet.waitFor(/(?:\(config-if[^)]*\)|\(gpon-onu-mng[^)]*\))[>#]?\s*$/i, 10000)
  }

  const oltError = isOltError(response)
  if (oltError) {
    throw new Error(`OLT menolak perintah "${command}": ${oltError}`)
  }
}

async function runConfigCommands(
  telnet: TelnetSession,
  prompt: RegExp,
  commands: ConfigCommand[],
): Promise<{ applied: string[]; skipped: SkippedConfigItem[] }> {
  const applied: string[] = []
  const skipped: SkippedConfigItem[] = []

  for (const command of commands) {
    try {
      await sendConfigCommand(telnet, prompt, command.text)
      applied.push(command.text)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)

      // ONT tidak mendukung fitur ini (unknown ME) — jangan ulangi sia-sia.
      if (command.kind && isUnsupportedMeError(message)) {
        skipped.push({ kind: command.kind, id: command.id, reason: message })
        continue
      }

      if (!command.fallbackDelete) throw cause

      await sendConfigCommand(telnet, prompt, command.fallbackDelete)
      await sendConfigCommand(telnet, prompt, command.text)
      applied.push(command.fallbackDelete, command.text)
    }
  }

  return { applied, skipped }
}

async function sendBlocks(
  olt: Olt,
  interfaceId: string,
  interfaceCommands: ConfigCommand[],
  mngCommands: ConfigCommand[],
): Promise<{ applied: string[]; skipped: SkippedConfigItem[] }> {
  const telnet = new TelnetSession(olt.ipAddress, olt.cliPort || 23)
  const applied: string[] = []
  const skipped: SkippedConfigItem[] = []

  try {
    await loginTelnet(olt, telnet)

    await telnet.send("config t")
    await telnet.waitFor(configPrompt, 8000)

    if (interfaceCommands.length > 0) {
      await telnet.send(`interface ${interfaceId}`)
      await telnet.waitFor(configIfPrompt, 8000)
      const result = await runConfigCommands(telnet, configIfPrompt, interfaceCommands)
      applied.push(...result.applied)
      skipped.push(...result.skipped)
      await telnet.send("exit")
      await telnet.waitFor(configPrompt, 8000)
    }

    if (mngCommands.length > 0) {
      await telnet.send(`pon-onu-mng ${interfaceId}`)
      await telnet.waitFor(gponOnuMngPrompt, 8000)
      const result = await runConfigCommands(telnet, gponOnuMngPrompt, mngCommands)
      applied.push(...result.applied)
      skipped.push(...result.skipped)
      await telnet.send("exit")
      await telnet.waitFor(configPrompt, 8000)
    }

    await telnet.send("exit")
    await telnet.waitFor(/[>#]\s*$/, 8000)

    if (applied.length > 0) {
      await telnet.send("write")
      const writeResp = await telnet.waitFor(/(?:[>#]\s*$|(?:y\/n|sure|confirm|\([yYnN]\))[^\n]*[:?>]\s*$)/i, 15000)
      if (/(?:y\/n|sure|confirm|\([yYnN]\))/i.test(writeResp)) {
        await telnet.send("y")
        await telnet.waitFor(/[>#]\s*$/, 15000)
      }
    }

    await telnet.close()
    return { applied, skipped }
  } catch (error) {
    const tail = telnet.tail(400)
    try {
      await telnet.destroy()
    } catch {
      // abaikan
    }
    throw new Error(`${error instanceof Error ? error.message : String(error)} — respons CLI: ${tail}`)
  }
}

function wanIpPasswordOnlyMismatch(
  item: OnuConfigUpdateItem,
  currentMng: ParsedOnuMngConfig,
  targetMng: ParsedOnuMngConfig,
): boolean {
  if (item.kind !== "wan-ip") return false

  const currentWan = currentMng.wanIps.find((wan) => wan.id === item.id)
  const targetWan = targetMng.wanIps.find((wan) => wan.id === item.id)
  if (!currentWan || !targetWan) return false

  return (
    currentWan.mode === targetWan.mode &&
    currentWan.username === targetWan.username &&
    currentWan.vlanProfile === targetWan.vlanProfile &&
    currentWan.host === targetWan.host &&
    currentWan.password !== targetWan.password
  )
}

async function verifyWithRetry(
  olt: Olt,
  onu: Onu,
  targetInterface: ParsedInterfaceConfig,
  targetMng: ParsedOnuMngConfig,
): Promise<{
  ok: boolean
  residual: OnuConfigUpdateItem[]
  currentInterface?: ParsedInterfaceConfig
  currentMng?: ParsedOnuMngConfig
  rawMng?: string
  message?: string
}> {
  let residual: OnuConfigUpdateItem[] = []
  let currentInterface: ParsedInterfaceConfig = parseInterfaceConfig("")
  let currentMng: ParsedOnuMngConfig = parseOnuMngConfig("")
  let rawMng = ""

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2500))
    }

    const verify = await getOnuOmciConfigViaTelnet(olt, onu)
    if (!verify.ok) {
      return { ok: false, residual: [], message: verify.message }
    }

    currentInterface = parseInterfaceConfig(verify.interfaceConfig)
    currentMng = parseOnuMngConfig(verify.onuMngConfig)
    rawMng = verify.onuMngConfig

    residual = [
      ...diffInterfaceConfig(currentInterface, targetInterface),
      ...diffOnuMngConfig(currentMng, targetMng),
    ].filter((item) => !wanIpPasswordOnlyMismatch(item, currentMng, targetMng))

    if (residual.length === 0) {
      return { ok: true, residual: [] }
    }

    if (attempt === 0) {
      const wanLines = verify.onuMngConfig
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /^wan-ip\s/.test(line))
      console.log(`[verify] percobaan ${attempt + 1} residual ${residual.length}:`, JSON.stringify(wanLines))
    }
  }

  return { ok: true, residual, currentInterface, currentMng, rawMng }
}

const ZTE_CLI_MAX_LINE = 150

function matchesSkippedItem(item: OnuConfigUpdateItem, skipped: SkippedConfigItem[]): boolean {
  return skipped.some((entry) => entry.kind === item.kind && entry.id === item.id)
}

function formatSkippedItems(skipped: SkippedConfigItem[], serialNumber: string): string {
  return skipped
    .map((entry) => {
      const label = `${entry.kind}${entry.id !== undefined ? ` ${entry.id}` : ""}`
      return `${label} dilewati: ONT${serialNumber ? ` ${serialNumber}` : ""} tidak mendukung fitur ini (unknown ME).`
    })
    .join("\n")
}

export async function applyOnuConfigViaTelnet(
  olt: Olt,
  onu: Onu,
  items: OnuConfigUpdateItem[],
  targetInterface: ParsedInterfaceConfig,
  targetMng: ParsedOnuMngConfig,
): Promise<OnuConfigUpdateResult> {
  if (items.length === 0) {
    return { ok: true, message: "Tidak ada perubahan konfigurasi untuk dikirim ke OLT." }
  }

  const interfaceId = zteInterfaceName(onu.ponPort, onu.onuIndex)

  // ONT dengan serial YOTC tidak mendukung security-mgmt (unknown ME) —
  // jangan kirim perintahnya, cukup laporkan sebagai item yang dilewati.
  const isYotcOnu = /^yotc/i.test(onu.serialNumber ?? "")
  const preSkippedItems = items.filter(
    (item) => isYotcOnu && item.block === "pon-onu-mng" && item.kind === "security-mgmt",
  )
  const sendableItems = items.filter((item) => !preSkippedItems.includes(item))
  const skippedItems: SkippedConfigItem[] = preSkippedItems.map((item) => ({
    kind: item.kind,
    id: item.id,
    reason: "ONT YOTC tidak mendukung security-mgmt",
  }))

  if (sendableItems.length === 0 && skippedItems.length > 0) {
    return {
      ok: true,
      message: `Tidak ada perubahan yang dikirim ke OLT.\n\n${formatSkippedItems(skippedItems, onu.serialNumber)}\n\nKonfigurasi tersimpan di aplikasi saja dan tidak akan diterapkan ke ONU ini.`,
    }
  }

  const interfaceCommands = sendableItems
    .filter((item) => item.block === "interface")
    .flatMap((item) => buildInterfaceCommands(item))
    .sort((a, b) => a.rank - b.rank)

  const mngCommands = sendableItems
    .filter((item) => item.block === "pon-onu-mng")
    .flatMap((item) => buildOnuMngCommands(item))
    .sort((a, b) => a.rank - b.rank)

  const tooLong = [...interfaceCommands, ...mngCommands].find((cmd) => cmd.text.length > ZTE_CLI_MAX_LINE)
  if (tooLong) {
    return {
      ok: false,
      message: `Perintah terlalu panjang untuk CLI ZTE C320 (${tooLong.text.length} karakter > batas ${ZTE_CLI_MAX_LINE}).\n\n${tooLong.text}\n\nPerintah yang terlalu panjang berisiko dipotong oleh OLT sehingga konfigurasi menjadi tidak lengkap.\n\nSolusi: persingkat nama profil/username, atau buat wan-ip ini melalui GUI ZTE.`,
    }
  }

  try {
    const firstSend = await sendBlocks(olt, interfaceId, interfaceCommands, mngCommands)
    skippedItems.push(...firstSend.skipped)
    const applied = firstSend.applied

    const firstCheck = await verifyWithRetry(olt, onu, targetInterface, targetMng)
    if (!firstCheck.ok) {
      return { ok: false, message: `Perintah terkirim tapi verifikasi ulang gagal: ${firstCheck.message}. Periksa langsung di terminal OLT.` }
    }

    const firstResidual = firstCheck.residual.filter((item) => !matchesSkippedItem(item, skippedItems))

    if (firstResidual.length === 0) {
      if (skippedItems.length > 0) {
        return {
          ok: true,
          message: `${applied.length} perintah konfigurasi berhasil diterapkan dan terverifikasi di ${interfaceId}.\n\n${formatSkippedItems(skippedItems, onu.serialNumber)}\n\nCatatan: item yang dilewati tetap tersimpan di aplikasi namun tidak akan diterapkan ke ONU ini.`,
        }
      }
      return { ok: true, message: `${applied.length} perintah konfigurasi berhasil diterapkan dan terverifikasi di ${interfaceId}.` }
    }

    const retryInterfaceCommands = firstResidual
      .filter((item) => item.block === "interface")
      .flatMap((item) => buildInterfaceCommands(item, true))
      .sort((a, b) => a.rank - b.rank)

    const retryMngCommands = firstResidual
      .filter((item) => item.block === "pon-onu-mng")
      .flatMap((item) => buildOnuMngCommands(item, true))
      .sort((a, b) => a.rank - b.rank)

    const retrySend = await sendBlocks(olt, interfaceId, retryInterfaceCommands, retryMngCommands)
    skippedItems.push(...retrySend.skipped)

    const secondCheck = await verifyWithRetry(olt, onu, targetInterface, targetMng)
    if (!secondCheck.ok) {
      return { ok: false, message: `Verifikasi setelah hapus+buat ulang gagal: ${secondCheck.message}. Periksa langsung di terminal OLT.` }
    }

    const secondResidual = secondCheck.residual.filter((item) => !matchesSkippedItem(item, skippedItems))
    if (secondResidual.length === 0) {
      if (skippedItems.length > 0) {
        return {
          ok: true,
          message: `${applied.length} perintah diterapkan (${retrySend.applied.length} tambahan via hapus+buat ulang) dan terverifikasi di ${interfaceId}.\n\n${formatSkippedItems(skippedItems, onu.serialNumber)}\n\nCatatan: item yang dilewati tetap tersimpan di aplikasi namun tidak akan diterapkan ke ONU ini.`,
        }
      }
      return {
        ok: true,
        message: `${applied.length} perintah diterapkan (${retrySend.applied.length} tambahan via hapus+buat ulang) dan terverifikasi di ${interfaceId}.`,
      }
    }

    const detail = secondResidual.map((item) => `${item.action} ${item.kind} ${item.id ?? ""}`.trim()).join(", ")
    const oltLines = (secondCheck.rawMng ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^wan-ip\s/.test(line) || /^security-mgmt\s/.test(line))
      .join("\n")
    const skippedNote = skippedItems.length > 0 ? `\n\n${formatSkippedItems(skippedItems, onu.serialNumber)}` : ""
    return {
      ok: false,
      message: `Perintah terkirim (${applied.length} + ${retrySend.applied.length}) tetapi ${secondResidual.length} perubahan masih belum terlihat di OLT (${detail}).\n\nBaris wan-ip/security-mgmt saat ini di OLT:\n${oltLines || "(tidak ada wan-ip/security-mgmt di OLT)"}${skippedNote}\n\nPeriksa sintaks perintahnya atau cek langsung di terminal OLT.`,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? `Gagal menerapkan konfigurasi: ${error.message}` : "Gagal menerapkan konfigurasi.",
    }
  }
}
