'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

interface NavItem {
  label: string
  href: string
  icon: string
  premium?: boolean
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard',   href: '/dashboard',   icon: '🏠' },
      { label: 'Occupancy',   href: '/occupancy',   icon: '🗺' },
    ],
  },
  {
    group: 'Facility',
    items: [
      { label: 'Property',    href: '/property',    icon: '🏢' },
      { label: 'People',      href: '/people',      icon: '👥' },
      { label: 'Utilities',   href: '/utilities',   icon: '💧' },
      { label: 'Consumables', href: '/consumables', icon: '📦' },
    ],
  },
  {
    group: 'Leasing',
    items: [
      { label: 'Leases',      href: '/leases',      icon: '📑' },
      { label: 'Onboarding',  href: '/onboarding',  icon: '🎉' },
      { label: 'Inspections', href: '/inspections', icon: '🔍' },
      { label: 'Visitors',    href: '/visitors',    icon: '🚪' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Financials',  href: '/financials',  icon: '💰' },
      { label: 'Maintenance', href: '/maintenance', icon: '🔧' },
      { label: 'HR & Staff',  href: '/hr',          icon: '💼' },
    ],
  },
  {
    group: 'Compliance',
    items: [
      { label: 'Rules & Breaches', href: '/rules',     icon: '⚖' },
      { label: 'Notices',          href: '/notices',   icon: '📬' },
      { label: 'Documents',        href: '/documents', icon: '📁' },
    ],
  },
  {
    group: 'Communication',
    items: [
      { label: 'Communications', href: '/communications', icon: '📢' },
    ],
  },
  {
    group: 'Community',
    items: [
      { label: 'Engagement', href: '/engagement', icon: '🗳️' },
    ],
  },
  {
    group: 'Premium',
    items: [
      { label: 'Short-Stay',     href: '/short-stay',    icon: '🛎',  premium: true },
      { label: 'Access Control', href: '/access',        icon: '🔐' },
      { label: 'Vehicles',       href: '/vehicles',      icon: '🚗',  premium: true },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Reports',     href: '/reports',     icon: '📊' },
      { label: 'Audit Trail', href: '/audit',       icon: '🕵' },
      { label: 'Settings',    href: '/settings',    icon: '⚙' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col bg-surface border-r border-surface-border dark:border-dark-border dark:bg-dark-surface overflow-hidden"
      style={{ width: 'var(--sidebar-w)' }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-surface-border dark:border-dark-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <span className="font-semibold text-text text-sm">FacilityOS</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-3">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {group}
            </p>
            {items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors mb-0.5',
                    active
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                      : 'text-text-muted hover:bg-surface-hover hover:text-text dark:hover:bg-dark-hover'
                  )}
                >
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.premium && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-primary-500 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                      Pro
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-border dark:border-dark-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold">
            FM
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text truncate">Facility Manager</p>
            <p className="text-[10px] text-text-muted truncate">Green Valley Estate</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
