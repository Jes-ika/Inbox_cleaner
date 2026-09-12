import { BarChart3, Mail, Settings, Trash2, type LucideIcon } from 'lucide-react'
import { ROUTES } from '@/utils/constants'

export interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

/** One source of truth for the sidebar, the header and the mobile menu. */
export const NAV_LINKS: NavLink[] = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: BarChart3 },
  { href: ROUTES.SUBSCRIPTIONS, label: 'Subscriptions', icon: Mail },
  { href: ROUTES.CLEANUP, label: 'Cleanup', icon: Trash2 },
  { href: ROUTES.SETTINGS, label: 'Settings', icon: Settings },
]
