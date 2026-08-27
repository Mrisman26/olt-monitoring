export type OidProfileKey = "generic" | "vsol-gpon" | "hsgq-gpon" | "hsgq-epon" | "zte-c320"

export type OidItem = {
  key: string
  label: string
  oid: string
  kind: "system" | "ont" | "optical" | "interface"
}

export type OidProfile = {
  key: OidProfileKey
  name: string
  enterpriseRoot?: string
  items: OidItem[]
}

const systemItems: OidItem[] = [
  { key: "sysDescr", label: "System description", oid: "1.3.6.1.2.1.1.1.0", kind: "system" },
  { key: "sysObjectId", label: "System object ID", oid: "1.3.6.1.2.1.1.2.0", kind: "system" },
  { key: "sysUpTime", label: "System uptime", oid: "1.3.6.1.2.1.1.3.0", kind: "system" },
  { key: "sysName", label: "System name", oid: "1.3.6.1.2.1.1.5.0", kind: "system" },
  { key: "sysLocation", label: "System location", oid: "1.3.6.1.2.1.1.6.0", kind: "system" },
]

const interfaceItems: OidItem[] = [
  { key: "ifDescr", label: "Interface description", oid: "1.3.6.1.2.1.2.2.1.2", kind: "interface" },
  { key: "ifOperStatus", label: "Interface operational status", oid: "1.3.6.1.2.1.2.2.1.8", kind: "interface" },
]

