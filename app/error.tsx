'use client'

import { AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * Route-level error boundary. Next renders this in place of the page when a
 * client or server component throws.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-red-600" aria-hidden="true" />
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Something broke on this page</h1>
        <p className="mb-6 text-gray-600">
          Nothing in your mailbox was changed by the failure. Reloading usually clears it.
        </p>
        {error.digest ? (
          <p className="mb-6 font-mono text-xs text-gray-400">Reference: {error.digest}</p>
        ) : null}
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" onClick={() => window.location.assign('/')}>
            Go home
          </Button>
        </div>
      </div>
    </main>
  )
}
