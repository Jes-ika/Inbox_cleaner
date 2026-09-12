'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ROUTES } from '@/utils/constants'
import { Mail, Trash2, Lock, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Reclaim Your Inbox
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Bulk unsubscribe from newsletters and clean up promotional emails in seconds. 
            Privacy-first, no data stored.
          </p>
          <Button size="lg" onClick={() => window.location.href = ROUTES.DASHBOARD}>
            Connect Gmail
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Mail className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Bulk Unsubscribe</h3>
                <p className="text-sm text-gray-600">
                  Unsubscribe from multiple newsletters at once
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Trash2 className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Inbox Cleanup</h3>
                <p className="text-sm text-gray-600">
                  Archive or trash old promotional emails
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Lock className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Privacy First</h3>
                <p className="text-sm text-gray-600">
                  Your data never leaves your browser
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Zap className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p className="text-sm text-gray-600">
                  Process thousands of emails instantly
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-lg p-12 mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Connect Gmail</h3>
              <p className="text-gray-600">
                Securely connect your Gmail account using OAuth
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Review Senders</h3>
              <p className="text-gray-600">
                See all your promotional senders grouped by email
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Take Action</h3>
              <p className="text-gray-600">
                Unsubscribe or clean up emails with one click
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to clean up your inbox?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Get started in seconds. No credit card required.
          </p>
          <Button size="lg" onClick={() => window.location.href = ROUTES.DASHBOARD}>
            Connect Gmail Now
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2024 InboxClean. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
