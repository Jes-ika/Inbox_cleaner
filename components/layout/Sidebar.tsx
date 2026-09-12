'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@/utils/constants'
import { cn } from '@/lib/cn'
import { BarChart3, Mail, Settings, Trash2 } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  const links = [
    { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: BarChart3 },
    { href: ROUTES.SUBSCRIPTIONS, label: 'Subscriptions', icon: Mail },
    { href: ROUTES.CLEANUP, label: 'Cleanup', icon: Trash2 },
    { href: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
  ]

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-16">
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors',
              pathname === href
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
