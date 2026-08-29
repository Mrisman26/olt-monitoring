export type OltStatus = "online" | "degraded" | "offline"

export type AlertSeverity = "critical" | "warning" | "info"

export type Olt = {
  id: string
  name: string
  ipAddress: string
  vendor: "VSOL" | "HSGQ GPON" | "HSGQ EPON" | "Huawei" | "ZTE" | "FiberHome" | "Other"
  model: string
  location: string
  status: OltStatus
  uptime: string
  cpuLoad: number
  memoryLoad: number
  ponPorts: number
  activeOnu: number
  pollingInterval: number
  snmpVersion: "v1" | "v2c" | "v3"
  snmpPort: number
  readCommunity: string
  writeCommunity?: string
  oidProfile: "vsol-gpon" | "hsgq-gpon" | "hsgq-epon" | "generic" | "zte-c320"
  cardName?: string
  writeMode: "none" | "snmp" | "cli" | "api"
  cliPort?: number
  cliUsername?: string
  cliPassword?: string
  /** Flag runtime dari sanitasi: kredensial CLI tersedia di database. Tidak disimpan ke DB. */
  hasCliCredentials?: boolean
  /** Flag runtime dari sanitasi: write community tersedia di database. Tidak disimpan ke DB. */
  hasSnmpWrite?: boolean
  lastSeen: string
  systemInfo?: Record<string, string>
  inventory?: InventoryFields
}

export type Onu = {
  id: string
  oltId: string
  name: string
  serialNumber: string
  ponPort: string
  onuIndex: string
  status: "online" | "offline" | "los"
  rxPower: number
  txPower: number
  temperatureC?: number | null
  downReason?: string | null
  distanceMeters: number
  lastSeen: string
  syncStatus: "synced" | "pending" | "failed" | "local-only"
  inventory?: InventoryFields
  // ZTE detail-info 1:1 dengan OLT CLI
  phaseState?: string | null
  adminState?: string | null
  configState?: string | null
  onuState?: string | null
  onuModel?: string | null
  onuDescription?: string | null
  onlineDuration?: string | null
  lastOnline?: string | null
  lastOffline?: string | null
}

export type Alert = {
  id: string
  oltId: string
  title: string
  detail: string
  severity: AlertSeverity
  createdAt: string
  acknowledged: boolean
}

export type RenameOnuRequest = {
  olt: Olt
  onu: Onu
  nextName: string
}

export type RenameOnuResult = {
  ok: boolean
  syncedToDevice: boolean
  message: string
}

export type RebootOnuRequest = {
  olt: Olt
  onu: Onu
}

export type RebootOnuResult = {
  ok: boolean
  message: string
}

export type OnuHistoryEntry = {
  index: string
  authpassTime: string
  offlineTime: string
  cause: string
}

export type OnuHistoryResult = {
  ok: boolean
  message: string
  summary?: {
    interfaceId: string
    name: string
    type: string
    state: string
    serialNumber: string
    onlineDuration: string
  }
  history: OnuHistoryEntry[]
  dbHistory?: OnuStatusLog[]
}

export type OnuOmciConfigResult = {
  ok: boolean
  message: string
  interfaceConfig: string
  onuMngConfig: string
}

export type OnuConfigItemKind = "name" | "description" | "tcont" | "gemport" | "service-port" | "service" | "wan-ip" | "security-mgmt"

export type OnuConfigUpdateItem = {
  block: "interface" | "pon-onu-mng"
  kind: OnuConfigItemKind
  action: "add" | "update" | "delete"
  id?: number
  value?: string
  name?: string
  profile?: string
  tcont?: number
  vport?: number
  userVlan?: number
  vlan?: number
  gemport?: number
  mode?: string
  username?: string
  password?: string
  vlanProfile?: string
  host?: number
  state?: string
  protocol?: string
}

export type OnuConfigUpdateResult = {
  ok: boolean
  message: string
}

export type TrafficSample = {
  id?: number
  onuId: string
  oltId: string
  timestamp: string
  inputBps: number
  outputBps: number
  inputPps: number
  outputPps: number
}

export type MonitoringState = {
  olts: Olt[]
  onus: Onu[]
  alerts: Alert[]
  settings: MonitoringSettings
}

export type MonitoringSettings = {
  telegram: TelegramSettings
}

export type TelegramSettings = {
  enabled: boolean
  botToken: string
  chatId: string
  notifyOntDown: boolean
  notifyRecovery: boolean
  botPollingEnabled: boolean
  lastUpdateId: number
}

export type UncfgOnuEntry = {
  interfaceId: string
  serialNumber: string
  state: string
}

export type UncfgOnuResult = {
  ok: boolean
  message: string
  entries: UncfgOnuEntry[]
}

export type RxPowerSample = {
  id?: number
  onuId: string
  oltId: string
  timestamp: string
  rxPower: number
  txPower: number
}

export type OnuStatusLog = {
  id?: number
  onuId: string
  oltId: string
  status: "online" | "offline"
  cause: string | null
  timestamp: string
}

export type HardwareHistoryEntry = {
  targetType: "olt" | "onu"
  targetId: string
  fieldName: string
  oldValue: string | null
  newValue: string | null
  actor: string
  timestamp: string
}

export type InventoryFields = {
  model?: string
  serialNumber?: string
  warrantyExpiry?: string
  installDate?: string
  notes?: string
}

export type PonPortStatus = {
  ponPort: string
  online: number
  offline: number
  los: number
  total: number
}
