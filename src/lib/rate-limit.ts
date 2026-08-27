type RateLimitEntry = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 }
  }

  if (entry.count >= maxAttempts) {
    const retryAfterMs = entry.resetAt - now
    return { allowed: false, remaining: 0, retryAfterMs }
  }

  entry.count++
  return { allowed: true, remaining: maxAttempts - entry.count, retryAfterMs: 0 }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 60_000)
