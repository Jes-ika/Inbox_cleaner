'use client'

import { STORAGE_KEYS } from '@/utils/constants'
import type { CleanupAction, UnsubscribeRecord } from '@/types'

const MAX_ENTRIES = 50

/**
 * A small activity log in localStorage.
 *
 * Every accessor is guarded: storage throws in private windows and when site
 * data is blocked, and a thrown read here would take a whole screen down.
 */
function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function write<T>(key: string, entries: T[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // Storage unavailable or full — the log is a convenience, not a record of truth.
  }
}

export function recordCleanup(action: CleanupAction): void {
  write(STORAGE_KEYS.CLEANUP_HISTORY, [action, ...read<CleanupAction>(STORAGE_KEYS.CLEANUP_HISTORY)])
}

export function getCleanupHistory(): CleanupAction[] {
  return read<CleanupAction>(STORAGE_KEYS.CLEANUP_HISTORY)
}

export function recordUnsubscribe(record: UnsubscribeRecord): void {
  write(STORAGE_KEYS.UNSUBSCRIBE_HISTORY, [
    record,
    ...read<UnsubscribeRecord>(STORAGE_KEYS.UNSUBSCRIBE_HISTORY),
  ])
}

export function getUnsubscribeHistory(): UnsubscribeRecord[] {
  return read<UnsubscribeRecord>(STORAGE_KEYS.UNSUBSCRIBE_HISTORY)
}

/** Remove everything this app has written to the browser. */
export function clearLocalData(): void {
  if (typeof window === 'undefined') return
  try {
    for (const key of Object.values(STORAGE_KEYS)) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Nothing to clear if storage is unreachable.
  }
}
