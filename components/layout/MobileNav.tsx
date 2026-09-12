'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { LogOut, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { NAV_LINKS } from '@/components/layout/nav-links'

interface MobileNavProps {
  email?: string | null
  onLogout: () => void
}

/**
 * Navigation for narrow screens.
 *
 * The sidebar and the header's inline nav are both hidden below `md`, which used
 * to leave signed-in users on a phone with no way to reach any screen but the
 * one they were on.
 */
export function MobileNav({ email, onLogout }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Open navigation menu"
        className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
        >
          {email ? (
            <div className="truncate px-3 py-2 text-xs text-gray-500">{email}</div>
          ) : null}

          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <DropdownMenu.Item key={href} asChild>
              <Link
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                className={cn(
                  // Radix suppresses the native focus ring, so every item needs
                  // its own highlighted style — including the active one, which
                  // otherwise shows no focus at all under keyboard navigation.
                  'flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm font-medium outline-none data-[highlighted]:ring-2 data-[highlighted]:ring-inset data-[highlighted]:ring-blue-500',
                  pathname === href
                    ? 'bg-blue-50 text-blue-700 data-[highlighted]:bg-blue-100'
                    : 'text-gray-700 data-[highlighted]:bg-gray-100',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-1.5 h-px bg-gray-200" />

          <DropdownMenu.Item
            onSelect={onLogout}
            className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm font-medium text-red-700 outline-none data-[highlighted]:bg-red-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Disconnect Gmail
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
