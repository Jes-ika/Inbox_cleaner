'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useCallback } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()

  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'

  const login = useCallback(async () => {
    await signIn('google', { redirect: false })
  }, [])

  const logout = useCallback(async () => {
    await signOut({ redirect: false })
  }, [])

  return {
    session,
    isAuthenticated,
    isLoading,
    login,
    logout,
    user: session?.user,
    accessToken: session?.accessToken,
  }
}
