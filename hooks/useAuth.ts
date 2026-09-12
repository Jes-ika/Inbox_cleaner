'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { ROUTES } from '@/utils/constants'

/**
 * Marks that this browser tab has already been bounced to Google over a dead
 * refresh token. sessionStorage rather than a module variable on purpose: the
 * redirect is a full page load, which resets module state — so a module flag
 * would let a declined consent bounce the user forever.
 */
const RECONSENT_KEY = 'inboxclean_reconsent_attempted'

function readAttempted(): boolean {
  try {
    return window.sessionStorage.getItem(RECONSENT_KEY) === '1'
  } catch {
    // Storage blocked: assume we already tried, and show the manual button.
    return true
  }
}

function markAttempted(): void {
  try {
    window.sessionStorage.setItem(RECONSENT_KEY, '1')
  } catch {
    // Nothing to do; the flag is only a loop guard.
  }
}

export function useAuth() {
  const { data: session, status } = useSession()
  const [reconnectRequired, setReconnectRequired] = useState(false)

  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'

  const login = useCallback(async () => {
    try {
      window.sessionStorage.removeItem(RECONSENT_KEY)
    } catch {
      // Ignore; an explicit click is already the user retrying.
    }
    await signIn('google', { callbackUrl: ROUTES.DASHBOARD })
  }, [])

  const logout = useCallback(async () => {
    await signOut({ callbackUrl: ROUTES.HOME })
  }, [])

  // The stored refresh token stopped working — revoked in the Google account,
  // expired after a week while the OAuth app is still in Testing, or unused for
  // six months. Ask for consent once; if that does not take, surface a button
  // instead of redirecting again.
  useEffect(() => {
    if (session?.error !== 'RefreshAccessTokenError') {
      // The session recovered — a poll refreshed the token, or the user signed
      // in again. Clearing this matters: Header renders the Reconnect button
      // *instead of* the whole signed-in branch, so a stuck flag would strip
      // Logout and, below the md breakpoint where the desktop nav is hidden,
      // every means of navigating anywhere.
      setReconnectRequired(false)
      return
    }

    if (readAttempted()) {
      setReconnectRequired(true)
      return
    }

    markAttempted()
    void signIn('google', { callbackUrl: ROUTES.DASHBOARD })
  }, [session?.error])

  return {
    session,
    isAuthenticated,
    isLoading,
    /** True when automatic re-consent already failed and the user must act. */
    reconnectRequired,
    login,
    logout,
    user: session?.user,
  }
}
