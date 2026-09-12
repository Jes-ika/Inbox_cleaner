import { beforeEach, describe, expect, it, vi } from 'vitest'

const getToken = vi.fn()
const refreshGoogleAccessToken = vi.fn()

vi.mock('next-auth/jwt', () => ({ getToken: (...args: unknown[]) => getToken(...args) }))
vi.mock('@/lib/auth', () => ({
  refreshGoogleAccessToken: (...args: unknown[]) => refreshGoogleAccessToken(...args),
}))

const { parseMessageIds, requireAccessToken } = await import('@/lib/api-auth')
const { MAX_MESSAGES_PER_ACTION } = await import('@/utils/constants')

/** requireAccessToken only ever reads cookies/headers off the request. */
const fakeRequest = {} as Parameters<typeof requireAccessToken>[0]

const nowSeconds = () => Math.floor(Date.now() / 1000)

describe('parseMessageIds', () => {
  it('accepts a list of Gmail ids and de-duplicates it', async () => {
    const result = parseMessageIds(['18f2a', '18f2b', '18f2a'])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.messageIds).toEqual(['18f2a', '18f2b'])
  })

  it('accepts the full URL-safe alphabet Gmail uses', async () => {
    const result = parseMessageIds(['A-z_0-9', 'abc123DEF'])
    expect(result.ok).toBe(true)
  })

  it('rejects a non-array', async () => {
    const result = parseMessageIds('18f2a')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(400)
      await expect(result.response.json()).resolves.toMatchObject({
        error: expect.stringContaining('array'),
      })
    }
  })

  it('rejects an empty selection', async () => {
    const result = parseMessageIds([])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })

  it('rejects anything that is not a plausible message id', async () => {
    for (const bad of [
      ['../../etc/passwd'],
      ['id with spaces'],
      ['id/with/slashes'],
      [''],
      [123],
      [null],
      [{ id: 'x' }],
      ['x'.repeat(129)],
    ]) {
      const result = parseMessageIds(bad)
      expect(result.ok, JSON.stringify(bad)).toBe(false)
    }
  })

  it('bounds the batch so one request cannot fan out without limit', async () => {
    const tooMany = Array.from({ length: MAX_MESSAGES_PER_ACTION + 1 }, (_, i) => `id${i}`)
    const result = parseMessageIds(tooMany)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(400)
      await expect(result.response.json()).resolves.toMatchObject({
        error: expect.stringContaining(String(MAX_MESSAGES_PER_ACTION)),
      })
    }

    // The cap itself is still allowed.
    expect(parseMessageIds(tooMany.slice(0, MAX_MESSAGES_PER_ACTION)).ok).toBe(true)
  })
})

describe('requireAccessToken', () => {
  beforeEach(() => {
    getToken.mockReset()
    refreshGoogleAccessToken.mockReset()
  })

  async function body(response: Response) {
    return (await response.json()) as { error?: string; code?: string }
  }

  it('401s with no session at all', async () => {
    getToken.mockResolvedValue(null)

    const result = await requireAccessToken(fakeRequest)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
      // No reauth code: there is nothing to refresh, the user simply is not in.
      expect(await body(result.response)).toEqual({ error: 'Not signed in.' })
    }
  })

  it('passes a token through untouched while it is still valid', async () => {
    getToken.mockResolvedValue({
      accessToken: 'live-token',
      refreshToken: 'r',
      expiresAt: nowSeconds() + 3600,
    })

    const result = await requireAccessToken(fakeRequest)

    expect(result).toEqual({ ok: true, accessToken: 'live-token' })
    expect(refreshGoogleAccessToken).not.toHaveBeenCalled()
  })

  // getToken() only decrypts the cookie — it never runs the jwt callback — so a
  // tab left open past the hour hands the route a dead token unless we check.
  it('refreshes inline when the stored token has expired', async () => {
    getToken.mockResolvedValue({
      accessToken: 'stale-token',
      refreshToken: 'refresh-me',
      expiresAt: nowSeconds() - 10,
    })
    refreshGoogleAccessToken.mockResolvedValue({
      accessToken: 'fresh-token',
      refreshToken: 'refresh-me',
      expiresAt: nowSeconds() + 3600,
    })

    const result = await requireAccessToken(fakeRequest)

    expect(result).toEqual({ ok: true, accessToken: 'fresh-token' })
    expect(refreshGoogleAccessToken).toHaveBeenCalledWith('refresh-me')
  })

  it('refreshes just inside the expiry, rather than racing the clock', async () => {
    getToken.mockResolvedValue({
      accessToken: 'nearly-stale',
      refreshToken: 'refresh-me',
      expiresAt: nowSeconds() + 5, // inside the 30s leeway
    })
    refreshGoogleAccessToken.mockResolvedValue({
      accessToken: 'fresh-token',
      refreshToken: 'refresh-me',
      expiresAt: nowSeconds() + 3600,
    })

    const result = await requireAccessToken(fakeRequest)

    expect(result).toEqual({ ok: true, accessToken: 'fresh-token' })
  })

  it('treats a token with no expiry as expired instead of trusting it', async () => {
    getToken.mockResolvedValue({ accessToken: 'unknown-age', refreshToken: 'refresh-me' })
    refreshGoogleAccessToken.mockResolvedValue({
      accessToken: 'fresh-token',
      refreshToken: 'refresh-me',
      expiresAt: nowSeconds() + 3600,
    })

    const result = await requireAccessToken(fakeRequest)

    expect(result).toEqual({ ok: true, accessToken: 'fresh-token' })
  })

  it('asks for re-consent when the refresh fails, not a misleading 502', async () => {
    getToken.mockResolvedValue({
      accessToken: 'stale-token',
      refreshToken: 'dead-refresh',
      expiresAt: nowSeconds() - 10,
    })
    refreshGoogleAccessToken.mockResolvedValue(null)

    const result = await requireAccessToken(fakeRequest)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
      // The client watches for this code to start the consent flow.
      expect(await body(result.response)).toMatchObject({ code: 'reauth_required' })
    }
  })

  it('asks for re-consent when the jwt callback already gave up', async () => {
    getToken.mockResolvedValue({ error: 'RefreshAccessTokenError', accessToken: 'whatever' })

    const result = await requireAccessToken(fakeRequest)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(await body(result.response)).toMatchObject({ code: 'reauth_required' })
    }
    expect(refreshGoogleAccessToken).not.toHaveBeenCalled()
  })

  it('asks for re-consent when there is no refresh token to use', async () => {
    getToken.mockResolvedValue({ accessToken: 'stale', expiresAt: nowSeconds() - 10 })

    const result = await requireAccessToken(fakeRequest)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(await body(result.response)).toMatchObject({ code: 'reauth_required' })
    }
    expect(refreshGoogleAccessToken).not.toHaveBeenCalled()
  })
})
