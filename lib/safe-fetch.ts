import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * Outbound request guard for URLs that originate in email headers.
 *
 * List-Unsubscribe values are written by whoever sent the mail, so fetching one
 * is an unauthenticated third party choosing a destination for a request that
 * leaves our server. Without these checks that is server-side request forgery:
 * `https://169.254.169.254/...` reaches cloud instance metadata, and a loopback
 * host reaches anything else running on the box.
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

/**
 * Expand an IPv6 address to its 16 bytes, or null when it is not one.
 *
 * Deciding from the text is not good enough. The WHATWG URL parser re-serialises
 * an IPv6 host into canonical hex with no special case for embedded IPv4, so
 * `https://[::ffff:127.0.0.1]/` arrives here as `::ffff:7f00:1` — which no
 * dotted-quad pattern matches, and which really does connect to loopback.
 */
export function ipv6ToBytes(address: string): Uint8Array | null {
  const text = address.toLowerCase().split('%')[0]
  const halves = text.split('::')
  if (halves.length > 2) return null

  const expand = (part: string): number[] | null => {
    if (part === '') return []

    const out: number[] = []
    const pieces = part.split(':')

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i]

      // A trailing dotted-quad stands for the final two groups.
      if (piece.includes('.')) {
        if (i !== pieces.length - 1) return null
        const octets = piece.split('.')
        if (octets.length !== 4) return null
        for (const octet of octets) {
          if (!/^\d{1,3}$/.test(octet)) return null
          const value = Number(octet)
          if (value > 255) return null
          out.push(value)
        }
        continue
      }

      if (!/^[0-9a-f]{1,4}$/.test(piece)) return null
      const value = Number.parseInt(piece, 16)
      out.push(value >> 8, value & 0xff)
    }

    return out
  }

  const head = expand(halves[0])
  if (head === null) return null

  const bytes = new Uint8Array(16)

  if (halves.length === 1) {
    if (head.length !== 16) return null
    bytes.set(head)
    return bytes
  }

  const tail = expand(halves[1])
  if (tail === null) return null
  if (head.length + tail.length > 16) return null

  bytes.set(head, 0)
  if (tail.length > 0) bytes.set(tail, 16 - tail.length)
  return bytes
}

function isBlockedIpv6(address: string): boolean {
  const bytes = ipv6ToBytes(address)
  if (!bytes) return true // unparseable: fail closed

  const isZero = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      if (bytes[i] !== 0) return false
    }
    return true
  }

  const embedded = (offset: number) =>
    `${bytes[offset]}.${bytes[offset + 1]}.${bytes[offset + 2]}.${bytes[offset + 3]}`

  // ::ffff:0:0/96 — IPv4-mapped. This is the form the URL parser hands us.
  if (isZero(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isBlockedIpv4(embedded(12))
  }

  // ::/96 — the unspecified address, loopback, and deprecated IPv4-compatible.
  if (isZero(0, 12)) {
    if (isZero(12, 16)) return true // ::
    if (bytes[12] === 0 && bytes[13] === 0 && bytes[14] === 0 && bytes[15] === 1) return true // ::1
    return isBlockedIpv4(embedded(12))
  }

  // 64:ff9b::/96 — NAT64 well-known prefix.
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    isZero(4, 12)
  ) {
    return isBlockedIpv4(embedded(12))
  }

  // 2002::/16 — 6to4, which carries its IPv4 address in the next four bytes.
  if (bytes[0] === 0x20 && bytes[1] === 0x02) {
    return isBlockedIpv4(embedded(2))
  }

  if ((bytes[0] & 0xfe) === 0xfc) return true // fc00::/7 unique local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true // fe80::/10 link local
  if (bytes[0] === 0xff) return true // ff00::/8 multicast

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

  // A literal address needs no lookup — check it directly.
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
  /** False when a one-click POST was turned into a GET by a redirect. */
  methodPreserved: boolean
}

/**
 * Fetch a vetted URL, re-validating every redirect hop and giving up quickly.
 *
 * The response body is never read. Buffering it would let a hostile endpoint
 * stream hundreds of megabytes into the heap on a single unsubscribe click.
 * Cancelling closes the connection rather than returning it to the pool, which
 * is the right trade here: we make at most a handful of these per click, and
 * the alternative is reading bytes we have no use for.
 */
export async function safeFetch(
  rawUrl: string,
  init: { method: 'GET' | 'POST'; body?: string; contentType?: string },
): Promise<SafeFetchResult> {
  let current = await assertSafeUrl(rawUrl)
  let method = init.method
  let body = init.body
  let methodPreserved = true

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const headers: Record<string, string> = {
      // Identify honestly; some senders reject an empty agent outright.
      'User-Agent': 'InboxClean/0.1 (+https://github.com/inboxclean)',
      Accept: '*/*',
    }
    if (init.contentType && method === 'POST') headers['Content-Type'] = init.contentType

    const response = await fetch(current, {
      method,
      headers,
      body: method === 'POST' ? body : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    // Discard without reading: see the note above. Safe on a bodiless response,
    // where `body` is null.
    await response.body?.cancel().catch(() => undefined)

    const location = response.headers.get('location')
    const isRedirect = response.status >= 300 && response.status < 400 && location

    if (!isRedirect) {
      return {
        ok: response.ok,
        status: response.status,
        finalUrl: current.toString(),
        methodPreserved,
      }
    }

    if (hop === MAX_REDIRECTS) {
      throw new UnsafeUrlError('Too many redirects')
    }

    // 307 and 308 require the method and body to be replayed; 301, 302 and 303
    // are conventionally downgraded to GET, which silently drops a one-click
    // POST. Track that so the caller does not claim success it cannot verify.
    if (response.status !== 307 && response.status !== 308) {
      if (method === 'POST') methodPreserved = false
      method = 'GET'
      body = undefined
    }

    current = await assertSafeUrl(new URL(location, current).toString())
  }

  throw new UnsafeUrlError('Too many redirects')
}
