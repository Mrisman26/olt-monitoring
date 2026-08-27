import type { Olt, MonitoringSettings } from "@/lib/types"

type SanitizedOlt = Omit<Olt, "readCommunity" | "writeCommunity" | "cliUsername" | "cliPassword">

export function sanitizeOlt(olt: Olt): SanitizedOlt {
  const { readCommunity, writeCommunity, cliUsername, cliPassword, ...safe } = olt
  return {
    ...safe,
    // Flag non-rahasia agar UI tetap tahu kredensial tersedia tanpa melihat isinya.
    hasSnmpWrite: Boolean(writeCommunity?.trim()),
    hasCliCredentials: Boolean(cliUsername?.trim() && cliPassword?.trim()),
  }
}

export function sanitizeOltArray(olts: Olt[]): SanitizedOlt[] {
  return olts.map(sanitizeOlt)
}

export function sanitizeSettings(settings: MonitoringSettings | undefined): MonitoringSettings | undefined {
  if (!settings) return undefined
  return {
    ...settings,
    telegram: {
      ...settings.telegram,
      botToken: settings.telegram.botToken ? "••••••••" : "",
    },
  }
}
