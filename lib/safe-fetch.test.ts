import { describe, expect, it } from 'vitest'
import { UnsafeUrlError, assertSafeUrl, isBlockedAddress } from '@/lib/safe-fetch'

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

  it('sees through IPv4-mapped IPv6 forms', () => {
    expect(isBlockedAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isBlockedAddress('::ffff:10.0.0.1')).toBe(true)
    expect(isBlockedAddress('::ffff:8.8.8.8')).toBe(false)
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
})
