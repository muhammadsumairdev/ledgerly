import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Match the route as a prefix (so /invoices/new keeps Invoices active). */
  match?: string
}

/** Primary navigation, shared by the sidebar. */
export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/invoices', label: 'Invoices', icon: FileText, match: '/invoices' },
  { to: '/clients', label: 'Clients', icon: Users, match: '/clients' },
  { to: '/settings', label: 'Settings', icon: Settings },
]
