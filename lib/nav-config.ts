// Single source of truth for navigation, role visibility, and landing pages.

export interface NavItem  { label: string; href: string; icon: string; premium?: boolean; roles?: string[]; children?: NavItem[] }
export interface NavGroup { group: string; items: NavItem[] }

/** Role → first page after login (and fallback for unauthorized access) */
export const ROLE_HOME: Record<string, string> = {
  facility_manager:       '/dashboard',
  finance_officer:        '/dashboard',
  maintenance_supervisor: '/maintenance',
  security_officer:       '/access',
  receptionist:           '/people',
  owner:                  '/property',
  payroll_officer:        '/payroll',
}

const FM     = 'facility_manager'
const FIN    = 'finance_officer'
const MAINT  = 'maintenance_supervisor'
const SEC    = 'security_officer'
const RECEP  = 'receptionist'
const OWNER  = 'owner'
const PAYRLL = 'payroll_officer'

export const NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '🏠', roles: [FM, FIN] },
      { label: 'Occupancy', href: '/occupancy', icon: '🗺', roles: [FM, FIN] },
    ],
  },
  {
    group: 'Facility',
    items: [
      { label: 'Property',    href: '/property',    icon: '🏢', roles: [FM, FIN, MAINT, RECEP, OWNER] },
      { label: 'People',      href: '/people',      icon: '👥', roles: [FM, FIN, SEC, RECEP] },
      { label: 'Utilities',   href: '/utilities',   icon: '💧', roles: [FM, MAINT] },
      { label: 'Consumables', href: '/consumables', icon: '📦', roles: [FM, MAINT, RECEP] },
    ],
  },
  {
    group: 'Leasing',
    items: [
      { label: 'Leases',      href: '/leases',      icon: '📑', roles: [FM, FIN, OWNER] },
      { label: 'Onboarding',  href: '/onboarding',  icon: '🎉', roles: [FM, FIN] },
      { label: 'Inspections', href: '/inspections', icon: '🔍', roles: [FM, MAINT] },
      { label: 'Visitors',    href: '/visitors',    icon: '🚪', roles: [FM, SEC, RECEP] },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Financials',  href: '/financials',  icon: '💰', roles: [FM, FIN] },
      { label: 'Billing',     href: '/billing',     icon: '🧾', roles: [FM, FIN], children: [
        { label: 'Move-Out Clearances', href: '/billing/clearances',  icon: '🏠', roles: [FM, FIN, RECEP] },
        { label: 'Resident Statements', href: '/billing/statements',  icon: '📋', roles: [FM, FIN, RECEP] },
      ]},
      { label: 'Maintenance', href: '/maintenance', icon: '🔧', roles: [FM, MAINT] },
      { label: 'Issues',      href: '/issues',      icon: '⚠️',  roles: [FM, MAINT, RECEP] },
      { label: 'HR & Staff',  href: '/hr',          icon: '💼', roles: [FM] },
      { label: 'Payroll',     href: '/payroll',     icon: '💵', roles: [FM, PAYRLL] },
    ],
  },
  {
    group: 'Compliance',
    items: [
      { label: 'Rules & Breaches', href: '/rules',     icon: '⚖', roles: [FM] },
      { label: 'Notices',          href: '/notices',   icon: '📬', roles: [FM, FIN] },
      { label: 'Documents',        href: '/documents', icon: '📁', roles: [FM, FIN, MAINT, OWNER] },
    ],
  },
  {
    group: 'Communication',
    items: [
      { label: 'Communications', href: '/communications', icon: '📢', roles: [FM] },
    ],
  },
  {
    group: 'Community',
    items: [
      { label: 'Engagement', href: '/engagement', icon: '🗳️', roles: [FM] },
    ],
  },
  {
    group: 'Premium',
    items: [
      { label: 'Short-Stay',     href: '/short-stay', icon: '🛎',  premium: true, roles: [FM, RECEP] },
      { label: 'Access Control', href: '/access',     icon: '🔐',               roles: [FM, SEC] },
      { label: 'Vehicles',       href: '/vehicles',   icon: '🚗',  premium: true, roles: [FM] },
    ],
  },
  {
    group: 'Admin',
    items: [
      { label: 'Reports',     href: '/reports',  icon: '📊', roles: [FM, FIN] },
      { label: 'Audit Trail', href: '/audit',    icon: '🕵', roles: [FM] },
      { label: 'Settings',    href: '/settings', icon: '⚙', roles: [FM] },
    ],
  },
]

/** All page paths a given role is permitted to visit (includes child paths) */
export function getAllowedPaths(role: string): string[] {
  return NAV.flatMap(g => g.items).flatMap(item => {
    const parentAllowed = !item.roles || item.roles.includes(role)
    const childPaths = (item.children ?? [])
      .filter(c => !c.roles || c.roles.includes(role))
      .map(c => c.href)
    return parentAllowed ? [item.href, ...childPaths] : childPaths
  })
}

export function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
