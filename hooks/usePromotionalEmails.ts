'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import type { EmailSender, PromotionalSummary } from '@/types'

interface State {
  summary: PromotionalSummary | null
  isLoading: boolean
  error: string | null
}

/**
 * Load the promotional-mail scan once per mount and expose the pieces every
 * screen needs. Dashboard, Subscriptions and Cleanup all read the same shape.
 */
export function usePromotionalEmails(enabled: boolean) {
  const [state, setState] = useState<State>({ summary: null, isLoading: enabled, error: null })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const summary = await apiFetch<PromotionalSummary>('/api/emails/promotional')
      setState({ summary, isLoading: false, error: null })
    } catch (error) {
      setState({
        summary: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Could not load your mail.',
      })
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setState({ summary: null, isLoading: false, error: null })
      return
    }

    let active = true
    // React 18 strict mode mounts effects twice in development; the flag keeps
    // the second pass from writing state from a stale request.
    void (async () => {
      try {
        const summary = await apiFetch<PromotionalSummary>('/api/emails/promotional')
        if (active) setState({ summary, isLoading: false, error: null })
      } catch (error) {
        if (active) {
          setState({
            summary: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Could not load your mail.',
          })
        }
      }
    })()

    return () => {
      active = false
    }
  }, [enabled])

  /** Drop senders whose mail we just acted on, without a full re-scan. */
  const removeMessages = useCallback((messageIds: string[]) => {
    const removed = new Set(messageIds)

    setState((prev) => {
      if (!prev.summary) return prev

      const senders: EmailSender[] = []
      let totalEmails = 0
      let totalSizeBytes = 0

      for (const sender of prev.summary.senders) {
        const keptIds = sender.messageIds.filter((id) => !removed.has(id))
        if (keptIds.length === 0) continue

        const ratio = keptIds.length / sender.messageIds.length
        const sizeBytes = Math.round(sender.sizeBytes * ratio)

        senders.push({ ...sender, messageIds: keptIds, emailCount: keptIds.length, sizeBytes })
        totalEmails += keptIds.length
        totalSizeBytes += sizeBytes
      }

      return {
        ...prev,
        summary: {
          ...prev.summary,
          senders,
          totalEmails,
          totalSenders: senders.length,
          totalSizeBytes,
        },
      }
    })
  }, [])

  return {
    summary: state.summary,
    senders: state.summary?.senders ?? [],
    isLoading: state.isLoading,
    error: state.error,
    reload: load,
    removeMessages,
  }
}
