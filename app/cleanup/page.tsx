'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Archive, Trash2, Loader } from 'lucide-react'
import { useState } from 'react'
import { ROUTES } from '@/utils/constants'

interface CleanupSender {
  id: string
  name: string
  email: string
  emailCount: number
  lastReceived: string
}

const mockSenders: CleanupSender[] = [
  { id: '1', name: 'Canva', email: 'marketing@canva.com', emailCount: 45, lastReceived: '2 hours ago' },
  { id: '2', name: 'Medium', email: 'digest@medium.com', emailCount: 234, lastReceived: '1 day ago' },
  { id: '3', name: 'ProductHunt', email: 'newsletter@producthunt.com', emailCount: 89, lastReceived: '3 days ago' },
]

export default function CleanupPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [senders, setSenders] = useState(mockSenders)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [cleanupAction, setCleanupAction] = useState<'trash' | 'archive'>('trash')
  const [isProcessing, setIsProcessing] = useState(false)

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
    if (selectedIds.length === senders.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(senders.map(s => s.id))
    }
  }

  const handleCleanup = (action: 'trash' | 'archive') => {
    setCleanupAction(action)
    setShowModal(true)
  }

  const confirmCleanup = async () => {
    setIsProcessing(true)
    try {
      // TODO: Implement actual cleanup API call
      console.log(`${cleanupAction === 'trash' ? 'Trashing' : 'Archiving'} emails`)
      setShowModal(false)
      setSelectedIds([])
    } finally {
      setIsProcessing(false)
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

  const selectedCount = selectedIds.reduce((sum, id) => {
    const sender = senders.find(s => s.id === id)
    return sum + (sender?.emailCount || 0)
  }, 0)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Cleanup</h1>
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
                    {senders.length} Senders
                  </h2>
                  {selectedIds.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedIds.length} selected ({selectedCount} emails)
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
                      checked={selectedIds.length === senders.length && senders.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1">Sender</div>
                    <div className="w-24 text-right">Emails</div>
                    <div className="w-32 text-right">Last Received</div>
                  </div>

                  {/* Sender Rows */}
                  {senders.map(sender => (
                    <div
                      key={sender.id}
                      className="flex items-center gap-4 py-3 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sender.id)}
                        onChange={() => toggleSelect(sender.id)}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{sender.name}</p>
                        <p className="text-sm text-gray-600">{sender.email}</p>
                      </div>
                      <div className="w-24 text-right text-gray-900 font-medium">
                        {sender.emailCount}
                      </div>
                      <div className="w-32 text-right text-sm text-gray-600">
                        {sender.lastReceived}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedIds.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleCleanup('trash')}
                      className="flex items-center gap-2"
                      disabled={isProcessing}
                    >
                      <Trash2 className="w-4 h-4" />
                      Trash {selectedCount} emails
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => handleCleanup('archive')}
                      className="flex items-center gap-2"
                      disabled={isProcessing}
                    >
                      <Archive className="w-4 h-4" />
                      Archive {selectedCount} emails
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setSelectedIds([])}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Confirm ${cleanupAction === 'trash' ? 'Trash' : 'Archive'}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant={cleanupAction === 'trash' ? 'danger' : 'primary'}
              onClick={confirmCleanup}
              isLoading={isProcessing}
            >
              {cleanupAction === 'trash' ? 'Trash' : 'Archive'} {selectedCount} emails
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            You are about to {cleanupAction === 'trash' ? 'trash' : 'archive'} <strong>{selectedCount}</strong> emails from{' '}
            <strong>{selectedIds.length}</strong> sender{selectedIds.length !== 1 ? 's' : ''}.
          </p>
          <p className="text-sm text-gray-600">
            {cleanupAction === 'trash'
              ? 'These emails will be moved to trash and can be recovered for 30 days.'
              : 'These emails will be archived and removed from your inbox.'}
          </p>
        </div>
      </Modal>
    </div>
  )
}
