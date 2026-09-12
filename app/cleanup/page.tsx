'use client'

import { Archive, RefreshCw, Trash2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { SenderToolbar } from '@/components/senders/SenderToolbar'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { usePromotionalEmails } from '@/hooks/usePromotionalEmails'
import { useSenderView } from '@/hooks/useSenderView'
import { apiFetch } from '@/lib/api-client'
import { formatBytes, formatCount, formatRelativeTime, pluralize } from '@/lib/format'
import { recordCleanup } from '@/lib/history'
import { UNDO_WINDOW_MS } from '@/utils/constants'
import type { CleanupActionKind } from '@/types'

/** How many sender names the confirmation lists before summarising the rest. */
const MODAL_SENDER_PREVIEW = 8

function CleanupContent() {
  const searchParams = useSearchParams()
  const { senders, isLoading, error, reload, removeMessages } = usePromotionalEmails()
  const { toast } = useToast()

  // Cleanup can only act on mail still in the inbox: archiving an already
  // archived message changes nothing, and undoing that would drop long-archived
  // mail back into the inbox. Present each sender by its inbox subset so the
  // counts on screen are exactly what will move.
  const inboxSenders = useMemo(
    () =>
      senders
        .filter((sender) => sender.inboxCount > 0)
        .map((sender) => ({
          ...sender,
          emailCount: sender.inboxCount,
          messageIds: sender.inboxMessageIds,
          sizeBytes: sender.inboxSizeBytes,
        })),
    [senders],
  )

  const view = useSenderView(inboxSenders)
  const [selected, setSelected] = useState<string[]>([])

  // Arrived from a Subscriptions "Clean up" link for a sender whose mail is all
  // archived: "no senders match this filter" would be true but unhelpful.
  const linkedSender = searchParams.get('sender')
  const linkedSenderIsArchived = Boolean(
    linkedSender &&
      senders.some((sender) => sender.email === linkedSender && sender.inboxCount === 0),
  )
  const [action, setAction] = useState<CleanupActionKind | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Arriving from a "Clean up" link on the Subscriptions page.
  useEffect(() => {
    if (linkedSender) view.setQuery(linkedSender)
    // Only when the link changes; the user is free to edit the filter afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedSender])

  const visibleEmails = view.visible.map((sender) => sender.email)
  const allVisibleSelected =
    visibleEmails.length > 0 && visibleEmails.every((email) => selected.includes(email))

  // Act on the intersection of "selected" and "currently listed", not on the
  // raw `selected` array. Two reasons: after a cleanup an email can linger in
  // `selected` with no messages behind it, and a selection made before the
  // filter was typed would otherwise let a destructive button act on senders
  // that are no longer on screen. What you can see is what moves.
  const selectedSenders = view.visible.filter((sender) => selected.includes(sender.email))
  const selectedMessageIds = selectedSenders.flatMap((sender) => sender.messageIds)
  const selectedCount = selectedMessageIds.length
  const selectedSenderCount = selectedSenders.length
  const canAct = selectedCount > 0 && !isProcessing

  const toggle = (email: string) =>
    setSelected((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    )

  const undo = async (kind: CleanupActionKind, messageIds: string[]) => {
    try {
      // Report what the server actually restored, not what we asked for. A
      // partial untrash would otherwise show a green "3 messages returned"
      // while two of them sat in Trash awaiting the 30-day purge.
      const { restoredCount, failed = 0 } = await apiFetch<{
        restoredCount: number
        failed?: number
      }>('/api/emails/undo', {
        method: 'POST',
        body: JSON.stringify({ kind, messageIds }),
      })
      toast({
        title: kind === 'trash' ? 'Restored from trash' : 'Back in your inbox',
        description: [
          `${pluralize(restoredCount, 'message')} returned.`,
          failed > 0 ? `${pluralize(failed, 'message')} could not be restored.` : null,
        ]
          .filter(Boolean)
          .join(' '),
        variant: failed > 0 ? 'info' : 'success',
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
    // Only senders that still have mail behind them, so the count cannot overstate.
    const senderEmails = selectedSenders.map((sender) => sender.email)

    setIsProcessing(true)
    try {
      const result = await apiFetch<{ messageIds?: string[]; failed?: number }>(
        kind === 'trash' ? '/api/emails/trash' : '/api/emails/archive',
        { method: 'POST', body: JSON.stringify({ messageIds }) },
      )

      // Trust the server's list over our own: a partial trash reports only the
      // ids that actually moved, and undo must target exactly those.
      const changed = result.messageIds ?? messageIds
      const failed = result.failed ?? 0

      recordCleanup({
        kind,
        messageIds: changed,
        senderEmails,
        timestamp: new Date().toISOString(),
      })

      // Drop them from the view rather than paying for a full rescan.
      removeMessages(changed)
      setSelected([])
      setAction(null)

      toast({
        title: kind === 'trash' ? 'Moved to trash' : 'Archived',
        description: [
          `${pluralize(changed.length, 'message')} from ${pluralize(senderEmails.length, 'sender')}.`,
          failed > 0 ? `${pluralize(failed, 'message')} could not be moved.` : null,
        ]
          .filter(Boolean)
          .join(' '),
        variant: failed > 0 ? 'info' : 'success',
        durationMs: UNDO_WINDOW_MS,
        action: { label: 'Undo', onClick: () => undo(kind, changed) },
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
                  : pluralize(view.visible.length, 'sender')}
                {view.isFiltered && inboxSenders.length > 0 ? (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    of {formatCount(inboxSenders.length)}
                  </span>
                ) : null}
              </h2>
              {selectedCount > 0 ? (
                <span className="text-sm text-gray-600">
                  {pluralize(selectedSenderCount, 'sender')} selected ·{' '}
                  {pluralize(selectedCount, 'email')}
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
              Reading your promotional mail…
            </p>
          ) : view.visible.length === 0 ? (
            <p className="py-10 text-center text-gray-600">
              {inboxSenders.length === 0
                ? senders.length === 0
                  ? 'Nothing left to clean up.'
                  : 'No promotional mail left in your inbox — the rest is already archived.'
                : linkedSenderIsArchived
                  ? 'That sender has no mail left in your inbox, so there is nothing to clean up. You can still unsubscribe from them.'
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

          {selectedCount > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-6">
              <Button onClick={() => setAction('trash')} disabled={!canAct}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Trash {pluralize(selectedCount, 'email')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setAction('archive')}
                disabled={!canAct}
              >
                <Archive className="h-4 w-4" aria-hidden="true" />
                Archive {pluralize(selectedCount, 'email')}
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
              disabled={selectedCount === 0}
            >
              {action === 'trash' ? 'Trash' : 'Archive'} {formatCount(selectedCount)}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-gray-700">
            {pluralize(selectedCount, 'email')} from {pluralize(selectedSenderCount, 'sender')}.
          </p>

          {/* Name them. A bare count gives no way to catch a mis-click before
              it moves a few hundred messages. */}
          <ul className="max-h-40 overflow-y-auto rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {selectedSenders.slice(0, MODAL_SENDER_PREVIEW).map((sender) => (
              <li key={sender.email} className="flex justify-between gap-3 py-0.5">
                <span className="truncate">{sender.name}</span>
                <span className="flex-none tabular-nums text-gray-500">
                  {formatCount(sender.emailCount)}
                </span>
              </li>
            ))}
            {selectedSenders.length > MODAL_SENDER_PREVIEW ? (
              <li className="pt-1 text-gray-500">
                and {formatCount(selectedSenders.length - MODAL_SENDER_PREVIEW)} more
              </li>
            ) : null}
          </ul>

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
