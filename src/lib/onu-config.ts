import type { Olt, Onu, OnuConfigUpdateItem } from "@/lib/types"

export type TcontItem = {
  id: number
  name: string
  profile: string
}

export type GemportItem = {
  id: number
  tcont: number
}

export type ServicePortItem = {
  id: number
  vport: number
  userVlan: number
  vlan: number
}

export type ServiceItem = {
  id: number
  gemport: number
  vlan: number
}

export type WanIpItem = {
  id: number
  mode: string
  username: string
  password: string
  vlanProfile: string
  host: number
}

export type SecurityMgmtItem = {
  id: number
  state: string
  mode: string
  protocol: string
}

export type ParsedInterfaceConfig = {
  name: string
  description: string
  tconts: TcontItem[]
  gemports: GemportItem[]
  servicePorts: ServicePortItem[]
}

export type ParsedOnuMngConfig = {
  services: ServiceItem[]
  wanIps: WanIpItem[]
  securityMgmts: SecurityMgmtItem[]
}

export type OnuConfigApplyRequest = {
  olt: Olt
  onu: Onu
  interfaceConfig: ParsedInterfaceConfig
  onuMngConfig: ParsedOnuMngConfig
}

export function emptyInterfaceConfig(): ParsedInterfaceConfig {
  return { name: "", description: "", tconts: [], gemports: [], servicePorts: [] }
}

export function emptyOnuMngConfig(): ParsedOnuMngConfig {
  return { services: [], wanIps: [], securityMgmts: [] }
}

export function parseInterfaceConfig(raw: string): ParsedInterfaceConfig {
  const config = emptyInterfaceConfig()

  for (const rawLine of raw.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim().replace(/\s*!\s*$/, "")
    if (!line) continue

    const nameMatch = line.match(/^name\s+(.+)$/)
    if (nameMatch) {
      config.name = nameMatch[1].trim()
      continue
    }

    const descriptionMatch = line.match(/^description\s+(.+)$/)
    if (descriptionMatch) {
      config.description = descriptionMatch[1].trim()
      continue
    }

    const tcontMatch = line.match(/^tcont\s+(\d+)\s+name\s+(.+?)\s+profile\s+(\S+)$/)
    if (tcontMatch) {
      config.tconts.push({ id: Number(tcontMatch[1]), name: tcontMatch[2].trim(), profile: tcontMatch[3] })
      continue
    }

    const gemportMatch = line.match(/^gemport\s+(\d+)\s+tcont\s+(\d+)$/)
    if (gemportMatch) {
      config.gemports.push({ id: Number(gemportMatch[1]), tcont: Number(gemportMatch[2]) })
      continue
    }

    const servicePortMatch = line.match(/^service-port\s+(\d+)\s+vport\s+(\d+)\s+user-vlan\s+(\d+)\s+vlan\s+(\d+)$/)
    if (servicePortMatch) {
      config.servicePorts.push({
        id: Number(servicePortMatch[1]),
        vport: Number(servicePortMatch[2]),
        userVlan: Number(servicePortMatch[3]),
        vlan: Number(servicePortMatch[4]),
      })
    }
  }

  return config
}

export function parseOnuMngConfig(raw: string): ParsedOnuMngConfig {
  const config = emptyOnuMngConfig()

  for (const rawLine of raw.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim().replace(/\s*!\s*$/, "")
    if (!line) continue

    const serviceMatch = line.match(/^service\s+(\d+)\s+gemport\s+(\d+)\s+vlan\s+(\d+)$/)
    if (serviceMatch) {
      config.services.push({ id: Number(serviceMatch[1]), gemport: Number(serviceMatch[2]), vlan: Number(serviceMatch[3]) })
      continue
    }

    const wanIpMatch = line.match(/^wan-ip\s+(\d+)\s+mode\s+(\S+)(?:\s+username\s+(\S+))?(?:\s+password\s+(\S+))?(?:\s+vlan-profile\s+(\S+))?(?:\s+host\s+(\d+))?(?:\s+\S+)*$/)
    if (wanIpMatch) {
      config.wanIps.push({
        id: Number(wanIpMatch[1]),
        mode: wanIpMatch[2],
        username: wanIpMatch[3] ?? "",
        password: wanIpMatch[4] ?? "",
        vlanProfile: wanIpMatch[5] ?? "",
        host: Number(wanIpMatch[6] ?? 0),
      })
      continue
    }

    const securityMatch = line.match(/^security-mgmt\s+(\d+)\s+state\s+(\S+)\s+mode\s+(\S+)\s+protocol\s+(\S+)$/)
    if (securityMatch) {
      config.securityMgmts.push({ id: Number(securityMatch[1]), state: securityMatch[2], mode: securityMatch[3], protocol: securityMatch[4] })
    }
  }

  return config
}

