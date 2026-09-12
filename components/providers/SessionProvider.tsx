'use client'

import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Polling the session every 10 minutes keeps the jwt callback running, which is
 * what actually refreshes the Google access token in the cookie. Without it a
 * tab left open past the token's hour would only discover the expiry when the
 * user next clicked something.
 */
export function AuthSessionProvider({ children }: Props) {
  return (
    <SessionProvider refetchInterval={600} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  )
}
