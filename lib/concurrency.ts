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
const RETRYABLE_NETWORK_CODES = new Set([
  'AbortError',
  'TimeoutError',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN',
  'ENOTFOUND',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
])

interface MaybeGaxiosError {
  code?: number | string
  status?: number
  name?: string
  errors?: Array<{ reason?: string }>
  response?: { status?: number; data?: { error?: { errors?: Array<{ reason?: string }> } } }
  cause?: unknown
}

/** Gaxios spreads this information across several shapes depending on version. */
function httpStatus(err: MaybeGaxiosError): number | null {
  for (const candidate of [err.status, err.response?.status, err.code]) {
    if (typeof candidate === 'number') return candidate
    if (typeof candidate === 'string' && /^\d{3}$/.test(candidate)) return Number(candidate)
  }
  return null
}

function reasons(err: MaybeGaxiosError): string[] {
  const direct = err.errors ?? err.response?.data?.error?.errors
  const nested = (err.cause as MaybeGaxiosError | undefined)?.errors
  return [...(direct ?? []), ...(nested ?? [])]
    .map((e) => e.reason)
    .filter((r): r is string => typeof r === 'string')
}

/**
 * Gmail reports throttling as 429, and sometimes as 403 with a rate-limit
 * reason. A 403 for any other reason is a permissions problem that will never
 * succeed on retry, so it is checked specifically rather than by status alone.
 *
 * The shapes matter here: a real GaxiosError carries a *string* `code` like
 * 'ERR_BAD_REQUEST' with the HTTP status on `status`/`response.status`, and puts
 * the rate-limit reason under `response.data.error.errors`. Reading only
 * `err.code` and `err.errors` made both the 403 and the timeout branch dead.
 */
export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as MaybeGaxiosError

  const networkCode = String(err.code ?? err.name ?? '')
  if (RETRYABLE_NETWORK_CODES.has(networkCode)) return true

  const cause = err.cause as MaybeGaxiosError | undefined
  if (cause && RETRYABLE_NETWORK_CODES.has(String(cause.code ?? cause.name ?? ''))) return true

  const status = httpStatus(err)
  if (status === null || !RETRYABLE_STATUS.has(status)) return false

  if (status === 403) {
    return reasons(err).some((reason) => RETRYABLE_REASONS.has(reason))
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
