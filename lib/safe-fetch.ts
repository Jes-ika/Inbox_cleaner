import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * Outbound request guard for URLs that originate in email headers.
 *
 * List-Unsubscribe values are written by whoever sent the mail, so fetching one
 * is an unauthenticated third party choosing a destination for a request that
 * leaves our server. Without these checks that is server-side request forgery:
 * `http://169.254.169.254/...` reaches cloud instance metadata, `http://localhost:*`
 * reaches anything else running on the box.
 *
 * Caveat worth knowing: we resolve the hostname, check the addresses, then let
 * fetch resolve it again. A hostile DNS server can answer differently the second
 * time (rebinding). Closing that needs a custom agent that connects to the
 * address we already vetted; the checks below stop everything short of that.
 */

const MAX_REDIRECTS = 3
const REQUEST_TIMEOUT_MS = 10_000

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

function ipv4ToInt(address: string): number | null {
  const parts = address.split('.')
  if (parts.length !== 4) return null

  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const octet = Number(part)
    if (octet > 255) return null
    value = value * 256 + octet
  }
  return value
}

/** CIDR blocks that must never be reachable from a user-supplied URL. */
const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. 255.255.255.255
]

function isBlockedIpv4(address: string): boolean {
  const value = ipv4ToInt(address)
  if (value === null) return true

  return BLOCKED_V4.some(([network, bits]) => {
    const base = ipv4ToInt(network)
    if (base === null) return false
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return (value & mask) >>> 0 === (base & mask) >>> 0
  })
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0]

  // IPv4-mapped (::ffff:10.0.0.1) and IPv4-compatible forms.
  const embedded = normalized.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/)
  if (embedded) return isBlockedIpv4(embedded[1])

  if (normalized === '::' || normalized === '::1') return true
  if (/^f[cd]/.test(normalized)) return true // fc00::/7 unique local
  if (/^fe[89ab]/.test(normalized)) return true // fe80::/10 link-local
  if (normalized.startsWith('ff')) return true // multicast

  return false
}

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return isBlockedIpv4(address)
  if (family === 6) return isBlockedIpv6(address)
  return true
}

/**
 * Validate a URL that came from an email header. Throws {@link UnsafeUrlError}
 * with a reason that is safe to log but not to echo back verbatim.
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError('Not a valid URL')
  }

  if (url.protocol !== 'https:') {
    throw new UnsafeUrlError(`Refusing non-HTTPS scheme: ${url.protocol}`)
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError('Refusing URL with embedded credentials')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '')

  // A literal IP needs no lookup — check it directly.
  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new UnsafeUrlError('Refusing URL pointing at a reserved address')
    }
    return url
  }

  let addresses: Array<{ address: string }>
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new UnsafeUrlError('Host does not resolve')
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError('Host does not resolve')
  }

  // Every answer must be routable: one bad record is enough to abuse.
  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new UnsafeUrlError('Refusing URL resolving to a reserved address')
    }
  }

  return url
}

export interface SafeFetchResult {
  ok: boolean
  status: number
  finalUrl: string
}

/**
 * Fetch a vetted URL, re-validating every redirect hop and giving up quickly.
 * The response body is discarded — callers only need the status.
 */
export async function safeFetch(
  rawUrl: string,
  init: { method: 'GET' | 'POST'; body?: string; contentType?: string },
): Promise<SafeFetchResult> {
  let current = await assertSafeUrl(rawUrl)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const headers: Record<string, string> = {
      // Identify honestly; some senders reject an empty agent outright.
      'User-Agent': 'InboxClean/0.1 (+https://github.com/inboxclean)',
      Accept: '*/*',
    }
    if (init.contentType) headers['Content-Type'] = init.contentType

    const response = await fetch(current, {
      method: hop === 0 ? init.method : 'GET',
      headers,
      body: hop === 0 ? init.body : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // Drain so the socket can be reused; we never inspect sender HTML.
    await response.arrayBuffer().catch(() => undefined)

    const location = response.headers.get('location')
    const isRedirect = response.status >= 300 && response.status < 400 && location

    if (!isRedirect) {
      return { ok: response.ok, status: response.status, finalUrl: current.toString() }
    }

    if (hop === MAX_REDIRECTS) {
      throw new UnsafeUrlError('Too many redirects')
    }

    current = await assertSafeUrl(new URL(location, current).toString())
  }

  throw new UnsafeUrlError('Too many redirects')
}
