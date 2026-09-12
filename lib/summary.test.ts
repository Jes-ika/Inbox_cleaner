import { describe, expect, it } from 'vitest'
import { applyCleanupToSummary } from '@/lib/summary'
import type { EmailSender, PromotionalSummary } from '@/types'

function sender(
  email: string,
  ids: string[],
  inboxIds: string[],
  sizeBytes = ids.length * 1000,
): EmailSender {
  return {
    email,
    name: email,
    emailCount: ids.length,
    lastReceived: new Date(1_700_000_000_000).toISOString(),
    messageIds: ids,
    sizeBytes,
    inboxMessageIds: inboxIds,
    inboxCount: inboxIds.length,
    inboxSizeBytes: inboxIds.length * 1000,
    unsubscribe: null,
  }
}

function summaryOf(senders: EmailSender[]): PromotionalSummary {
  return {
    senders,
    totalEmails: senders.reduce((n, s) => n + s.emailCount, 0),
    totalSenders: senders.length,
    totalSizeBytes: senders.reduce((n, s) => n + s.sizeBytes, 0),
    inboxEmails: senders.reduce((n, s) => n + s.inboxCount, 0),
    inboxSizeBytes: senders.reduce((n, s) => n + s.inboxSizeBytes, 0),
    truncated: false,
  }
}

describe('applyCleanupToSummary', () => {
  // 3 messages, 2 of them still in the inbox.
  const base = () => summaryOf([sender('a@x.com', ['m1', 'm2', 'm3'], ['m1', 'm2'])])

  describe('archive', () => {
    it('shrinks only the inbox subset, keeping the sender and its total', () => {
      const next = applyCleanupToSummary(base(), 'archive', ['m1', 'm2'])
      const [only] = next.senders

      // Archived mail is still promotional mail from this sender, so
      // Subscriptions must still list them and offer an unsubscribe.
      expect(next.senders).toHaveLength(1)
      expect(only.emailCount).toBe(3)
      expect(only.messageIds).toEqual(['m1', 'm2', 'm3'])
      expect(only.sizeBytes).toBe(3000)

      expect(only.inboxCount).toBe(0)
      expect(only.inboxMessageIds).toEqual([])
      expect(only.inboxSizeBytes).toBe(0)

      expect(next.totalEmails).toBe(3)
      expect(next.inboxEmails).toBe(0)
    })

    it('handles a partial archive', () => {
      const [only] = applyCleanupToSummary(base(), 'archive', ['m1']).senders

      expect(only.emailCount).toBe(3)
      expect(only.inboxMessageIds).toEqual(['m2'])
      expect(only.inboxCount).toBe(1)
      expect(only.inboxSizeBytes).toBe(1000)
    })

    it('never removes a sender, even when its whole inbox subset goes', () => {
      const next = applyCleanupToSummary(
        summaryOf([sender('a@x.com', ['m1'], ['m1'])]),
        'archive',
        ['m1'],
      )

      expect(next.senders).toHaveLength(1)
      expect(next.totalSenders).toBe(1)
      expect(next.senders[0].inboxCount).toBe(0)
    })
  })

  describe('trash', () => {
    it('removes the messages from both the total and the inbox subset', () => {
      const [only] = applyCleanupToSummary(base(), 'trash', ['m1', 'm2']).senders

      expect(only.emailCount).toBe(1)
      expect(only.messageIds).toEqual(['m3'])
      expect(only.inboxMessageIds).toEqual([])
      expect(only.inboxCount).toBe(0)
    })

    it('drops a sender whose mail is gone entirely', () => {
      const next = applyCleanupToSummary(base(), 'trash', ['m1', 'm2', 'm3'])

      expect(next.senders).toEqual([])
      expect(next.totalSenders).toBe(0)
      expect(next.totalEmails).toBe(0)
      expect(next.inboxEmails).toBe(0)
    })

    it('prorates the size of what remains', () => {
      const [only] = applyCleanupToSummary(
        summaryOf([sender('a@x.com', ['m1', 'm2', 'm3', 'm4'], ['m1'], 4000)]),
        'trash',
        ['m1', 'm2'],
      ).senders

      expect(only.emailCount).toBe(2)
      expect(only.sizeBytes).toBe(2000)
    })
  })

  it('leaves other senders untouched', () => {
    const next = applyCleanupToSummary(
      summaryOf([
        sender('a@x.com', ['m1', 'm2'], ['m1', 'm2']),
        sender('b@x.com', ['n1', 'n2'], ['n1']),
      ]),
      'trash',
      ['m1'],
    )

    const b = next.senders.find((s) => s.email === 'b@x.com')
    expect(b).toMatchObject({ emailCount: 2, inboxCount: 1, messageIds: ['n1', 'n2'] })
    expect(next.totalEmails).toBe(3)
    expect(next.inboxEmails).toBe(2)
  })

  it('ignores ids that are not in the summary', () => {
    const next = applyCleanupToSummary(base(), 'trash', ['not-mine'])
    expect(next.senders[0].emailCount).toBe(3)
    expect(next.totalEmails).toBe(3)
  })

  it('applies twice without double-counting, so a repeat is harmless', () => {
    const once = applyCleanupToSummary(base(), 'archive', ['m1'])
    const twice = applyCleanupToSummary(once, 'archive', ['m1'])

    expect(twice.senders[0].inboxMessageIds).toEqual(['m2'])
    expect(twice.inboxEmails).toBe(1)
  })

  it('keeps `truncated` as it found it', () => {
    const truncated = { ...base(), truncated: true }
    expect(applyCleanupToSummary(truncated, 'trash', ['m1']).truncated).toBe(true)
  })
})