export const oidProfiles: OidProfile[] = [
  {
    key: "generic",
    name: "Generic SNMP",
    items: [...systemItems, ...interfaceItems],
  },
  {
    key: "vsol-gpon",
    name: "VSOL GPON",
    enterpriseRoot: "1.3.6.1.4.1.37950",
    items: [
      ...systemItems,
      { key: "productModel", label: "Product model", oid: "1.3.6.1.4.1.37950.1.1.5.10.14.1.0", kind: "system" },
      { key: "typeVersion", label: "Type version", oid: "1.3.6.1.4.1.37950.1.1.5.10.14.5.0", kind: "system" },
      { key: "productType", label: "Product type", oid: "1.3.6.1.4.1.37950.1.1.5.10.14.6.0", kind: "system" },
      { key: "statusCode", label: "ONT status code", oid: "1.3.6.1.4.1.37950.1.1.6.1.1.1.1.5", kind: "ont" },
      { key: "lastUp", label: "ONT last up", oid: "1.3.6.1.4.1.37950.1.1.6.1.1.1.1.8", kind: "ont" },
      { key: "lastDown", label: "ONT last down", oid: "1.3.6.1.4.1.37950.1.1.6.1.1.1.1.9", kind: "ont" },
      { key: "lastDownReason", label: "ONT last down reason", oid: "1.3.6.1.4.1.37950.1.1.6.1.1.1.1.10", kind: "ont" },
      { key: "serial", label: "ONT serial", oid: "1.3.6.1.4.1.37950.1.1.6.1.1.2.1.5", kind: "ont" },
      { key: "model", label: "ONT model", oid: "1.3.6.1.4.1.37950.1.1.6.1.1.2.1.6", kind: "ont" },
      { key: "temperature", label: "ONT temperature", oid: "1.3.6.1.4.1.37950.1.1.6.1.1.3.1.3", kind: "optical" },
      { key: "txPower", label: "ONT TX power", oid: "1.3.6.1.4.1.37950.1.1.6.1.1.3.1.6", kind: "optical" },
      { key: "rxPower", label: "ONT RX power", oid: "1.3.6.1.4.1.37950.1.1.6.1.1.3.1.7", kind: "optical" },
      ...interfaceItems,
    ],
  },
  {
    key: "hsgq-gpon",
    name: "HSGQ GPON",
    enterpriseRoot: "1.3.6.1.4.1.50224",
    items: [
      ...systemItems,
      { key: "firmwareVersion", label: "Firmware version", oid: "1.3.6.1.4.1.50224.3.1.1.6.0", kind: "system" },
      { key: "productModel", label: "Product model", oid: "1.3.6.1.4.1.50224.3.1.1.19.0", kind: "system" },
      { key: "ontName", label: "ONT name", oid: "1.3.6.1.4.1.50224.3.12.2.1.2", kind: "ont" },
      { key: "runState", label: "ONT run state", oid: "1.3.6.1.4.1.50224.3.12.2.1.4", kind: "ont" },
      { key: "serial", label: "ONT serial", oid: "1.3.6.1.4.1.50224.3.12.2.1.15", kind: "ont" },
      { key: "lastDownReason", label: "ONT last down reason", oid: "1.3.6.1.4.1.50224.3.12.2.1.22", kind: "ont" },
      { key: "rxPower", label: "ONT RX power", oid: "1.3.6.1.4.1.50224.3.12.3.1.4", kind: "optical" },
      { key: "txPower", label: "ONT TX power", oid: "1.3.6.1.4.1.50224.3.12.3.1.5", kind: "optical" },
      { key: "temperature", label: "ONT temperature", oid: "1.3.6.1.4.1.50224.3.12.3.1.8", kind: "optical" },
      ...interfaceItems,
    ],
  },
  {
    key: "hsgq-epon",
    name: "HSGQ EPON",
    enterpriseRoot: "1.3.6.1.4.1.50224",
    items: [
      ...systemItems,
      { key: "firmwareVersion", label: "Firmware version", oid: "1.3.6.1.4.1.50224.3.1.1.6.0", kind: "system" },
      { key: "productModel", label: "Product model", oid: "1.3.6.1.4.1.50224.3.1.1.19.0", kind: "system" },
      { key: "ontName", label: "ONT name", oid: "1.3.6.1.4.1.50224.3.3.2.1.2", kind: "ont" },
      { key: "runState", label: "ONT run state", oid: "1.3.6.1.4.1.50224.3.3.2.1.8", kind: "ont" },
      { key: "serial", label: "ONT serial", oid: "1.3.6.1.4.1.50224.3.3.2.1.7", kind: "ont" },
      { key: "lastDownReason", label: "ONT last down reason", oid: "1.3.6.1.4.1.50224.3.3.2.1.31", kind: "ont" },
      { key: "rxPower", label: "ONT RX power", oid: "1.3.6.1.4.1.50224.3.3.3.1.4", kind: "optical" },
      { key: "temperature", label: "ONT temperature", oid: "1.3.6.1.4.1.50224.3.3.3.1.8", kind: "optical" },
      ...interfaceItems,
    ],
  },
    {
      key: "zte-c320",
      name: "ZTE C320",
      enterpriseRoot: "1.3.6.1.4.1.3902",
      items: [
        ...systemItems,
        // ZTE C320 uses two base OIDs (BaseOID1 and BaseOID2) and several per-ONU columns
        { key: "onuName", label: "ONU name", oid: "1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.2", kind: "ont" },
        { key: "onuType", label: "ONU type", oid: "1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.1", kind: "ont" },
        { key: "description", label: "ONU description", oid: "1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.3", kind: "ont" },
        { key: "serial", label: "ONU serial", oid: "1.3.6.1.4.1.3902.1082.500.10.2.3.3.1.18", kind: "ont" },
        { key: "status", label: "ONU status", oid: "1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.4", kind: "ont" },
        { key: "lastDownReason", label: "ONU last down reason", oid: "1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.7", kind: "ont" },
        { key: "rxPower", label: "ONU RX power", oid: "1.3.6.1.4.1.3902.1082.500.20.2.2.2.1.10", kind: "optical" },
        { key: "txPower", label: "ONU TX power", oid: "1.3.6.1.4.1.3902.1012.3.50.12.1.1.14", kind: "optical" },
        { key: "lastOnline", label: "ONU last online", oid: "1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.5", kind: "ont" },
        { key: "lastOffline", label: "ONU last offline", oid: "1.3.6.1.4.1.3902.1082.500.10.2.3.8.1.6", kind: "ont" },
        { key: "gponOpticalDistance", label: "GPON optical distance", oid: "1.3.6.1.4.1.3902.1082.500.10.2.3.10.1.2", kind: "optical" },
        ...interfaceItems,
      ],
    },
]

export function getOidProfile(key: OidProfileKey) {
  return oidProfiles.find((profile) => profile.key === key) ?? oidProfiles[0]
}
