import { describe, expect, it } from 'vitest'
import { formatBytes, formatCount, formatRelativeTime } from '@/lib/format'

describe('formatRelativeTime', () => {
  const now = Date.UTC(2026, 8, 12, 12, 0, 0)
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it('collapses anything under a minute', () => {
    expect(formatRelativeTime(ago(0), now)).toBe('just now')
    expect(formatRelativeTime(ago(30_000), now)).toBe('just now')
  })

  it('counts minutes and hours', () => {
    expect(formatRelativeTime(ago(60_000), now)).toBe('1 minute ago')
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe('5 minutes ago')
    expect(formatRelativeTime(ago(2 * 3_600_000), now)).toBe('2 hours ago')
  })

  it('counts days, months and years', () => {
    const day = 86_400_000
    expect(formatRelativeTime(ago(day), now)).toBe('1 day ago')
    expect(formatRelativeTime(ago(3 * day), now)).toBe('3 days ago')
    expect(formatRelativeTime(ago(60 * day), now)).toBe('2 months ago')
    expect(formatRelativeTime(ago(400 * day), now)).toBe('1 year ago')
  })

  it('never renders a raw timestamp for bad input', () => {
    // The dashboard used to print the ISO string straight through.
    expect(formatRelativeTime('', now)).toBe('unknown')
    expect(formatRelativeTime('not a date', now)).toBe('unknown')
    expect(formatRelativeTime(new Date(0).toISOString(), now)).toBe('unknown')
  })

  it('does not show a negative duration for clock skew', () => {
    expect(formatRelativeTime(new Date(now + 60_000).toISOString(), now)).toBe('just now')
  })
})

describe('formatBytes', () => {
  it('scales through the units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(2.5 * 1024 ** 3)).toBe('2.5 GB')
  })

  it('drops the decimal once the number is big enough to not need it', () => {
    expect(formatBytes(150 * 1024)).toBe('150 KB')
  })

  it('handles nonsense without producing NaN', () => {
    expect(formatBytes(-1)).toBe('0 B')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })
})

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(1234)).toBe('1,234')
    expect(formatCount(0)).toBe('0')
  })
})
