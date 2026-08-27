const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^localhost$/i,
]

export function isPrivateOrReservedIp(ip: string): boolean {
  const trimmed = ip.trim()
  if (!trimmed) return true
  if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(trimmed))) return true
  if (!/^[\d.:a-fA-F]+$/.test(trimmed)) return true
  return false
}

export function sanitizeIpForLog(ip: string): string {
  return ip.replace(/[^\d.\-:a-fA-F]/g, "?").slice(0, 45)
}
