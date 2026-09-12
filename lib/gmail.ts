import { google, type gmail_v1 } from 'googleapis'
import { chunk, mapWithConcurrency, withRetry } from '@/lib/concurrency'
import {
  DEFAULT_SCAN_LIMIT,
  GMAIL_QUERY,
  MAX_MESSAGES_PER_ACTION,
  MAX_SCAN_LIMIT,
} from '@/utils/constants'
import type { EmailSender, PromotionalSummary, UnsubscribeTarget } from '@/types'

const METADATA_HEADERS = ['From', 'List-Unsubscribe', 'List-Unsubscribe-Post']

/** Gmail allows 500 ids per list page and 1000 per batchModify. */
const LIST_PAGE_SIZE = 500
const BATCH_MODIFY_SIZE = 1000

/**
 * How many of a sender's messages the unsubscribe lookup reads.
 *
 * The scan ranks targets across its whole window, so reading too few here makes
 * the lookup disagree with the badge the UI showed.
 */
const UNSUBSCRIBE_LOOKUP_MESSAGES = 20

/**
 * Gmail budgets roughly 250 quota units per second per user, and messages.get
 * costs 5. Eight in flight leaves room for the mutations a user triggers while
 * a scan is still running.
 */
const FETCH_CONCURRENCY = 8
const MUTATION_CONCURRENCY = 8

export interface MessageHeader {
  name: string
  value: string
}

export interface ParsedMessage {
  id: string
  /** Unix milliseconds; 0 when Gmail reported no internalDate. */
  receivedAt: number
  sizeBytes: number
  /** Still carries the INBOX label, so archiving it would actually do something. */
  inInbox: boolean
  headers: MessageHeader[]
}

/**
 * The client only ever carries an access token. Refreshing is NextAuth's job
 * (see lib/auth.ts), so there is no client secret here and nothing to leak.
 */
