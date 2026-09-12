'use client'

import { Archive, RefreshCw, Trash2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { SenderToolbar } from '@/components/senders/SenderToolbar'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { usePromotionalEmails } from '@/hooks/usePromotionalEmails'
import { useSenderView } from '@/hooks/useSenderView'
import { apiFetch } from '@/lib/api-client'
import { formatBytes, formatCount, formatRelativeTime } from '@/lib/format'
import { recordCleanup } from '@/lib/history'
import { UNDO_WINDOW_MS } from '@/utils/constants'
import type { CleanupActionKind } from '@/types'

function CleanupContent() {
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  const { senders, isLoading, error, reload, removeMessages } = usePromotionalEmails(isAuthenticated)
  const { toast } = useToast()

  const view = useSenderView(senders)
  const [selected, setSelected] = useState<string[]>([])
  const [action, setAction] = useState<CleanupActionKind | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Arriving from a "Clean up" link on the Subscriptions page.
  const senderParam = searchParams.get('sender')
  useEffect(() => {
    if (senderParam) view.setQuery(senderParam)
    // Only when the link changes; the user is free to edit the filter afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senderParam])

  const visibleEmails = view.visible.map((sender) => sender.email)
  const allVisibleSelected =
    visibleEmails.length > 0 && visibleEmails.every((email) => selected.includes(email))

  const selectedSenders = senders.filter((sender) => selected.includes(sender.email))
  const selectedMessageIds = selectedSenders.flatMap((sender) => sender.messageIds)
  const selectedCount = selectedMessageIds.length

  const toggle = (email: string) =>
    setSelected((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    )

  const undo = async (kind: CleanupActionKind, messageIds: string[]) => {
    try {
      await apiFetch<{ restoredCount: number }>('/api/emails/undo', {
        method: 'POST',
        body: JSON.stringify({ kind, messageIds }),
      })
      toast({
        title: kind === 'trash' ? 'Restored from trash' : 'Back in your inbox',
        description: `${formatCount(messageIds.length)} messages returned.`,
        variant: 'success',
      })
      await reload()
    } catch (undoError) {
      toast({
        title: 'Could not undo',
        description: undoError instanceof Error ? undoError.message : 'Try again from Gmail.',
        variant: 'error',
      })
    }
  }

  const runCleanup = async () => {
    if (!action) return

    const kind = action
    const messageIds = [...selectedMessageIds]
    const senderEmails = [...selected]

    setIsProcessing(true)
    try {
      await apiFetch<Record<string, unknown>>(
        kind === 'trash' ? '/api/emails/trash' : '/api/emails/archive',
        { method: 'POST', body: JSON.stringify({ messageIds }) },
      )

      recordCleanup({
        kind,
        messageIds,
        senderEmails,
        timestamp: new Date().toISOString(),
      })

      // Drop them from the view rather than paying for a full rescan.
      removeMessages(messageIds)
      setSelected([])
      setAction(null)

      toast({
        title: kind === 'trash' ? 'Moved to trash' : 'Archived',
        description: `${formatCount(messageIds.length)} messages from ${formatCount(senderEmails.length)} sender${senderEmails.length === 1 ? '' : 's'}.`,
        variant: 'success',
        durationMs: UNDO_WINDOW_MS,
        action: { label: 'Undo', onClick: () => undo(kind, messageIds) },
      })
    } catch (cleanupError) {
      toast({
        title: kind === 'trash' ? 'Could not trash those messages' : 'Could not archive those messages',
        description: cleanupError instanceof Error ? cleanupError.message : 'Nothing was changed.',
        variant: 'error',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AppShell
      title="Cleanup"
      actions={
        <Button variant="secondary" size="sm" onClick={reload} isLoading={isLoading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Rescan
        </Button>
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {isLoading && senders.length === 0
                  ? 'Loading senders…'
                  : `${formatCount(view.visible.length)} sender${view.visible.length === 1 ? '' : 's'}`}
                {view.isFiltered && senders.length > 0 ? (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    of {formatCount(senders.length)}
                  </span>
                ) : null}
              </h2>
              {selected.length > 0 ? (
                <span className="text-sm text-gray-600">
                  {selected.length} selected · {formatCount(selectedCount)} emails
                </span>
              ) : null}
            </div>

            <SenderToolbar
              idPrefix="cleanup"
              query={view.query}
              onQueryChange={view.setQuery}
              sort={view.sort}
              onSortChange={view.setSort}
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && senders.length === 0 ? (
            <p className="py-10 text-center text-gray-600">
              <Spinner className="mr-2 inline h-4 w-4" />
              Reading your promotions category…
            </p>
          ) : view.visible.length === 0 ? (
            <p className="py-10 text-center text-gray-600">
              {senders.length === 0
                ? 'Nothing left to clean up.'
                : 'No senders match this filter.'}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() => setSelected(allVisibleSelected ? [] : visibleEmails)}
                  aria-label="Select all listed senders"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">Sender</div>
                <div className="hidden w-20 text-right sm:block">Emails</div>
                <div className="hidden w-20 text-right sm:block">Size</div>
                <div className="hidden w-32 text-right md:block">Last received</div>
              </div>

              <ul className="space-y-2">
                {view.visible.map((sender) => (
                  <li
                    key={sender.email}
                    className="flex items-center gap-4 rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(sender.email)}
                      onChange={() => toggle(sender.email)}
                      aria-label={`Select ${sender.name}`}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{sender.name}</p>
                      <p className="truncate text-sm text-gray-600">{sender.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 sm:hidden">
                        <span>{formatCount(sender.emailCount)} emails</span>
                        <span>{formatBytes(sender.sizeBytes)}</span>
                        <span>{formatRelativeTime(sender.lastReceived)}</span>
                      </div>
                    </div>

                    <div className="hidden w-20 flex-none text-right font-medium tabular-nums text-gray-900 sm:block">
                      {formatCount(sender.emailCount)}
                    </div>
                    <div className="hidden w-20 flex-none text-right text-sm tabular-nums text-gray-600 sm:block">
                      {formatBytes(sender.sizeBytes)}
                    </div>
                    <div className="hidden w-32 flex-none text-right text-sm text-gray-600 md:block">
                      {formatRelativeTime(sender.lastReceived)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-6">
              <Button onClick={() => setAction('trash')} disabled={isProcessing}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Trash {formatCount(selectedCount)} emails
              </Button>
              <Button
                variant="secondary"
                onClick={() => setAction('archive')}
                disabled={isProcessing}
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                Archive {formatCount(selectedCount)} emails
              </Button>
              <Button variant="ghost" onClick={() => setSelected([])} disabled={isProcessing}>
                Clear selection
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Modal
        isOpen={action !== null}
        onClose={() => !isProcessing && setAction(null)}
        title={action === 'trash' ? 'Move to trash?' : 'Archive these emails?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant={action === 'trash' ? 'danger' : 'primary'}
              onClick={() => void runCleanup()}
              isLoading={isProcessing}
            >
              {action === 'trash' ? 'Trash' : 'Archive'} {formatCount(selectedCount)}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-gray-700">
            {formatCount(selectedCount)} emails from {formatCount(selected.length)} sender
            {selected.length === 1 ? '' : 's'}.
          </p>
          <p className="text-sm text-gray-600">
            {action === 'trash'
              ? 'Gmail keeps trashed mail for 30 days, and you can undo this straight away.'
              : 'Archiving only removes the inbox label — the mail stays searchable in All Mail.'}
          </p>
        </div>
      </Modal>
    </AppShell>
  )
}

export default function CleanupPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Cleanup">
          <p className="py-10 text-center text-gray-600">
            <Spinner className="mr-2 inline h-4 w-4" />
            Loading…
          </p>
        </AppShell>
      }
    >
      <CleanupContent />
    </Suspense>
  )
}
