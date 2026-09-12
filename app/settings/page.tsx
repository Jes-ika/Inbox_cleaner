'use client'

import { ExternalLink, Lock, LogOut, Shield } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { formatCount, formatRelativeTime } from '@/lib/format'
import { clearLocalData, getCleanupHistory, getUnsubscribeHistory } from '@/lib/history'
import { GMAIL_SCOPES, ROUTES } from '@/utils/constants'
import type { CleanupAction, UnsubscribeRecord } from '@/types'

const GOOGLE_PERMISSIONS_URL = 'https://myaccount.google.com/permissions'

const DATA_FACTS = [
  'Access is limited to a single Gmail scope: read messages and change their labels.',
  'Messages are read while a page loads and never written to a database.',
  'The only data kept is this activity log, in your browser, on this device.',
  'Your Google tokens stay in an encrypted session cookie and are never sent to the browser.',
]

export default function SettingsPage() {
  const { logout, user } = useAuth()
  const { toast } = useToast()

  const [cleanups, setCleanups] = useState<CleanupAction[]>([])
  const [unsubscribes, setUnsubscribes] = useState<UnsubscribeRecord[]>([])

  // localStorage is only readable after mount; reading during render would not
  // match what the server sent.
  const refreshHistory = useCallback(() => {
    setCleanups(getCleanupHistory())
    setUnsubscribes(getUnsubscribeHistory())
  }, [])

  useEffect(refreshHistory, [refreshHistory])

  const handleClear = () => {
    clearLocalData()
    refreshHistory()
    toast({
      title: 'Local data cleared',
      description: 'The activity log on this device is gone.',
      variant: 'success',
    })
  }

  const totalEntries = cleanups.length + unsubscribes.length

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Shield className="h-5 w-5" aria-hidden="true" />
              Account
            </h2>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="mb-1 text-sm text-gray-600">Connected account</dt>
                <dd className="break-all font-medium text-gray-900">{user?.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="mb-1 text-sm text-gray-600">Granted scope</dt>
                <dd className="break-all font-mono text-sm text-gray-900">
                  {GMAIL_SCOPES.join(', ')}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-sm text-gray-600">Revoking access</dt>
                <dd className="text-sm text-gray-700">
                  Disconnecting here ends your session.{' '}
                  <a
                    href={GOOGLE_PERMISSIONS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                  >
                    Remove the grant in your Google account
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>{' '}
                  to withdraw access entirely.
                </dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter>
            <Button variant="danger" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Disconnect Gmail
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Lock className="h-5 w-5" aria-hidden="true" />
              Privacy &amp; data
            </h2>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              {DATA_FACTS.map((fact) => (
                <li key={fact} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-0.5 font-bold text-green-600">
                    ✓
                  </span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gray-600">
              Full detail in the{' '}
              <Link href={ROUTES.PRIVACY} className="font-medium text-blue-600 hover:underline">
                privacy policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Activity on this device</h2>
          </CardHeader>
          <CardContent>
            {totalEntries === 0 ? (
              <p className="text-sm text-gray-600">Nothing logged yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 text-sm">
                {cleanups.slice(0, 5).map((entry) => (
                  <li key={`cleanup-${entry.timestamp}`} className="flex justify-between gap-4 py-2">
                    <span className="text-gray-900">
                      {entry.kind === 'trash' ? 'Trashed' : 'Archived'}{' '}
                      {formatCount(entry.messageIds.length)} emails
                    </span>
                    <span className="flex-none text-gray-500">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </li>
                ))}
                {unsubscribes.slice(0, 5).map((entry) => (
                  <li
                    key={`unsub-${entry.senderEmail}-${entry.timestamp}`}
                    className="flex justify-between gap-4 py-2"
                  >
                    <span className="min-w-0 truncate text-gray-900">
                      Unsubscribe ({entry.status}) — {entry.senderEmail}
                    </span>
                    <span className="flex-none text-gray-500">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={handleClear} disabled={totalEntries === 0}>
                Clear local data
              </Button>
              <span className="text-sm text-gray-600">
                {formatCount(totalEntries)} entr{totalEntries === 1 ? 'y' : 'ies'} stored
              </span>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Help</h2>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li>
                <Link
                  href={ROUTES.PRIVACY}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href={ROUTES.TERMS} className="font-medium text-blue-600 hover:text-blue-700">
                  Terms of service
                </Link>
              </li>
              <li>
                <a
                  href={GOOGLE_PERMISSIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                >
                  Manage third-party access in Google
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
