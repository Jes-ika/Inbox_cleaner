'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Mail, Users, HardDrive, Loader } from 'lucide-react'
import { ROUTES } from '@/utils/constants'

interface EmailStats {
  totalEmails: number
  totalSenders: number
  senders: Array<{
    email: string
    name: string
    count: number
    lastReceived: string
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(ROUTES.HOME)
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/emails/promotional')
        
        if (!response.ok) {
          throw new Error('Failed to fetch emails')
        }

        const data = await response.json()
        setStats({
          totalEmails: data.totalEmails,
          totalSenders: data.totalSenders,
          senders: data.senders.slice(0, 5),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [isAuthenticated])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Promotional Emails</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {loading ? '-' : stats?.totalEmails || 0}
                      </p>
                    </div>
                    <Mail className="w-12 h-12 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active Senders</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {loading ? '-' : stats?.totalSenders || 0}
                      </p>
                    </div>
                    <Users className="w-12 h-12 text-green-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Storage Used</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {loading ? '-' : '~1.2 GB'}
                      </p>
                    </div>
                    <HardDrive className="w-12 h-12 text-orange-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push(ROUTES.SUBSCRIPTIONS)}
                  >
                    Review Subscriptions
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push(ROUTES.CLEANUP)}
                  >
                    Clean Up Emails
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Top Senders */}
            {stats && stats.senders.length > 0 && (
              <Card className="mt-8">
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Top Senders</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.senders.map(sender => (
                      <div
                        key={sender.email}
                        className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{sender.name}</p>
                          <p className="text-sm text-gray-600">{sender.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{sender.count} emails</p>
                          <p className="text-sm text-gray-600">{sender.lastReceived}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
