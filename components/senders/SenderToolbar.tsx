'use client'

import { Search } from 'lucide-react'
import { SORT_OPTIONS, type SortKey } from '@/hooks/useSenderView'

interface SenderToolbarProps {
  idPrefix: string
  query: string
  onQueryChange: (value: string) => void
  sort: SortKey
  onSortChange: (value: SortKey) => void
  /** Rendered only when the screen offers the unsubscribe filter. */
  onlyUnsubscribable?: boolean
  onOnlyUnsubscribableChange?: (value: boolean) => void
}

export function SenderToolbar({
  idPrefix,
  query,
  onQueryChange,
  sort,
  onSortChange,
  onlyUnsubscribable,
  onOnlyUnsubscribableChange,
}: SenderToolbarProps) {
  const searchId = `${idPrefix}-search`
  const sortId = `${idPrefix}-sort`
  const filterId = `${idPrefix}-unsubscribable`

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <label htmlFor={searchId} className="mb-1 block text-xs font-medium text-gray-600">
          Filter by sender
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Name or address"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor={sortId} className="mb-1 block text-xs font-medium text-gray-600">
          Sort by
        </label>
        <select
          id={sortId}
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortKey)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {onOnlyUnsubscribableChange ? (
        <label htmlFor={filterId} className="flex items-center gap-2 py-2 text-sm text-gray-700">
          <input
            id={filterId}
            type="checkbox"
            checked={Boolean(onlyUnsubscribable)}
            onChange={(event) => onOnlyUnsubscribableChange(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Only senders with an unsubscribe link
        </label>
      ) : null}
    </div>
  )
}
