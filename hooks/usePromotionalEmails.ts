'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import type { EmailSender, PromotionalSummary } from '@/types'

interface State {
  summary: PromotionalSummary | null
  isLoading: boolean
  error: string | null
}

/**
 * Load the promotional-mail scan and expose the pieces every screen needs.
 * Dashboard, Subscriptions and Cleanup all read the same shape.
 */
export function usePromotionalEmails(enabled: boolean) {
  // Starts true when enabled: a scan can run for seconds, and a false loading
  // flag during it makes every screen render its "nothing found" empty state.
  const [state, setState] = useState<State>({
    summary: null,
    isLoading: enabled,
    error: null,
  })

  // Bumped on every new request so a slow earlier response cannot overwrite a
  // newer one, and so an unmount or a strict-mode double-invoke is ignored.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const summary = await apiFetch<PromotionalSummary>('/api/emails/promotional')
      if (id === requestId.current) {
        setState({ summary, isLoading: false, error: null })
      }
    } catch (error) {
      if (id === requestId.current) {
        // Keep whatever was already on screen. Blanking the list while showing
        // an error banner tells the user two contradictory things.
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Could not load your mail.',
        }))
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      // Invalidate anything in flight so its response cannot repopulate the
      // list after sign-out.
      requestId.current++
      setState({ summary: null, isLoading: false, error: null })
      return
    }

    void load()
    // No cleanup needed: load() discards its own result when requestId has
    // moved on, and React 18 ignores a setState on an unmounted component.
  }, [enabled, load])

  /** Drop messages we just acted on, without paying for a full re-scan. */
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
