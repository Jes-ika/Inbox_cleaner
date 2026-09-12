'use client'

import { useMemo, useState } from 'react'
import type { EmailSender } from '@/types'

export type SortKey = 'count' | 'recent' | 'oldest' | 'size' | 'name'

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'count', label: 'Most emails' },
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'size', label: 'Largest' },
  { value: 'name', label: 'Name (A–Z)' },
]

/** Search and sort state for a sender list — what the Filter and Sort buttons promised. */
export function useSenderView(senders: EmailSender[], options?: { unsubscribableOnly?: boolean }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('count')
  const [onlyUnsubscribable, setOnlyUnsubscribable] = useState(false)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = senders.filter((sender) => {
      if (options?.unsubscribableOnly && onlyUnsubscribable && !sender.unsubscribe) return false
      if (!needle) return true
      return (
        sender.name.toLowerCase().includes(needle) || sender.email.toLowerCase().includes(needle)
      )
    })

    const byDate = (sender: EmailSender) => Date.parse(sender.lastReceived) || 0

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'recent':
          return byDate(b) - byDate(a)
        case 'oldest':
          return byDate(a) - byDate(b)
        case 'size':
          return b.sizeBytes - a.sizeBytes
        case 'name':
          return a.name.localeCompare(b.name)
        case 'count':
        default:
          return b.emailCount - a.emailCount
      }
    })
  }, [senders, query, sort, onlyUnsubscribable, options?.unsubscribableOnly])

  return {
    query,
    setQuery,
    sort,
    setSort,
    onlyUnsubscribable,
    setOnlyUnsubscribable,
    visible,
    isFiltered: query.trim().length > 0 || onlyUnsubscribable,
  }
}