function diffByIdItems<T extends { id: number }>(
  block: OnuConfigUpdateItem["block"],
  kind: OnuConfigUpdateItem["kind"],
  original: T[],
  edited: T[],
  serialize: (item: T) => string,
  toItem: (item: T) => Omit<OnuConfigUpdateItem, "block" | "kind" | "action" | "id">,
): OnuConfigUpdateItem[] {
  const items: OnuConfigUpdateItem[] = []
  const originalMap = new Map(original.map((item) => [item.id, item]))
  const editedMap = new Map(edited.map((item) => [item.id, item]))

  for (const [id, item] of editedMap) {
    if (!originalMap.has(id)) {
      items.push({ block, kind, action: "add", id, ...toItem(item) })
    } else if (serialize(originalMap.get(id) as T) !== serialize(item)) {
      items.push({ block, kind, action: "update", id, ...toItem(item) })
    }
  }

  for (const id of originalMap.keys()) {
    if (!editedMap.has(id)) {
      items.push({ block, kind, action: "delete", id })
    }
  }

  return items
}

export function diffInterfaceConfig(original: ParsedInterfaceConfig, edited: ParsedInterfaceConfig): OnuConfigUpdateItem[] {
  const items: OnuConfigUpdateItem[] = []

  if (original.name !== edited.name) {
    items.push({ block: "interface", kind: "name", action: "update", value: edited.name })
  }
  if (original.description !== edited.description) {
    items.push({ block: "interface", kind: "description", action: "update", value: edited.description })
  }

  items.push(
    ...diffByIdItems(
      "interface",
      "tcont",
      original.tconts,
      edited.tconts,
      (item) => `${item.id}|${item.name}|${item.profile}`,
      (item) => ({ name: item.name, profile: item.profile }),
    ),
  )

  items.push(
    ...diffByIdItems(
      "interface",
      "gemport",
      original.gemports,
      edited.gemports,
      (item) => `${item.id}|${item.tcont}`,
      (item) => ({ tcont: item.tcont }),
    ),
  )

  items.push(
    ...diffByIdItems(
      "interface",
      "service-port",
      original.servicePorts,
      edited.servicePorts,
      (item) => `${item.id}|${item.vport}|${item.userVlan}|${item.vlan}`,
      (item) => ({ vport: item.vport, userVlan: item.userVlan, vlan: item.vlan }),
    ),
  )

  return items
}

export function diffOnuMngConfig(original: ParsedOnuMngConfig, edited: ParsedOnuMngConfig): OnuConfigUpdateItem[] {
  const items: OnuConfigUpdateItem[] = []

  items.push(
    ...diffByIdItems(
      "pon-onu-mng",
      "service",
      original.services,
      edited.services,
      (item) => `${item.id}|${item.gemport}|${item.vlan}`,
      (item) => ({ gemport: item.gemport, vlan: item.vlan }),
    ),
  )

  items.push(
    ...diffByIdItems(
      "pon-onu-mng",
      "wan-ip",
      original.wanIps,
      edited.wanIps,
      (item) => `${item.id}|${item.mode}|${item.username}|${item.password}|${item.vlanProfile}|${item.host}`,
      (item) => ({ mode: item.mode, username: item.username, password: item.password, vlanProfile: item.vlanProfile, host: item.host }),
    ),
  )

  items.push(
    ...diffByIdItems(
      "pon-onu-mng",
      "security-mgmt",
      original.securityMgmts,
      edited.securityMgmts,
      (item) => `${item.id}|${item.state}|${item.mode}|${item.protocol}`,
      (item) => ({ state: item.state, mode: item.mode, protocol: item.protocol }),
    ),
  )

  return items
}
