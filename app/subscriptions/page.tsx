'use client'

import { AlertTriangle, CheckCircle2, ExternalLink, MailX, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { SenderToolbar } from '@/components/senders/SenderToolbar'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { usePromotionalEmails } from '@/hooks/usePromotionalEmails'
import { useSenderView } from '@/hooks/useSenderView'
import { apiFetch } from '@/lib/api-client'
import { formatCount, formatRelativeTime } from '@/lib/format'
import { recordUnsubscribe } from '@/lib/history'
import { ROUTES } from '@/utils/constants'
import type { UnsubscribeStatus } from '@/types'

interface UnsubscribeOutcome {
  status: UnsubscribeStatus
  message: string
  actionUrl?: string
}

const OUTCOME_STYLES: Record<UnsubscribeStatus, { icon: typeof CheckCircle2; className: string }> = {
  unsubscribed: { icon: CheckCircle2, className: 'text-green-700' },
  manual: { icon: ExternalLink, className: 'text-amber-700' },
  unavailable: { icon: MailX, className: 'text-gray-600' },
  failed: { icon: AlertTriangle, className: 'text-red-700' },
}

export default function SubscriptionsPage() {
  const { senders, isLoading, error, reload } = usePromotionalEmails()
  const { toast } = useToast()

  const view = useSenderView(senders, { unsubscribableOnly: true })
  const [selected, setSelected] = useState<string[]>([])
  const [pending, setPending] = useState<string[]>([])
  const [outcomes, setOutcomes] = useState<Record<string, UnsubscribeOutcome>>({})

  const visibleEmails = view.visible.map((sender) => sender.email)
  const allVisibleSelected = visibleEmails.length > 0 && visibleEmails.every((e) => selected.includes(e))

  const toggle = (email: string) =>
    setSelected((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]))

  const toggleAll = () =>
    setSelected(allVisibleSelected ? [] : visibleEmails)

  const unsubscribe = useCallback(
    async (email: string): Promise<UnsubscribeOutcome> => {
      setPending((prev) => [...prev, email])
      try {
        const result = await apiFetch<UnsubscribeOutcome>('/api/emails/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ sender: email }),
        })
        setOutcomes((prev) => ({ ...prev, [email]: result }))
        recordUnsubscribe({
          senderEmail: email,
          timestamp: new Date().toISOString(),
          status: result.status,
          detail: result.message,
        })
        return result
      } catch (requestError) {
        const outcome: UnsubscribeOutcome = {
          status: 'failed',
          message: requestError instanceof Error ? requestError.message : 'Request failed.',
        }
        setOutcomes((prev) => ({ ...prev, [email]: outcome }))
        return outcome
      } finally {
        setPending((prev) => prev.filter((e) => e !== email))
      }
    },
    [],
  )

  const unsubscribeOne = async (email: string) => {
    const result = await unsubscribe(email)
    toast({
      title: result.status === 'unsubscribed' ? 'Unsubscribed' : 'Needs your attention',
      description: result.message,
      variant: result.status === 'unsubscribed' ? 'success' : result.status === 'failed' ? 'error' : 'info',
      action: result.actionUrl
        ? {
            label: 'Open link',
            onClick: () => {
              window.open(result.actionUrl, '_blank', 'noopener')
            },
          }
        : undefined,
      durationMs: result.actionUrl ? 0 : undefined,
    })
  }

  const unsubscribeSelected = async () => {
    const targets = [...selected]

    // Sequential on purpose: these are requests to other people's servers, and a
    // burst of them from one IP is what rate limiting exists to stop.
    const results: UnsubscribeOutcome[] = []
    for (const email of targets) {
      results.push(await unsubscribe(email))
    }

    const done = results.filter((r) => r.status === 'unsubscribed').length
    const needsAction = results.filter((r) => r.status === 'manual').length
    const failed = results.filter((r) => r.status === 'failed' || r.status === 'unavailable').length

    setSelected([])
    toast({
      title: `Unsubscribed from ${done} of ${targets.length}`,
      description: [
        needsAction > 0 ? `${needsAction} need you to finish in the browser` : null,
        failed > 0 ? `${failed} could not be completed` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'All senders accepted the request.',
      variant: done === targets.length ? 'success' : 'info',
    })
  }

  const busy = pending.length > 0

  return (
    <AppShell
      title="Subscriptions"
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
                <span className="text-sm text-gray-600">{selected.length} selected</span>
              ) : null}
            </div>

            <SenderToolbar
              idPrefix="subs"
              query={view.query}
              onQueryChange={view.setQuery}
              sort={view.sort}
              onSortChange={view.setSort}
              onlyUnsubscribable={view.onlyUnsubscribable}
              onOnlyUnsubscribableChange={view.setOnlyUnsubscribable}
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
              {senders.length === 0
                ? 'No promotional senders found.'
                : 'No senders match this filter.'}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  aria-label="Select all listed senders"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">Sender</div>
                <div className="hidden w-20 text-right sm:block">Emails</div>
                <div className="hidden w-32 text-right md:block">Last received</div>
                <div className="w-28" />
              </div>

              <ul className="space-y-2">
                {view.visible.map((sender) => {
                  const outcome = outcomes[sender.email]
                  const isPending = pending.includes(sender.email)
                  const Icon = outcome ? OUTCOME_STYLES[outcome.status].icon : null

                  return (
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
                          <span>{formatRelativeTime(sender.lastReceived)}</span>
                        </div>

                        {outcome && Icon ? (
                          <p
                            className={`mt-1 flex items-start gap-1.5 text-xs ${OUTCOME_STYLES[outcome.status].className}`}
                          >
                            <Icon className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
                            <span>
                              {outcome.message}
                              {outcome.actionUrl ? (
                                <>
                                  {' '}
                                  <a
                                    href={outcome.actionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium underline"
                                  >
                                    Open link
                                  </a>
                                </>
                              ) : null}
                            </span>
                          </p>
                        ) : !sender.unsubscribe ? (
                          <p className="mt-1 text-xs text-gray-500">
                            No unsubscribe link published
                          </p>
                        ) : sender.unsubscribe.kind === 'mailto' ? (
                          <p className="mt-1 text-xs text-gray-500">Unsubscribes by email only</p>
                        ) : sender.unsubscribe.oneClick ? (
                          <p className="mt-1 text-xs text-green-700">Supports one-click</p>
                        ) : null}
                      </div>

                      <div className="hidden w-20 flex-none text-right font-medium tabular-nums text-gray-900 sm:block">
                        {formatCount(sender.emailCount)}
                      </div>
                      <div className="hidden w-32 flex-none text-right text-sm text-gray-600 md:block">
                        {formatRelativeTime(sender.lastReceived)}
                      </div>

                      <div className="flex w-28 flex-none flex-col items-end gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => void unsubscribeOne(sender.email)}
                          isLoading={isPending}
                          disabled={busy || !sender.unsubscribe}
                          title={
                            sender.unsubscribe
                              ? `Unsubscribe from ${sender.name}`
                              : 'This sender publishes no unsubscribe link'
                          }
                        >
                          Unsubscribe
                        </Button>
                        {/* Cleanup only acts on inbox mail, so a sender whose
                            backlog is already archived has nothing to clean and
                            the link would land on an empty filter. */}
                        {sender.inboxCount > 0 ? (
                          <Link
                            href={`${ROUTES.CLEANUP}?sender=${encodeURIComponent(sender.email)}`}
                            className="flex items-center gap-1 rounded text-xs text-gray-600 hover:text-gray-900 hover:underline"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                            Clean up {formatCount(sender.inboxCount)}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">Inbox clear</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {selected.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-6">
              <Button onClick={() => void unsubscribeSelected()} isLoading={busy}>
                Unsubscribe from {selected.length} selected
              </Button>
              <Button variant="ghost" onClick={() => setSelected([])} disabled={busy}>
                Clear selection
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  )
}