function getGmailClient(accessToken: string): gmail_v1.Gmail {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

/* -------------------------------------------------------------------------- */
/* Header parsing — pure functions, covered by lib/gmail.test.ts               */
/* -------------------------------------------------------------------------- */

/** Drop the nulls googleapis allows in its header type and keep real pairs. */
export function normalizeHeaders(
  headers: gmail_v1.Schema$MessagePartHeader[] | null | undefined,
): MessageHeader[] {
  if (!headers) return []
  const out: MessageHeader[] = []
  for (const header of headers) {
    if (typeof header.name === 'string' && typeof header.value === 'string') {
      out.push({ name: header.name, value: header.value })
    }
  }
  return out
}

export function parseEmailHeader(headers: MessageHeader[], headerName: string): string {
  const target = headerName.toLowerCase()
  const header = headers.find((h) => h.name.toLowerCase() === target)
  return header?.value ?? ''
}

/** `"Canva" <marketing@canva.com>` -> `marketing@canva.com` (lowercased). */
export function extractEmailFromHeader(headerValue: string): string {
  const angled = headerValue.match(/<([^<>]+)>/)
  const candidate = angled ? angled[1] : headerValue.trim().split(/\s+/).pop() ?? ''
  return candidate.trim().toLowerCase()
}

/** `"Canva" <marketing@canva.com>` -> `Canva`; falls back to the address. */
export function extractNameFromHeader(headerValue: string): string {
  const beforeAngle = headerValue.match(/^\s*(.+?)\s*</)
  const raw = beforeAngle ? beforeAngle[1] : headerValue.split('<')[0]
  const cleaned = raw.trim().replace(/^["']|["']$/g, '').trim()
  return cleaned || extractEmailFromHeader(headerValue)
}

/**
 * Read RFC 2369 `List-Unsubscribe` together with RFC 8058 `List-Unsubscribe-Post`.
 *
 * The header holds one or more angle-bracketed URIs. An HTTPS link paired with
 * `List-Unsubscribe-Post: List-Unsubscribe=One-Click` must be POSTed, not fetched:
 * a GET is what mail clients issue when pre-fetching images, so many senders
 * deliberately ignore it.
 */
export function parseUnsubscribeHeaders(
  listUnsubscribe: string,
  listUnsubscribePost = '',
): UnsubscribeTarget | null {
  if (!listUnsubscribe.trim()) return null

  const bracketed = Array.from(listUnsubscribe.matchAll(/<([^<>]+)>/g)).map((m) => m[1].trim())
  const candidates = bracketed.length > 0 ? bracketed : [listUnsubscribe.trim()]

  const httpUrl = candidates.find((value) => /^https?:\/\//i.test(value))
  if (httpUrl) {
    return {
      kind: 'http',
      url: httpUrl,
      oneClick: /list-unsubscribe\s*=\s*one-click/i.test(listUnsubscribePost),
    }
  }

  const mailto = candidates.find((value) => /^mailto:/i.test(value))
  if (mailto) {
    const [address, query] = mailto.slice('mailto:'.length).split('?')
    if (!address) return null
    const subject = query ? new URLSearchParams(query).get('subject') ?? undefined : undefined
    return { kind: 'mailto', address: address.trim(), subject }
  }

  return null
}

/** Prefer a one-click endpoint, then any web link, then a mailto. */
function preferredTarget(
  a: UnsubscribeTarget | null,
  b: UnsubscribeTarget | null,
): UnsubscribeTarget | null {
  const rank = (t: UnsubscribeTarget | null) =>
    t === null ? 0 : t.kind === 'mailto' ? 1 : t.oneClick ? 3 : 2
  return rank(b) > rank(a) ? b : a
}

/**
 * Collapse messages into one row per sender.
 *
 * `lastReceived` is the newest message's date, not whichever message happened to
 * be processed last, and a sender keeps the best unsubscribe target found across
 * all of their mail rather than only the first message's.
 */
export function groupMessagesBySender(messages: ParsedMessage[]): EmailSender[] {
  interface Accumulator {
    email: string
    name: string
    emailCount: number
    receivedAt: number
    sizeBytes: number
    inboxSizeBytes: number
    messages: Array<{ id: string; receivedAt: number; inInbox: boolean }>
    unsubscribe: UnsubscribeTarget | null
  }

  const bySender = new Map<string, Accumulator>()

  for (const message of messages) {
    const from = parseEmailHeader(message.headers, 'From')
    const email = extractEmailFromHeader(from)
    if (!email) continue

    const target = parseUnsubscribeHeaders(
      parseEmailHeader(message.headers, 'List-Unsubscribe'),
      parseEmailHeader(message.headers, 'List-Unsubscribe-Post'),
    )

    const existing = bySender.get(email)

    if (existing) {
      existing.emailCount += 1
      existing.sizeBytes += message.sizeBytes
      if (message.inInbox) existing.inboxSizeBytes += message.sizeBytes
      existing.messages.push({
        id: message.id,
        receivedAt: message.receivedAt,
        inInbox: message.inInbox,
      })
      existing.unsubscribe = preferredTarget(existing.unsubscribe, target)
      if (message.receivedAt > existing.receivedAt) {
        existing.receivedAt = message.receivedAt
        // Senders rename themselves; the most recent display name is the useful one.
        existing.name = extractNameFromHeader(from) || existing.name
      }
      continue
    }

    bySender.set(email, {
      email,
      name: extractNameFromHeader(from) || email,
      emailCount: 1,
      receivedAt: message.receivedAt,
      sizeBytes: message.sizeBytes,
      inboxSizeBytes: message.inInbox ? message.sizeBytes : 0,
      messages: [{ id: message.id, receivedAt: message.receivedAt, inInbox: message.inInbox }],
      unsubscribe: target,
    })
  }

  return Array.from(bySender.values())
    .map((sender) => {
      const newestFirst = [...sender.messages].sort((a, b) => b.receivedAt - a.receivedAt)
      const inboxMessages = newestFirst.filter((m) => m.inInbox)

      return {
        email: sender.email,
        name: sender.name,
        emailCount: sender.emailCount,
        lastReceived: new Date(sender.receivedAt).toISOString(),
        messageIds: newestFirst.map((m) => m.id),
        sizeBytes: sender.sizeBytes,
        inboxMessageIds: inboxMessages.map((m) => m.id),
        inboxCount: inboxMessages.length,
        inboxSizeBytes: sender.inboxSizeBytes,
        // inboxMessages is already newest-first; fall back to the unscoped date
        // when nothing is left in the inbox.
        inboxLastReceived: new Date(
          inboxMessages[0]?.receivedAt ?? sender.receivedAt,
        ).toISOString(),
        unsubscribe: sender.unsubscribe,
      }
    })
    .sort((a, b) => b.emailCount - a.emailCount || a.name.localeCompare(b.name))
}

/* -------------------------------------------------------------------------- */
/* Gmail calls                                                                */
/* -------------------------------------------------------------------------- */

/** Page through message ids until we hit `limit` or run out of mail. */
async function listMessageIds(
  gmail: gmail_v1.Gmail,
  limit: number,
): Promise<{ ids: string[]; truncated: boolean; estimate: number }> {
  const ids: string[] = []
  let pageToken: string | undefined
  let estimate = 0

  do {
    const remaining = limit - ids.length
    const response = await withRetry(() =>
      gmail.users.messages.list({
        userId: 'me',
        q: GMAIL_QUERY,
        maxResults: Math.min(LIST_PAGE_SIZE, remaining),
        pageToken,
      }),
    )

    // Gmail reports this on every page; the first one covers the whole query.
    if (estimate === 0) estimate = response.data.resultSizeEstimate ?? 0

    for (const message of response.data.messages ?? []) {
      if (message.id) ids.push(message.id)
    }

    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken && ids.length < limit)

  return { ids, truncated: Boolean(pageToken), estimate }
}

/** One quota unit: how much promotional mail is actually in the inbox. */
async function estimateInboxTotal(gmail: gmail_v1.Gmail): Promise<number> {
  try {
    const response = await withRetry(() =>
      gmail.users.messages.list({ userId: 'me', q: `in:inbox ${GMAIL_QUERY}`, maxResults: 1 }),
    )
    return response.data.resultSizeEstimate ?? 0
  } catch (error) {
    // A missing estimate degrades the coverage notice, not the scan.
    console.error('Could not estimate the inbox total:', error)
    return 0
  }
}

/**
 * Scan the promotions category and group it by sender.
 *
 * `limit` bounds the work: a scan costs about 5 quota units per message, so an
 * unbounded mailbox walk would exhaust the user's per-minute budget and start
 * failing halfway through with a partial result the UI would report as fact.
 */
export async function scanPromotionalEmails(
  accessToken: string,
  limit: number = DEFAULT_SCAN_LIMIT,
): Promise<PromotionalSummary> {
  const gmail = getGmailClient(accessToken)
  const bounded = Math.max(1, Math.min(Math.floor(limit) || DEFAULT_SCAN_LIMIT, MAX_SCAN_LIMIT))

  const [{ ids, truncated, estimate }, inboxEstimate] = await Promise.all([
    listMessageIds(gmail, bounded),
    estimateInboxTotal(gmail),
  ])

  const parsed = await mapWithConcurrency(ids, FETCH_CONCURRENCY, async (id) => {
    const response = await withRetry(() =>
      gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: METADATA_HEADERS,
      }),
    )

    const message: ParsedMessage = {
      id: response.data.id ?? id,
      receivedAt: Number.parseInt(response.data.internalDate ?? '', 10) || 0,
      sizeBytes: response.data.sizeEstimate ?? 0,
      inInbox: (response.data.labelIds ?? []).includes('INBOX'),
      headers: normalizeHeaders(response.data.payload?.headers),
    }
    return message
  })

  const senders = groupMessagesBySender(parsed)

  const inbox = parsed.filter((message) => message.inInbox)

  return {
    senders,
    totalEmails: parsed.length,
    totalSenders: senders.length,
    totalSizeBytes: parsed.reduce((sum, message) => sum + message.sizeBytes, 0),
    inboxEmails: inbox.length,
    inboxSizeBytes: inbox.reduce((sum, message) => sum + message.sizeBytes, 0),
    totalEstimate: estimate,
    inboxEstimate,
    truncated,
  }
}

function assertActionable(messageIds: string[]): string[] {
  const unique = Array.from(new Set(messageIds))
  if (unique.length > MAX_MESSAGES_PER_ACTION) {
    throw new Error(`Too many messages in one request (max ${MAX_MESSAGES_PER_ACTION})`)
  }
  return unique
}

/** Remove or restore the INBOX label. batchModify handles 1000 ids for 50 quota units. */
async function modifyLabels(
  accessToken: string,
  messageIds: string[],
  body: { addLabelIds?: string[]; removeLabelIds?: string[] },
): Promise<number> {
  const ids = assertActionable(messageIds)
  if (ids.length === 0) return 0

  const gmail = getGmailClient(accessToken)

  for (const batch of chunk(ids, BATCH_MODIFY_SIZE)) {
    await withRetry(() =>
      gmail.users.messages.batchModify({ userId: 'me', requestBody: { ids: batch, ...body } }),
    )
  }

  return ids.length
}

export function archiveMessages(accessToken: string, messageIds: string[]): Promise<number> {
  return modifyLabels(accessToken, messageIds, { removeLabelIds: ['INBOX'] })
}

export function unarchiveMessages(accessToken: string, messageIds: string[]): Promise<number> {
  return modifyLabels(accessToken, messageIds, { addLabelIds: ['INBOX'] })
}

export interface PerMessageResult {
  /** Ids that actually changed — what an undo should be offered for. */
  succeeded: string[]
  failed: number
}

/**
 * Gmail has no batch trash endpoint, so these go one at a time under a
 * concurrency cap.
 *
 * Per-message failures are collected rather than thrown. One stale id in a
 * selection of 200 should not make the whole request report failure while the
 * other 199 are trashed anyway — and the caller needs to know which ids moved
 * so undo targets exactly those.
 */
async function trashEach(
  accessToken: string,
  messageIds: string[],
  operation: 'trash' | 'untrash',
): Promise<PerMessageResult> {
  const ids = assertActionable(messageIds)
  if (ids.length === 0) return { succeeded: [], failed: 0 }

  const gmail = getGmailClient(accessToken)

  const outcomes = await mapWithConcurrency(ids, MUTATION_CONCURRENCY, async (id) => {
    try {
      await withRetry(() => gmail.users.messages[operation]({ userId: 'me', id }))
      return id
    } catch (error) {
      console.error(`Failed to ${operation} message ${id}:`, error)
      return null
    }
  })

  const succeeded = outcomes.filter((id): id is string => id !== null)
  return { succeeded, failed: ids.length - succeeded.length }
}

export function trashMessages(accessToken: string, messageIds: string[]): Promise<PerMessageResult> {
  return trashEach(accessToken, messageIds, 'trash')
}

export function untrashMessages(
  accessToken: string,
  messageIds: string[],
): Promise<PerMessageResult> {
  return trashEach(accessToken, messageIds, 'untrash')
}

/** Conservative check before an address is interpolated into a Gmail search query. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s<>@"]+@[^\s<>@"]+\.[^\s<>@".]+$/.test(value)
}

/**
 * Find the unsubscribe target for a sender by reading the headers of that
 * sender's own recent mail.
 *
 * The client passes an address, never a URL. Anything the server is about to
 * request has to have arrived in this user's mailbox first — otherwise the
 * endpoint is an open proxy into whatever the deployment can reach.
 */
export async function findUnsubscribeTarget(
  accessToken: string,
  senderEmail: string,
): Promise<UnsubscribeTarget | null> {
  if (!isPlausibleEmail(senderEmail)) {
    throw new Error('Invalid sender address')
  }

  const gmail = getGmailClient(accessToken)

  const list = await withRetry(() =>
    gmail.users.messages.list({
      userId: 'me',
      // Scoped the same way as the scan. The privacy policy discloses reading
      // promotional mail only, and a bare `from:` search would quietly reach
      // the whole mailbox. Every sender the UI can ask about came out of this
      // same scan, so their mail matches.
      q: `from:"${senderEmail}" ${GMAIL_QUERY}`,
      maxResults: UNSUBSCRIBE_LOOKUP_MESSAGES,
    }),
  )

  // Rank across the sender's messages, the same way the scan does. Returning
  // the first target found made the lookup disagree with the badge the UI had
  // already shown: a sender advertised as one-click would unsubscribe by
  // whatever its newest message happened to carry — often a mailto.
  //
  // The windows still differ: the scan ranks across everything it saw, this
  // reads the newest UNSUBSCRIBE_LOOKUP_MESSAGES. A sender who publishes
  // one-click only on much older mail can therefore resolve to a lesser target
  // here — which the route reports honestly rather than claiming success.
  let best: UnsubscribeTarget | null = null

  for (const ref of list.data.messages ?? []) {
    if (!ref.id) continue

    const response = await withRetry(() =>
      gmail.users.messages.get({
        userId: 'me',
        id: ref.id as string,
        format: 'metadata',
        metadataHeaders: ['List-Unsubscribe', 'List-Unsubscribe-Post'],
      }),
    )

    const headers = normalizeHeaders(response.data.payload?.headers)
    const target = parseUnsubscribeHeaders(
      parseEmailHeader(headers, 'List-Unsubscribe'),
      parseEmailHeader(headers, 'List-Unsubscribe-Post'),
    )

    best = preferredTarget(best, target)

    // Nothing outranks one-click, so stop paying for reads once we have it.
    if (best && best.kind === 'http' && best.oneClick) return best
  }

  return best
}
