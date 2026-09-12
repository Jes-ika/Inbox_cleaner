'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_LINKS } from '@/components/layout/nav-links'
import { cn } from '@/lib/cn'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-gray-200 bg-white md:flex">
      <nav aria-label="Sections" className="flex-1 space-y-1 px-4 py-6">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-2 font-medium transition-colors',
              pathname === href
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
