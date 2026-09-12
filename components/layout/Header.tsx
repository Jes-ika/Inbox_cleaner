'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME, ROUTES } from '@/utils/constants'
import { Button } from '@/components/ui/Button'
import { Mail, LogOut } from 'lucide-react'

export function Header() {
  const { isAuthenticated, isLoading, login, logout, user } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href={ROUTES.HOME} className="flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">{APP_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {isAuthenticated && (
              <>
                <Link href={ROUTES.DASHBOARD} className="text-gray-700 hover:text-gray-900 font-medium">
                  Dashboard
                </Link>
                <Link href={ROUTES.SUBSCRIPTIONS} className="text-gray-700 hover:text-gray-900 font-medium">
                  Subscriptions
                </Link>
                <Link href={ROUTES.CLEANUP} className="text-gray-700 hover:text-gray-900 font-medium">
                  Cleanup
                </Link>
                <Link href={ROUTES.SETTINGS} className="text-gray-700 hover:text-gray-900 font-medium">
                  Settings
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-20 h-10 bg-gray-200 rounded animate-pulse" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={logout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={login}>
                Connect Gmail
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
