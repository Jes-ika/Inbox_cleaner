import { describe, expect, it } from 'vitest'
import {
  extractEmailFromHeader,
  extractNameFromHeader,
  groupMessagesBySender,
  isPlausibleEmail,
  normalizeHeaders,
  parseEmailHeader,
  parseUnsubscribeHeaders,
  type ParsedMessage,
} from '@/lib/gmail'

describe('parseEmailHeader', () => {
  const headers = [
    { name: 'From', value: 'Canva <marketing@canva.com>' },
    { name: 'List-Unsubscribe', value: '<https://canva.com/u>' },
  ]

  it('matches header names case-insensitively', () => {
    expect(parseEmailHeader(headers, 'from')).toBe('Canva <marketing@canva.com>')
    expect(parseEmailHeader(headers, 'LIST-UNSUBSCRIBE')).toBe('<https://canva.com/u>')
  })

  it('returns an empty string for a missing header', () => {
    expect(parseEmailHeader(headers, 'Subject')).toBe('')
  })
})

describe('normalizeHeaders', () => {
  it('drops entries without a usable name and value', () => {
    expect(
      normalizeHeaders([
        { name: 'From', value: 'a@b.com' },
        { name: null, value: 'orphan' },
        { name: 'X-Empty', value: null },
      ]),
    ).toEqual([{ name: 'From', value: 'a@b.com' }])
  })

  it('handles null and undefined', () => {
    expect(normalizeHeaders(null)).toEqual([])
    expect(normalizeHeaders(undefined)).toEqual([])
  })
})

describe('extractEmailFromHeader', () => {
  it('reads the angle-bracketed address', () => {
    expect(extractEmailFromHeader('Canva <marketing@canva.com>')).toBe('marketing@canva.com')
  })

  it('accepts a bare address', () => {
    expect(extractEmailFromHeader('digest@medium.com')).toBe('digest@medium.com')
  })

  it('lowercases, so one sender is never two rows', () => {
    expect(extractEmailFromHeader('News <News@Example.COM>')).toBe('news@example.com')
  })

  it('survives a display name containing an at sign', () => {
    expect(extractEmailFromHeader('"me@work" <hello@corp.com>')).toBe('hello@corp.com')
  })
})

describe('extractNameFromHeader', () => {
  it('strips surrounding quotes', () => {
    expect(extractNameFromHeader('"Product Hunt" <newsletter@producthunt.com>')).toBe(
      'Product Hunt',
    )
  })

  it('reads an unquoted display name', () => {
    expect(extractNameFromHeader('Canva <marketing@canva.com>')).toBe('Canva')
  })

  it('falls back to the address when there is no name', () => {
    expect(extractNameFromHeader('digest@medium.com')).toBe('digest@medium.com')
    expect(extractNameFromHeader('<digest@medium.com>')).toBe('digest@medium.com')
  })
})

describe('parseUnsubscribeHeaders', () => {
  it('returns null for an absent header', () => {
    expect(parseUnsubscribeHeaders('')).toBeNull()
    expect(parseUnsubscribeHeaders('   ')).toBeNull()
  })

  it('prefers the web link when the header offers both', () => {
    const target = parseUnsubscribeHeaders(
      '<mailto:unsub@example.com>, <https://example.com/unsub?id=1>',
    )
    expect(target).toEqual({ kind: 'http', url: 'https://example.com/unsub?id=1', oneClick: false })
  })

  it('detects RFC 8058 one-click', () => {
    const target = parseUnsubscribeHeaders(
      '<https://example.com/unsub>',
      'List-Unsubscribe=One-Click',
    )
    expect(target).toMatchObject({ kind: 'http', oneClick: true })
  })

  it('detects one-click regardless of case and spacing', () => {
    expect(
      parseUnsubscribeHeaders('<https://example.com/u>', 'list-unsubscribe = one-click'),
    ).toMatchObject({ oneClick: true })
  })

  it('does not claim one-click when only the URL is present', () => {
    expect(parseUnsubscribeHeaders('<https://example.com/u>')).toMatchObject({ oneClick: false })
  })

  it('parses a mailto target and its subject', () => {
    expect(
      parseUnsubscribeHeaders('<mailto:leave@example.com?subject=unsubscribe%20me>'),
    ).toEqual({ kind: 'mailto', address: 'leave@example.com', subject: 'unsubscribe me' })
  })

  it('handles a mailto with no subject', () => {
    expect(parseUnsubscribeHeaders('<mailto:leave@example.com>')).toEqual({
      kind: 'mailto',
      address: 'leave@example.com',
      subject: undefined,
    })
  })

  it('accepts a header that omits angle brackets', () => {
    expect(parseUnsubscribeHeaders('https://example.com/unsub')).toMatchObject({
      kind: 'http',
      url: 'https://example.com/unsub',
    })
  })

  it('keeps an insecure link visible rather than discarding it', () => {
    // The route decides what to do with http://; parsing should not hide it.
    expect(parseUnsubscribeHeaders('<http://example.com/unsub>')).toMatchObject({
      kind: 'http',
      url: 'http://example.com/unsub',
    })
  })
})

function message(
  id: string,
  from: string,
  receivedAt: number,
  extras: Record<string, string> = {},
  sizeBytes = 1000,
  inInbox = true,
): ParsedMessage {
  return {
    id,
    receivedAt,
    sizeBytes,
    inInbox,
    headers: [
      { name: 'From', value: from },
      ...Object.entries(extras).map(([name, value]) => ({ name, value })),
    ],
  }
}

