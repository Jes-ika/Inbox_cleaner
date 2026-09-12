'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useCallback, useEffect } from 'react'
import { ROUTES } from '@/utils/constants'

export function useAuth() {
  const { data: session, status } = useSession()

  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'

  const login = useCallback(async () => {
    await signIn('google', { callbackUrl: ROUTES.DASHBOARD })
  }, [])

  const logout = useCallback(async () => {
    await signOut({ callbackUrl: ROUTES.HOME })
  }, [])

  // The refresh token stopped working (revoked in the Google account, or expired
  // after six months of disuse). Nothing the app can do but ask for consent again.
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      void signIn('google', { callbackUrl: ROUTES.DASHBOARD })
    }
  }, [session?.error])

  return {
    session,
    isAuthenticated,
    isLoading,
    login,
    logout,
    user: session?.user,
  }
}
