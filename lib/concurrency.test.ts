import { describe, expect, it } from 'vitest'
import { chunk, isRetryableError, mapWithConcurrency, withRetry } from '@/lib/concurrency'

describe('chunk', () => {
  it('splits into fixed-size pieces', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns nothing for an empty input', () => {
    expect(chunk([], 10)).toEqual([])
  })

  it('never produces an infinite loop on a bad size', () => {
    expect(chunk([1, 2], 0)).toEqual([[1], [2]])
    expect(chunk([1, 2], -3)).toEqual([[1], [2]])
  })
})

describe('mapWithConcurrency', () => {
  it('preserves input order regardless of completion order', async () => {
    const result = await mapWithConcurrency([3, 1, 2], 3, async (n) => {
      await new Promise((resolve) => setTimeout(resolve, n * 5))
      return n * 10
    })

    expect(result).toEqual([30, 10, 20])
  })

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0
    let peak = 0

    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight--
    })

    expect(peak).toBeLessThanOrEqual(4)
  })

  it('handles an empty list', async () => {
    expect(await mapWithConcurrency([], 5, async () => 1)).toEqual([])
  })
})

describe('isRetryableError', () => {
  it('retries throttling and transient backend failures', () => {
    expect(isRetryableError({ code: 429 })).toBe(true)
    expect(isRetryableError({ code: 500 })).toBe(true)
    expect(isRetryableError({ code: 503 })).toBe(true)
    expect(isRetryableError({ name: 'TimeoutError' })).toBe(true)
  })

  // These are the shapes googleapis/gaxios actually throws. Asserting only on
  // bare {code: number} objects left the real branches untested and dead.
  it('reads the status off a realistic GaxiosError', () => {
    expect(isRetryableError({ code: 'ERR_BAD_REQUEST', status: 429 })).toBe(true)
    expect(isRetryableError({ code: 'ERR_BAD_RESPONSE', response: { status: 503 } })).toBe(true)
    expect(isRetryableError({ code: '429' })).toBe(true)
    expect(isRetryableError({ code: 'ERR_BAD_REQUEST', status: 404 })).toBe(false)
  })

  it('retries network-level failures by their errno code', () => {
    expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true)
    expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true)
    expect(isRetryableError({ code: 'EAI_AGAIN' })).toBe(true)
    expect(isRetryableError({ name: 'TypeError', cause: { code: 'UND_ERR_SOCKET' } })).toBe(true)
  })

  it('retries a 403 only when the reason is a rate limit', () => {
    expect(isRetryableError({ code: 403, errors: [{ reason: 'userRateLimitExceeded' }] })).toBe(true)
    // The nested shape a real Gmail 403 arrives in.
    expect(
      isRetryableError({
        code: 'ERR_BAD_REQUEST',
        status: 403,
        response: { status: 403, data: { error: { errors: [{ reason: 'rateLimitExceeded' }] } } },
      }),
    ).toBe(true)
    // A genuine permissions failure will never succeed on retry.
    expect(isRetryableError({ code: 403, errors: [{ reason: 'insufficientPermissions' }] })).toBe(
      false,
    )
    expect(
      isRetryableError({
        status: 403,
        response: { status: 403, data: { error: { errors: [{ reason: 'forbidden' }] } } },
      }),
    ).toBe(false)
    expect(isRetryableError({ code: 403 })).toBe(false)
  })

  it('does not retry client mistakes', () => {
    expect(isRetryableError({ code: 400 })).toBe(false)
    expect(isRetryableError({ code: 401 })).toBe(false)
    expect(isRetryableError({ code: 404 })).toBe(false)
    expect(isRetryableError(new Error('boom'))).toBe(false)
    expect(isRetryableError(null)).toBe(false)
  })
})

describe('withRetry', () => {
  const noSleep = async () => {}

  it('returns the first success without retrying', async () => {
    let calls = 0
    const value = await withRetry(
      async () => {
        calls++
        return 'ok'
      },
      { sleep: noSleep },
    )

    expect(value).toBe('ok')
    expect(calls).toBe(1)
  })

  it('retries a transient failure and then succeeds', async () => {
    let calls = 0
    const value = await withRetry(
      async () => {
        calls++
        if (calls < 3) throw { code: 429 }
        return 'ok'
      },
      { sleep: noSleep },
    )

    expect(value).toBe('ok')
    expect(calls).toBe(3)
  })

  it('gives up after the attempt budget', async () => {
    let calls = 0
    await expect(
      withRetry(
        async () => {
          calls++
          throw { code: 503 }
        },
        { attempts: 3, sleep: noSleep },
      ),
    ).rejects.toMatchObject({ code: 503 })

    expect(calls).toBe(3)
  })

  it('fails immediately on a non-retryable error', async () => {
    let calls = 0
    await expect(
      withRetry(
        async () => {
          calls++
          throw { code: 400 }
        },
        { sleep: noSleep },
      ),
    ).rejects.toMatchObject({ code: 400 })

    expect(calls).toBe(1)
  })
})
