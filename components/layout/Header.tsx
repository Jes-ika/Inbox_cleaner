'use client'

import { LogOut, Mail } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { MobileNav } from '@/components/layout/MobileNav'
import { NAV_LINKS } from '@/components/layout/nav-links'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { APP_NAME, ROUTES } from '@/utils/constants'

export function Header() {
  const { isAuthenticated, isLoading, login, logout, user } = useAuth()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href={ROUTES.HOME} className="flex flex-none items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" aria-hidden="true" />
            <span className="text-xl font-bold text-gray-900">{APP_NAME}</span>
          </Link>

          {isAuthenticated && (
            <nav aria-label="Main" className="hidden md:flex md:items-center md:gap-8">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={pathname === href ? 'page' : undefined}
                  className={cn(
                    'font-medium transition-colors',
                    pathname === href ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex flex-none items-center gap-2">
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
            ) : isAuthenticated ? (
              <>
                <span className="hidden max-w-[16rem] truncate text-sm text-gray-600 lg:inline">
                  {user?.email}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={logout}
                  className="hidden md:inline-flex"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Logout
                </Button>
                <MobileNav email={user?.email} onLogout={logout} />
              </>
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
