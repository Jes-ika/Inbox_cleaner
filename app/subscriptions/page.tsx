'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Mail, Trash2, Loader } from 'lucide-react'
import { useState } from 'react'
import { ROUTES } from '@/utils/constants'

interface Subscription {
  id: string
  name: string
  email: string
  emailCount: number
  lastReceived: string
}

const mockSubscriptions: Subscription[] = [
  { id: '1', name: 'Canva', email: 'marketing@canva.com', emailCount: 45, lastReceived: '2 hours ago' },
  { id: '2', name: 'Medium', email: 'digest@medium.com', emailCount: 234, lastReceived: '1 day ago' },
  { id: '3', name: 'ProductHunt', email: 'newsletter@producthunt.com', emailCount: 89, lastReceived: '3 days ago' },
  { id: '4', name: 'Substack', email: 'notifications@substack.com', emailCount: 156, lastReceived: '5 days ago' },
]

export default function SubscriptionsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [subscriptions, setSubscriptions] = useState(mockSubscriptions)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(ROUTES.HOME)
    }
  }, [isAuthenticated, authLoading, router])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === subscriptions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(subscriptions.map(s => s.id))
    }
  }

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
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">
                  Filter
                </Button>
                <Button variant="secondary" size="sm">
                  Sort
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {subscriptions.length} Active Senders
                  </h2>
                  {selectedIds.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedIds.length} selected
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Header Row */}
                  <div className="flex items-center gap-4 py-3 px-4 bg-gray-50 rounded-lg font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === subscriptions.length && subscriptions.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1">Sender</div>
                    <div className="w-24 text-right">Emails</div>
                    <div className="w-32 text-right">Last Received</div>
                    <div className="w-32">Actions</div>
                  </div>

                  {/* Subscription Rows */}
                  {subscriptions.map(sub => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-4 py-3 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sub.id)}
                        onChange={() => toggleSelect(sub.id)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{sub.name}</p>
                        <p className="text-sm text-gray-600">{sub.email}</p>
                      </div>
                      <div className="w-24 text-right text-gray-900 font-medium">
                        {sub.emailCount}
                      </div>
                      <div className="w-32 text-right text-sm text-gray-600">
                        {sub.lastReceived}
                      </div>
                      <div className="w-32 flex gap-2">
                        <Button variant="secondary" size="sm" className="flex-1">
                          Unsubscribe
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedIds.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                    <Button variant="primary" size="md">
                      Unsubscribe from {selectedIds.length} selected
                    </Button>
                    <Button variant="secondary" size="md">
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
