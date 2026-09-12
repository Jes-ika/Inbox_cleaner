import type { DefaultSession } from 'next-auth'

export interface EmailSender {
  /** Lowercased email address; also the stable id used by the UI. */
  email: string
  name: string
  emailCount: number
  /** ISO 8601 — dates cross the API boundary as strings. */
  lastReceived: string
  /** Every message id from this sender, newest first. */
  messageIds: string[]
  /** Total size of this sender's messages in bytes, as reported by Gmail. */
  sizeBytes: number

  /**
   * The subset still carrying the INBOX label — what Cleanup may act on.
   *
   * Archiving a message that is already archived changes nothing, so reporting
   * it would overstate the result, and undoing it would drop long-archived mail
   * back into the inbox.
   */
  inboxMessageIds: string[]
  inboxCount: number
  inboxSizeBytes: number
  /**
   * Newest date within the inbox subset. Cleanup shows and sorts on this, so its
   * dates describe mail it will actually touch; Subscriptions uses the unscoped
   * `lastReceived`, which is right there.
   */
  inboxLastReceived: string

  unsubscribe: UnsubscribeTarget | null
}

export type UnsubscribeTarget =
  | { kind: 'http'; url: string; oneClick: boolean }
  | { kind: 'mailto'; address: string; subject?: string }

export interface PromotionalSummary {
  senders: EmailSender[]
  totalEmails: number
  totalSenders: number
  totalSizeBytes: number
  /** The subset still in the inbox — what Cleanup can actually clear. */
  inboxEmails: number
  inboxSizeBytes: number

  /**
   * Gmail's own approximate totals, one cheap list call each.
   *
   * Needed because the scan window is now the whole Promotions category: a
   * 500-message budget shared with archived mail can yield far fewer inbox
   * messages than it used to, and `truncated` alone cannot say how much of the
   * user's actual inbox was covered.
   */
  totalEstimate: number
  inboxEstimate: number

  /** True when the mailbox holds more messages than this scan covered. */
  truncated: boolean
}

export type CleanupActionKind = 'trash' | 'archive'

export interface CleanupAction {
  kind: CleanupActionKind
  messageIds: string[]
  senderEmails: string[]
  timestamp: string
}

export interface UnsubscribeRecord {
  senderEmail: string
  timestamp: string
  status: UnsubscribeStatus
  detail?: string
}

export type UnsubscribeStatus = 'unsubscribed' | 'manual' | 'unavailable' | 'failed'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & { id: string }
    /** Set when the stored refresh token stopped working; the UI forces re-consent. */
    error?: 'RefreshAccessTokenError'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    /** Unix seconds. */
    expiresAt?: number
    error?: 'RefreshAccessTokenError'
  }
}
