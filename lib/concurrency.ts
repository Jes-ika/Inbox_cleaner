/** Split an array into fixed-size chunks. A size below 1 is treated as 1. */
export function chunk<T>(items: T[], size: number): T[][] {
  const step = Math.max(1, Math.floor(size))
  const out: T[][] = []
  for (let i = 0; i < items.length; i += step) {
    out.push(items.slice(i, i + step))
  }
  return out
}

/**
 * Map over items with at most `limit` requests in flight.
 *
 * `Promise.all` over a whole mailbox opens hundreds of sockets at once and walks
 * straight into Gmail's per-user rate limit; this keeps the window small enough
 * that the retry path below rarely has to do anything.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  const width = Math.max(1, Math.min(Math.floor(limit), items.length))
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: width }, worker))
  return results
}

const RETRYABLE_STATUS = new Set([403, 408, 429, 500, 502, 503, 504])
const RETRYABLE_REASONS = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'backendError',
  'internalError',
])

/**
 * Gmail reports throttling as 429, and sometimes as 403 with a rate-limit
 * reason. A 403 for any other reason is a permissions problem that will never
 * succeed on retry, so it is checked specifically rather than by status alone.
 */
export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as {
    code?: number | string
    status?: number
    errors?: Array<{ reason?: string }>
    name?: string
  }

  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true

  const status = typeof err.code === 'number' ? err.code : err.status
  if (typeof status !== 'number' || !RETRYABLE_STATUS.has(status)) return false

  if (status === 403) {
    return (err.errors ?? []).some((e) => e.reason && RETRYABLE_REASONS.has(e.reason))
  }

  return true
}

export interface RetryOptions {
  attempts?: number
  baseDelayMs?: number
  /** Injectable for tests; defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Retry with exponential backoff and full jitter, but only for transient failures. */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 4
  const baseDelayMs = options.baseDelayMs ?? 250
  const sleep = options.sleep ?? defaultSleep

  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === attempts - 1 || !isRetryableError(error)) throw error
      const ceiling = baseDelayMs * 2 ** attempt
      await sleep(Math.random() * ceiling)
    }
  }

  throw lastError
}