describe('groupMessagesBySender', () => {
  const FROM = 'Medium <digest@medium.com>'

  it('reports the newest date, not the last message processed', () => {
    const older = Date.UTC(2026, 0, 1)
    const newer = Date.UTC(2026, 5, 1)

    // Newer first, older second: the bug this replaces overwrote unconditionally.
    const [sender] = groupMessagesBySender([
      message('a', FROM, newer),
      message('b', FROM, older),
    ])

    expect(sender.lastReceived).toBe(new Date(newer).toISOString())
  })

  it('picks up an unsubscribe link from any of a sender’s messages', () => {
    const [sender] = groupMessagesBySender([
      message('a', FROM, 2),
      message('b', FROM, 1, { 'List-Unsubscribe': '<https://medium.com/unsub>' }),
    ])

    expect(sender.unsubscribe).toMatchObject({ kind: 'http', url: 'https://medium.com/unsub' })
  })

  it('prefers a one-click endpoint over a plain link or a mailto', () => {
    const [sender] = groupMessagesBySender([
      message('a', FROM, 3, { 'List-Unsubscribe': '<mailto:leave@medium.com>' }),
      message('b', FROM, 2, { 'List-Unsubscribe': '<https://medium.com/plain>' }),
      message('c', FROM, 1, {
        'List-Unsubscribe': '<https://medium.com/one-click>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      }),
    ])

    expect(sender.unsubscribe).toMatchObject({ url: 'https://medium.com/one-click', oneClick: true })
  })

  it('aggregates counts, sizes and ids newest-first', () => {
    const [sender] = groupMessagesBySender([
      message('old', FROM, 100, {}, 500),
      message('new', FROM, 300, {}, 1500),
      message('mid', FROM, 200, {}, 1000),
    ])

    expect(sender.emailCount).toBe(3)
    expect(sender.sizeBytes).toBe(3000)
    expect(sender.messageIds).toEqual(['new', 'mid', 'old'])
  })

  it('treats differently-cased addresses as one sender', () => {
    const senders = groupMessagesBySender([
      message('a', 'Medium <Digest@Medium.com>', 2),
      message('b', 'Medium <digest@medium.com>', 1),
    ])

    expect(senders).toHaveLength(1)
    expect(senders[0].emailCount).toBe(2)
  })

  it('orders senders by volume', () => {
    const senders = groupMessagesBySender([
      message('a', 'Quiet <quiet@example.com>', 1),
      message('b', 'Loud <loud@example.com>', 2),
      message('c', 'Loud <loud@example.com>', 3),
    ])

    expect(senders.map((s) => s.email)).toEqual(['loud@example.com', 'quiet@example.com'])
  })

  it('skips messages with no parseable sender', () => {
    expect(groupMessagesBySender([message('a', '', 1)])).toEqual([])
  })

  it('renders a missing internalDate as an epoch date rather than throwing', () => {
    const [sender] = groupMessagesBySender([message('a', FROM, 0)])
    expect(sender.lastReceived).toBe(new Date(0).toISOString())
  })

  // Cleanup acts on inboxMessageIds, never messageIds. Archiving already
  // archived mail changes nothing, so counting it would overstate the result —
  // and undoing that "archive" would drop long-archived mail into the inbox.
  describe('inbox subset', () => {
    it('separates inbox mail from mail that is only in the category', () => {
      const [sender] = groupMessagesBySender([
        message('in-1', FROM, 300, {}, 1000, true),
        message('archived', FROM, 200, {}, 4000, false),
        message('in-2', FROM, 100, {}, 500, true),
      ])

      expect(sender.emailCount).toBe(3)
      expect(sender.messageIds).toEqual(['in-1', 'archived', 'in-2'])
      expect(sender.sizeBytes).toBe(5500)

      expect(sender.inboxCount).toBe(2)
      expect(sender.inboxMessageIds).toEqual(['in-1', 'in-2'])
      expect(sender.inboxSizeBytes).toBe(1500)
    })

    it('keeps a sender whose mail is entirely archived, so they stay unsubscribable', () => {
      // Scoping discovery to the inbox hid these senders completely, leaving
      // the user still subscribed with no way to act.
      const [sender] = groupMessagesBySender([
        message('old', FROM, 100, { 'List-Unsubscribe': '<https://medium.com/u>' }, 1000, false),
      ])

      expect(sender.emailCount).toBe(1)
      expect(sender.unsubscribe).toMatchObject({ kind: 'http' })
      expect(sender.inboxCount).toBe(0)
      expect(sender.inboxMessageIds).toEqual([])
      expect(sender.inboxSizeBytes).toBe(0)
    })

    it('orders inbox ids newest first, like the full list', () => {
      const [sender] = groupMessagesBySender([
        message('old', FROM, 100, {}, 100, true),
        message('new', FROM, 300, {}, 100, true),
        message('skip', FROM, 200, {}, 100, false),
      ])

      expect(sender.inboxMessageIds).toEqual(['new', 'old'])
    })
  })
})

describe('isPlausibleEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isPlausibleEmail('digest@medium.com')).toBe(true)
    expect(isPlausibleEmail('a.b+tag@sub.example.co.uk')).toBe(true)
  })

  it('rejects anything that could break out of a Gmail search query', () => {
    expect(isPlausibleEmail('a@b.com" OR from:someone-else@x.com')).toBe(false)
    expect(isPlausibleEmail('<script>@x.com')).toBe(false)
    expect(isPlausibleEmail('no-at-sign')).toBe(false)
    expect(isPlausibleEmail('spaces @x.com')).toBe(false)
    expect(isPlausibleEmail('')).toBe(false)
  })
})
