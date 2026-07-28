'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Building2, Users, Droplets, Package,
  FileSignature, UserCheck, ClipboardCheck, UserSquare2,
  Wallet, Receipt, Wrench, AlertTriangle, Briefcase, Banknote,
  Scale, FileText, Folder, Megaphone, HeartHandshake, KeyRound,
  ShieldCheck, Car, BarChart3, History, Settings, ChevronsLeft,
} from 'lucide-react'
import { useAbac } from '@/lib/abac/context'
import { NAV, getInitials, formatRole } from '@/lib/nav-config'

// Map emoji icons in nav-config to Lucide icons
const ICON_MAP: Record<string, typeof LayoutDashboard> = {
  '🏠': LayoutDashboard,
  '🗺': Building2,
  '🏢': Building2,
  '👥': Users,
  '💧': Droplets,
  '📦': Package,
  '📑': FileSignature,
  '🎉': UserCheck,
  '🔍': ClipboardCheck,
  '🚪': UserSquare2,
  '💰': Wallet,
  '🧾': Receipt,
  '🔧': Wrench,
  '⚠️': AlertTriangle,
  '💼': Briefcase,
  '💵': Banknote,
  '⚖': Scale,
  '📬': FileText,
  '📁': Folder,
  '📢': Megaphone,
  '🗳️': HeartHandshake,
  '🛎': KeyRound,
  '🔐': ShieldCheck,
  '🚗': Car,
  '📊': BarChart3,
  '🕵': History,
  '⚙': Settings,
  '📋': ClipboardCheck,
}

const STORAGE_KEY = 'sidebar-collapsed'

export function SidebarV2() {
  const pathname = usePathname()
  const { subject } = useAbac()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard' || pathname === '/'
      : pathname === href || pathname.startsWith(href + '/')

  // Filter nav to only items this role can see
  const visibleNav = NAV
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        !item.roles || item.roles.includes(subject.role)
      ),
    }))
    .filter(group => group.items.length > 0)

  const initials = getInitials(subject.name)
  const roleLabel = formatRole(subject.role)

  return (
    <nav
      className={
        'shrink-0 flex flex-col border-r border-zinc-950/5 bg-white transition-[width] duration-200 ' +
        (collapsed ? 'w-16' : 'w-60')
      }
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-zinc-950/5 flex-shrink-0">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-600 font-heading text-sm font-bold text-white">
          F
        </div>
        {!collapsed && (
          <span className="font-heading text-sm font-bold tracking-tight text-steel-900 truncate">
            FacilityOS
          </span>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3">
        {visibleNav.map((group) => (
          <div key={group.group} className="mb-4">
            {!collapsed && (
              <p className="px-4 mb-1 text-[10px] font-bold uppercase tracking-widest text-steel-400">
                {group.group}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
                const active = isActive(item.href)
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={
                        'w-full flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ' +
                        (active
                          ? 'bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-emerald-600/10'
                          : 'text-steel-500 hover:bg-neutral-100 hover:text-steel-900')
                      }
                    >
                      <Icon className="size-4 shrink-0" />
                      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                      {!collapsed && item.premium && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                          PRO
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* User + collapse */}
      <div className="border-t border-zinc-950/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 font-heading text-[11px] font-bold text-emerald-800">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-steel-900 truncate">{subject.name}</p>
              <p className="text-[10px] text-steel-400 truncate">{roleLabel}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold text-steel-400 hover:bg-neutral-100 hover:text-steel-700 transition-colors"
        >
          <ChevronsLeft className={'size-3.5 transition-transform ' + (collapsed ? 'rotate-180' : '')} />
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </nav>
  )
}
