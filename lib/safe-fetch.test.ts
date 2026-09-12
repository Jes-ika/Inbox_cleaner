import { afterEach, describe, expect, it } from 'vitest'
import {
  UnsafeUrlError,
  assertSafeUrl,
  ipv6ToBytes,
  isBlockedAddress,
  safeFetch,
} from '@/lib/safe-fetch'

const hex = (bytes: Uint8Array | null) =>
  bytes === null ? null : Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

describe('ipv6ToBytes', () => {
  it('expands the compressed form', () => {
    expect(hex(ipv6ToBytes('::1'))).toBe('00000000000000000000000000000001')
    expect(hex(ipv6ToBytes('::'))).toBe('00000000000000000000000000000000')
    expect(hex(ipv6ToBytes('2606:4700:4700::1111'))).toBe('26064700470000000000000000001111')
  })

  it('expands a full eight-group address', () => {
    expect(hex(ipv6ToBytes('fe80:0:0:0:0:0:0:1'))).toBe('fe800000000000000000000000000001')
  })

  it('reads a trailing dotted quad', () => {
    expect(hex(ipv6ToBytes('::ffff:127.0.0.1'))).toBe('00000000000000000000ffff7f000001')
  })

  it('reads the canonical hex form of the same address', () => {
    expect(hex(ipv6ToBytes('::ffff:7f00:1'))).toBe('00000000000000000000ffff7f000001')
  })

  it('ignores a zone index', () => {
    expect(hex(ipv6ToBytes('fe80::1%eth0'))).toBe('fe800000000000000000000000000001')
  })

  it('rejects malformed input rather than guessing', () => {
    expect(ipv6ToBytes('gggg::1')).toBeNull()
    expect(ipv6ToBytes('1::2::3')).toBeNull()
    expect(ipv6ToBytes('1:2:3')).toBeNull()
    expect(ipv6ToBytes('::1.2.3')).toBeNull()
  })
})

describe('isBlockedAddress', () => {
  it('blocks loopback', () => {
    expect(isBlockedAddress('127.0.0.1')).toBe(true)
    expect(isBlockedAddress('127.255.255.254')).toBe(true)
    expect(isBlockedAddress('::1')).toBe(true)
  })

  it('blocks the cloud metadata address', () => {
    // The single most valuable SSRF target on any hosted deployment.
    expect(isBlockedAddress('169.254.169.254')).toBe(true)
  })

  it('blocks RFC 1918 private ranges', () => {
    expect(isBlockedAddress('10.0.0.1')).toBe(true)
    expect(isBlockedAddress('172.16.0.1')).toBe(true)
    expect(isBlockedAddress('172.31.255.255')).toBe(true)
    expect(isBlockedAddress('192.168.1.1')).toBe(true)
  })

  it('allows addresses just outside those ranges', () => {
    expect(isBlockedAddress('172.15.255.255')).toBe(false)
    expect(isBlockedAddress('172.32.0.0')).toBe(false)
    expect(isBlockedAddress('11.0.0.1')).toBe(false)
  })

  it('blocks carrier-grade NAT, benchmarking and reserved space', () => {
    expect(isBlockedAddress('100.64.0.1')).toBe(true)
    expect(isBlockedAddress('198.18.0.1')).toBe(true)
    expect(isBlockedAddress('255.255.255.255')).toBe(true)
    expect(isBlockedAddress('0.0.0.0')).toBe(true)
    expect(isBlockedAddress('224.0.0.1')).toBe(true)
  })

  it('allows ordinary public addresses', () => {
    expect(isBlockedAddress('8.8.8.8')).toBe(false)
    expect(isBlockedAddress('1.1.1.1')).toBe(false)
    expect(isBlockedAddress('2606:4700:4700::1111')).toBe(false)
  })

  it('sees through IPv4-mapped IPv6 forms, in dotted and hex spellings', () => {
    expect(isBlockedAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isBlockedAddress('::ffff:10.0.0.1')).toBe(true)
    expect(isBlockedAddress('::ffff:8.8.8.8')).toBe(false)

    // The hex spelling is what the URL parser actually produces, and checking
    // only the dotted form left the whole blocklist bypassable.
    expect(isBlockedAddress('::ffff:7f00:1')).toBe(true) // 127.0.0.1
    expect(isBlockedAddress('::ffff:a00:1')).toBe(true) // 10.0.0.1
    expect(isBlockedAddress('::ffff:a9fe:a9fe')).toBe(true) // 169.254.169.254
    expect(isBlockedAddress('::ffff:c0a8:101')).toBe(true) // 192.168.1.1
    expect(isBlockedAddress('::ffff:808:808')).toBe(false) // 8.8.8.8
  })

  it('sees through the deprecated IPv4-compatible form', () => {
    expect(isBlockedAddress('::7f00:1')).toBe(true) // ::127.0.0.1
    expect(isBlockedAddress('::127.0.0.1')).toBe(true)
  })

  it('sees through NAT64 and 6to4 wrappers', () => {
    expect(isBlockedAddress('64:ff9b::7f00:1')).toBe(true) // NAT64 of 127.0.0.1
    expect(isBlockedAddress('64:ff9b::808:808')).toBe(false) // NAT64 of 8.8.8.8
    expect(isBlockedAddress('2002:7f00:1::')).toBe(true) // 6to4 of 127.0.0.1
  })

  it('blocks IPv6 unique-local and link-local', () => {
    expect(isBlockedAddress('fc00::1')).toBe(true)
    expect(isBlockedAddress('fd12:3456::1')).toBe(true)
    expect(isBlockedAddress('fe80::1')).toBe(true)
  })

  it('treats anything unparseable as blocked', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true)
    expect(isBlockedAddress('')).toBe(true)
    expect(isBlockedAddress('999.999.999.999')).toBe(true)
  })
})

