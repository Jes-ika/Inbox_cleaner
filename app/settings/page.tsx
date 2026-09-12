'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LogOut, Shield, Lock, Loader } from 'lucide-react'
import { ROUTES } from '@/utils/constants'

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, logout, user } = useAuth()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(ROUTES.HOME)
    }
  }, [isAuthenticated, authLoading, router])

  const handleLogout = async () => {
    await logout()
    router.push(ROUTES.HOME)
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
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

            {/* Account Section */}
            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Account
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Connected Email</p>
                    <p className="font-medium text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Connected Since</p>
                    <p className="font-medium text-gray-900">Today</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="danger"
                  size="md"
                  className="flex items-center gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Gmail
                </Button>
              </CardFooter>
            </Card>

            {/* Privacy Section */}
            <Card className="mb-6">
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Privacy & Data
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">How We Handle Your Data</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span>All data is processed in your browser</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span>We never store your emails on our servers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span>We only access promotional emails</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span>Your Gmail access token is never logged</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Data Management</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-3">
                      Clear all local data stored in your browser
                    </p>
                    <Button variant="secondary" size="md">
                      Clear Local Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="mt-6">
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Help & Support</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <a href="#" className="block text-blue-600 hover:text-blue-700 font-medium">
                    Privacy Policy
                  </a>
                  <a href="#" className="block text-blue-600 hover:text-blue-700 font-medium">
                    Terms of Service
                  </a>
                  <a href="#" className="block text-blue-600 hover:text-blue-700 font-medium">
                    Contact Support
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
