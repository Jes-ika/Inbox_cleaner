import type { DefaultSession } from 'next-auth'

export interface EmailSender {
  /** Lowercased email address; also the stable id used by the UI. */
  email: string
  name: string
  emailCount: number
  /** ISO 8601 — dates cross the API boundary as strings. */
  lastReceived: string
  /** Message ids belonging to this sender, newest first. */
  messageIds: string[]
  /** Total size of this sender's messages in bytes, as reported by Gmail. */
  sizeBytes: number
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
