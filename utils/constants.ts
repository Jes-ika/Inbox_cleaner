export const APP_NAME = 'InboxClean'
export const APP_DESCRIPTION = 'Bulk inbox cleanup and newsletter management for Gmail'

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  SUBSCRIPTIONS: '/subscriptions',
  CLEANUP: '/cleanup',
  SETTINGS: '/settings',
  PRIVACY: '/privacy',
  TERMS: '/terms',
} as const

/** Routes that require a session. Kept in sync with middleware.ts. */
export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.SUBSCRIPTIONS,
  ROUTES.CLEANUP,
  ROUTES.SETTINGS,
]

/**
 * gmail.modify covers reading as well as labelling and trashing, so asking for
 * gmail.readonly alongside it adds review surface without adding access.
 */
export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

export const GMAIL_QUERY = 'category:promotions'

/** Upper bound on a single scan, to keep one dashboard load inside Gmail's per-user quota. */
export const DEFAULT_SCAN_LIMIT = 500
export const MAX_SCAN_LIMIT = 2000

/** Gmail rejects oversized batches; this also caps what one request can do. */
export const MAX_MESSAGES_PER_ACTION = 1000

export const STORAGE_KEYS = {
  CLEANUP_HISTORY: 'inboxclean_cleanup_history',
  UNSUBSCRIBE_HISTORY: 'inboxclean_unsubscribe_history',
} as const

/** How long an undo stays offered after a cleanup. */
export const UNDO_WINDOW_MS = 30_000
