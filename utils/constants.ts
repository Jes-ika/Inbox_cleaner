export const APP_NAME = 'InboxClean'
export const APP_DESCRIPTION = 'Bulk inbox cleanup and newsletter management for Gmail'

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  SUBSCRIPTIONS: '/subscriptions',
  CLEANUP: '/cleanup',
  SETTINGS: '/settings',
}

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
]

export const GMAIL_QUERY = 'category:promotions'

export const STORAGE_KEYS = {
  USER: 'inboxclean_user',
  EMAILS: 'inboxclean_emails',
  SENDERS: 'inboxclean_senders',
  CLEANUP_HISTORY: 'inboxclean_cleanup_history',
  UNSUBSCRIBE_HISTORY: 'inboxclean_unsubscribe_history',
}
