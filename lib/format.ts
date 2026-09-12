const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Human relative time for a date that crossed the API boundary as a string.
 *
 * Deliberately not Intl.RelativeTimeFormat with a live clock: these render
 * during hydration, and a value that differs between server and client markup
 * produces a hydration warning on every row.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const timestamp = Date.parse(iso)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'unknown'

  const elapsed = now - timestamp
  if (elapsed < 0) return 'just now'
  if (elapsed < MINUTE) return 'just now'

  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  const days = Math.floor(elapsed / DAY)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`

  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  const decimals = exponent === 0 || value >= 100 ? 0 : 1

  return `${value.toFixed(decimals)} ${UNITS[exponent]}`
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}
