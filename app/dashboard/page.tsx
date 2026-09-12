'use client'

import { HardDrive, Mail, RefreshCw, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { usePromotionalEmails } from '@/hooks/usePromotionalEmails'
import { formatBytes, formatCount, formatRelativeTime } from '@/lib/format'
import { ROUTES } from '@/utils/constants'

export default function DashboardPage() {
  const router = useRouter()
  const { summary, senders, isLoading, error, reload } = usePromotionalEmails()

  const stats = [
    {
      label: 'Promotional in inbox',
      value: summary ? `${formatCount(summary.inboxEmails)}${summary.truncated ? '+' : ''}` : '—',
      icon: Mail,
      tone: 'text-blue-600',
    },
    {
      label: 'Active senders',
      value: summary ? formatCount(summary.totalSenders) : '—',
      icon: Users,
      tone: 'text-green-600',
    },
    {
      label: 'Promotional mail total',
      value: summary ? formatBytes(summary.totalSizeBytes) : '—',
      icon: HardDrive,
      tone: 'text-orange-600',
    },
  ]

  return (
    <AppShell
      title="Dashboard"
      actions={
        <Button variant="secondary" size="sm" onClick={reload} isLoading={isLoading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Rescan
        </Button>
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : null}

      {summary?.truncated ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          You have more promotional mail than one scan covers. These figures describe the{' '}
          {formatCount(summary.totalEmails)} most recent messages.
        </p>
      ) : null}

      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-gray-600">{label}</p>
                  <p className="text-3xl font-bold tabular-nums text-gray-900">
                    {isLoading && !summary ? <Spinner className="h-7 w-7" label="Loading" /> : value}
                  </p>
                </div>
                <Icon className={`h-12 w-12 opacity-20 ${tone}`} aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button size="lg" className="w-full" onClick={() => router.push(ROUTES.SUBSCRIPTIONS)}>
              Review subscriptions
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => router.push(ROUTES.CLEANUP)}
            >
              Clean up emails
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Top senders</h2>
        </CardHeader>
        <CardContent>
          {isLoading && senders.length === 0 ? (
            <p className="py-6 text-center text-gray-600">
              <Spinner className="mr-2 inline h-4 w-4" />
              Reading your promotional mail…
            </p>
          ) : senders.length === 0 ? (
            <p className="py-6 text-center text-gray-600">
              No promotional mail found. Your inbox is already clean.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {senders.slice(0, 5).map((sender) => (
                <li key={sender.email} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{sender.name}</p>
                    <p className="truncate text-sm text-gray-600">{sender.email}</p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="font-medium tabular-nums text-gray-900">
                      {formatCount(sender.emailCount)} emails
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatRelativeTime(sender.lastReceived)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  )
}
