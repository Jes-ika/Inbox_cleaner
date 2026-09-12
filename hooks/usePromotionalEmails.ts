'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api-client'
import { applyCleanupToSummary } from '@/lib/summary'
import type { CleanupActionKind, PromotionalSummary } from '@/types'

interface State {
  summary: PromotionalSummary | null
  isLoading: boolean
  error: string | null
}

/**
 * Load the promotional-mail scan and expose the pieces every screen needs.
 * Dashboard, Subscriptions and Cleanup all read the same shape.
 *
 * The hook reads the session itself rather than taking an `enabled` flag. A flag
 * derived from `isAuthenticated` is false during NextAuth's loading phase — a
 * real round trip to /api/auth/session — so the screens would report "not
 * loading, nothing found" before the scan had even been allowed to start. Owning
 * both states here means a call site cannot get that wrong.
 */
export function usePromotionalEmails() {
  const { isAuthenticated, isLoading: sessionLoading } = useAuth()

  const [state, setState] = useState<State>({
    summary: null,
    isLoading: true,
    error: null,
  })

  // Bumped on every new request so a slow earlier response cannot overwrite a
  // newer one, and so a strict-mode double-invoke is ignored.
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
    // Still waiting on the session: hold the loading state rather than
    // concluding there is no mail.
    if (sessionLoading) return

    if (!isAuthenticated) {
      // Invalidate anything in flight so its response cannot repopulate the
      // list after sign-out.
      requestId.current++
      setState({ summary: null, isLoading: false, error: null })
      return
    }

    void load()
    // No cleanup needed: load() discards its own result when requestId has
    // moved on, and React 18 ignores a setState on an unmounted component.
  }, [isAuthenticated, sessionLoading, load])

  /**
   * Reflect a completed cleanup locally, instead of paying for a full re-scan.
   * The archive/trash asymmetry lives in applyCleanupToSummary, where it is
   * pure and tested.
   */
  const applyCleanup = useCallback((kind: CleanupActionKind, messageIds: string[]) => {
    setState((prev) =>
      prev.summary
        ? { ...prev, summary: applyCleanupToSummary(prev.summary, kind, messageIds) }
        : prev,
    )
  }, [])

  return {
    summary: state.summary,
    senders: state.summary?.senders ?? [],
    /** True while the session is resolving or a scan is in flight. */
    isLoading: sessionLoading || state.isLoading,
    error: state.error,
    reload: load,
    applyCleanup,
  }
}
