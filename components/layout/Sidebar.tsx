'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { useSidebar } from '@/lib/sidebar-context'

interface NavItem  { label: string; href: string; icon: string; premium?: boolean }
interface NavGroup { group: string; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
      { label: 'Occupancy', href: '/occupancy', icon: '🗺' },
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
      { label: 'Short-Stay',     href: '/short-stay', icon: '🛎',  premium: true },
      { label: 'Access Control', href: '/access',     icon: '🔐' },
      { label: 'Vehicles',       href: '/vehicles',   icon: '🚗',  premium: true },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Reports',     href: '/reports',  icon: '📊' },
      { label: 'Audit Trail', href: '/audit',    icon: '🕵' },
      { label: 'Settings',    href: '/settings', icon: '⚙' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar()

  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col h-full bg-surface border-r border-surface-border dark:border-dark-border dark:bg-dark-surface overflow-hidden transition-all duration-300',
        collapsed ? 'w-16' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center border-b border-surface-border dark:border-dark-border flex-shrink-0 px-3">
        <div className={cn('flex items-center gap-2.5 min-w-0', collapsed && 'justify-center w-full')}>
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-text text-sm truncate">FacilityOS</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            {!collapsed && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {group}
              </p>
            )}
            {collapsed && <div className="h-px bg-surface-border dark:bg-dark-border mx-1 mb-2" />}
            {items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md text-sm transition-colors mb-0.5 group relative',
                    collapsed ? 'px-0 py-2 justify-center' : 'px-2 py-1.5',
                    active
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                      : 'text-text-muted hover:bg-surface-hover hover:text-text dark:hover:bg-dark-hover'
                  )}
                >
                  <span className={cn('text-base text-center flex-shrink-0', collapsed ? 'w-full' : 'w-5')}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.premium && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-primary-500 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                          Pro
                        </span>
                      )}
                    </>
                  )}
                  {/* Tooltip on collapsed */}
                  {collapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                      {item.label}
                      {item.premium && <span className="ml-1 text-primary-300">(Pro)</span>}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn(
        'border-t border-surface-border dark:border-dark-border flex-shrink-0',
        collapsed ? 'px-2 py-3' : 'px-3 py-3'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold flex-shrink-0">
              FM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text truncate">Facility Manager</p>
              <p className="text-[10px] text-text-muted truncate">Green Valley Estate</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center mb-3">
            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold" title="Facility Manager">
              FM
            </div>
          </div>
        )}
        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex w-full items-center justify-center gap-2 py-1.5 rounded-md text-xs text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={cn('w-4 h-4 transition-transform duration-300', collapsed && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* ── Desktop sidebar (fixed, always mounted) ── */}
      <div className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30 transition-all duration-300',
        collapsed ? 'w-16' : 'w-[240px]'
      )}>
        {sidebarContent}
      </div>

      {/* ── Mobile: backdrop + drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMobile}
          />
          {/* Drawer */}
          <div className="relative z-50 flex flex-col w-[240px] h-full shadow-2xl">
            {/* Close button */}
            <button
              onClick={closeMobile}
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-surface-muted dark:bg-dark-hover flex items-center justify-center text-text-muted hover:text-text transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
