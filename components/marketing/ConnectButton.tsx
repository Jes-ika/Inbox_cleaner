'use client'

import { Button, type ButtonProps } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'

type ConnectButtonProps = Pick<ButtonProps, 'size' | 'className'> & {
  children?: React.ReactNode
}

/**
 * Starts the Google consent flow.
 *
 * Previously these buttons navigated straight to /dashboard, which has no
 * session yet and bounces back to the landing page — a loop that never reached
 * Google at all.
 */
export function ConnectButton({ size = 'lg', className, children }: ConnectButtonProps) {
  const { login, isAuthenticated, isLoading } = useAuth()

  return (
    <Button size={size} className={className} onClick={login} isLoading={isLoading}>
      {children ?? (isAuthenticated ? 'Open dashboard' : 'Connect Gmail')}
    </Button>
  )
}