describe('assertSafeUrl', () => {
  it('rejects a non-HTTPS scheme', async () => {
    await expect(assertSafeUrl('http://example.com/unsub')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertSafeUrl('mailto:a@b.com')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('rejects malformed input', async () => {
    await expect(assertSafeUrl('not a url')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('rejects embedded credentials', async () => {
    await expect(assertSafeUrl('https://user:pass@example.com/')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    )
  })

  it('rejects a literal address in reserved space without a DNS lookup', async () => {
    await expect(assertSafeUrl('https://127.0.0.1/unsub')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertSafeUrl('https://169.254.169.254/latest/meta-data/')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    )
    await expect(assertSafeUrl('https://[::1]/unsub')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('accepts a public literal address', async () => {
    const url = await assertSafeUrl('https://8.8.8.8/unsub?id=1')
    expect(url.hostname).toBe('8.8.8.8')
    expect(url.search).toBe('?id=1')
  })

  // These go through assertSafeUrl on purpose. Testing isBlockedAddress directly
  // with a dotted-quad string could not catch the bypass, because the URL parser
  // rewrites the host to hex before the guard ever sees it.
  it('blocks IPv4-mapped IPv6 literals written as a URL host', async () => {
    for (const raw of [
      'https://[::ffff:127.0.0.1]/x',
      'https://[::ffff:10.0.0.1]/',
      'https://[::ffff:169.254.169.254]/latest/meta-data/',
      'https://[::ffff:192.168.1.1]/',
      'https://[::127.0.0.1]/',
      'https://[64:ff9b::7f00:1]/',
      'https://[2002:7f00:1::]/',
      'https://[fc00::1]/',
      'https://[fe80::1]/',
    ]) {
      await expect(assertSafeUrl(raw), raw).rejects.toBeInstanceOf(UnsafeUrlError)
    }
  })

  it('still accepts a genuinely public IPv6 literal host', async () => {
    const url = await assertSafeUrl('https://[2606:4700:4700::1111]/unsub')
    expect(url.hostname).toBe('[2606:4700:4700::1111]')
  })
})

describe('safeFetch redirect and body handling', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  interface Hop {
    status: number
    location?: string
  }

  /**
   * Stub fetch with a scripted redirect chain. A literal public IP is used as
   * the host so assertSafeUrl takes its isIP branch and never touches DNS.
   */
  function stubChain(hops: Hop[]) {
    const calls: Array<{ url: string; method: string; body: unknown; hadContentType: boolean }> = []
    let cancelled = 0
    let buffered = 0
    let index = 0

    globalThis.fetch = (async (input: URL | string, init?: RequestInit) => {
      const hop = hops[Math.min(index++, hops.length - 1)]
      calls.push({
        url: String(input),
        method: init?.method ?? 'GET',
        body: init?.body,
        hadContentType: Boolean((init?.headers as Record<string, string>)?.['Content-Type']),
      })

      const headers = new Headers()
      if (hop.location) headers.set('location', hop.location)

      return {
        ok: hop.status >= 200 && hop.status < 300,
        status: hop.status,
        headers,
        body: {
          cancel: async () => {
            cancelled++
          },
        },
        arrayBuffer: async () => {
          buffered++
          return new ArrayBuffer(0)
        },
      } as unknown as Response
    }) as typeof globalThis.fetch

    return { calls, counts: () => ({ cancelled, buffered }) }
  }

  it('discards the body by cancelling the stream, never buffering it', async () => {
    // Buffering an attacker-controlled body is how a hostile endpoint OOMs us.
    const stub = stubChain([{ status: 200 }])

    await safeFetch('https://8.8.8.8/unsub', { method: 'GET' })

    expect(stub.counts()).toEqual({ cancelled: 1, buffered: 0 })
  })

  it('replays the POST and its body across a 308', async () => {
    const stub = stubChain([
      { status: 308, location: 'https://1.1.1.1/moved' },
      { status: 200 },
    ])

    const result = await safeFetch('https://8.8.8.8/unsub', {
      method: 'POST',
      body: 'List-Unsubscribe=One-Click',
      contentType: 'application/x-www-form-urlencoded',
    })

    expect(result.methodPreserved).toBe(true)
    expect(stub.calls.map((c) => c.method)).toEqual(['POST', 'POST'])
    expect(stub.calls[1].body).toBe('List-Unsubscribe=One-Click')
    expect(stub.calls[1].hadContentType).toBe(true)
  })

  it('reports a downgraded one-click POST instead of pretending it went through', async () => {
    const stub = stubChain([
      { status: 302, location: 'https://1.1.1.1/landing' },
      { status: 200 },
    ])

    const result = await safeFetch('https://8.8.8.8/unsub', {
      method: 'POST',
      body: 'List-Unsubscribe=One-Click',
      contentType: 'application/x-www-form-urlencoded',
    })

    expect(result.ok).toBe(true)
    // 302 turns the POST into a GET, so the one-click body never arrived.
    expect(result.methodPreserved).toBe(false)
    expect(stub.calls.map((c) => c.method)).toEqual(['POST', 'GET'])
    expect(stub.calls[1].body).toBeUndefined()
    expect(stub.calls[1].hadContentType).toBe(false)
  })

  it('leaves methodPreserved true for a GET that was redirected', async () => {
    stubChain([{ status: 301, location: 'https://1.1.1.1/x' }, { status: 200 }])

    const result = await safeFetch('https://8.8.8.8/unsub', { method: 'GET' })

    expect(result.methodPreserved).toBe(true)
  })

  it('re-validates every redirect hop against the blocklist', async () => {
    // The hop target is loopback in mapped form — the exact bypass that was open.
    stubChain([{ status: 302, location: 'https://[::ffff:127.0.0.1]/internal' }, { status: 200 }])

    await expect(safeFetch('https://8.8.8.8/unsub', { method: 'GET' })).rejects.toBeInstanceOf(
      UnsafeUrlError,
    )
  })

  it('gives up rather than following a redirect loop forever', async () => {
    stubChain([{ status: 302, location: 'https://8.8.8.8/again' }])

    await expect(safeFetch('https://8.8.8.8/unsub', { method: 'GET' })).rejects.toThrow(
      /Too many redirects/,
    )
  })

  it('returns the final status for a non-redirect response', async () => {
    stubChain([{ status: 410 }])

    const result = await safeFetch('https://8.8.8.8/unsub', { method: 'GET' })

    expect(result).toMatchObject({ ok: false, status: 410, finalUrl: 'https://8.8.8.8/unsub' })
  })
})
