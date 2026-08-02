'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, Search, Command as CommandIcon, Sparkles, HelpCircle, ChevronRight,
  User, Settings, KeyRound, Activity, UserCog, LifeBuoy, BookOpen,
  MessageSquare, FileText, Keyboard, Lock, LogOut, LogIn, ShieldCheck,
  Check, ChevronDown, CircleDot, X, BadgeCheck, ScrollText, Gauge, Scale,
} from 'lucide-react'
import { useAbac } from '@/lib/abac/context'
import { getInitials, formatRole, NAV } from '@/lib/nav-config'
import { logout } from '@/lib/api/auth'

// Route → { title, section } for breadcrumbs
const ROUTE_META: Record<string, { title: string; section: string }> = {
  '/dashboard': { title: 'Dashboard', section: 'Overview' },
  '/': { title: 'Dashboard', section: 'Overview' },
  '/occupancy': { title: 'Occupancy', section: 'Overview' },
  '/property': { title: 'Property', section: 'Facility' },
  '/people': { title: 'People', section: 'Facility' },
  '/utilities': { title: 'Utilities', section: 'Facility' },
  '/consumables': { title: 'Consumables', section: 'Facility' },
  '/leases': { title: 'Leases', section: 'Leasing' },
  '/onboarding': { title: 'Onboarding', section: 'Leasing' },
  '/inspections': { title: 'Inspections', section: 'Leasing' },
  '/visitors': { title: 'Visitors', section: 'Leasing' },
  '/financials': { title: 'Financials', section: 'Operations' },
  '/billing': { title: 'Billing', section: 'Operations' },
  '/maintenance': { title: 'Maintenance', section: 'Operations' },
  '/issues': { title: 'Help Desk', section: 'Facility' },
  '/hr': { title: 'HR & Staff', section: 'Operations' },
  '/payroll': { title: 'Payroll', section: 'Operations' },
  '/rules': { title: 'Rules & Breaches', section: 'Compliance' },
  '/notices': { title: 'Notices', section: 'Compliance' },
  '/documents': { title: 'Documents', section: 'Compliance' },
  '/communications': { title: 'Communications', section: 'Communication' },
  '/engagement': { title: 'Engagement', section: 'Community' },
  '/short-stay': { title: 'Short-Stay', section: 'Premium' },
  '/access': { title: 'Access Control', section: 'Premium' },
  '/vehicles': { title: 'Vehicles', section: 'Premium' },
  '/reports': { title: 'Reports', section: 'Admin' },
  '/audit': { title: 'Audit Trail', section: 'Admin' },
  '/settings': { title: 'Settings', section: 'Admin' },
}

type Notification = {
  id: string; title: string; body: string; time: string
  unread: boolean; tone: 'info' | 'warn' | 'success' | 'danger'; href?: string
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'KYC review queue', body: '12 residents have documents awaiting review.', time: '8m', unread: true, tone: 'warn', href: '/people' },
  { id: 'n2', title: 'Reading cycle unlocked', body: 'August water reading run is now open for Block C.', time: '42m', unread: true, tone: 'info', href: '/utilities' },
  { id: 'n3', title: 'Payment received', body: 'KES 128,400 reconciled to Unit 512.', time: '2h', unread: true, tone: 'success', href: '/financials' },
  { id: 'n4', title: 'Vehicle sticker expiring', body: '3 vehicles expire within 7 days.', time: '5h', unread: false, tone: 'warn', href: '/vehicles' },
  { id: 'n5', title: 'Notice published', body: 'Water shutdown notice — Block C sent to 84 recipients.', time: '1d', unread: false, tone: 'info', href: '/notices' },
]

const NOTIF_TONE: Record<Notification['tone'], string> = {
  info: 'bg-sky-500', warn: 'bg-amber-500', success: 'bg-emerald-500', danger: 'bg-rose-500',
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open, close])
  return ref
}

export function TopBarV2() {
  const pathname = usePathname()
  const router = useRouter()
  const { subject } = useAbac()

  // Find best matching route meta (handle sub-paths)
  const meta = useMemo(() => {
    const exact = ROUTE_META[pathname]
    if (exact) return exact
    const parent = Object.keys(ROUTE_META)
      .filter(k => pathname.startsWith(k + '/'))
      .sort((a, b) => b.length - a.length)[0]
    return parent ? ROUTE_META[parent] : { title: 'FacilityOS', section: '' }
  }, [pathname])

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [locked, setLocked] = useState(false)

  const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const unreadCount = notifs.filter((n) => n.unread).length

  const notifRef = useOutsideClose(notifOpen, () => setNotifOpen(false))
  const helpRef = useOutsideClose(helpOpen, () => setHelpOpen(false))
  const userRef = useOutsideClose(userOpen, () => setUserOpen(false))

  // Keyboard: ⌘K = command palette, ⌘. = lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((v) => !v) }
      else if (mod && e.key === '.') { e.preventDefault(); setLocked(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const markAllRead = () => setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })))

  const handleSignOut = async () => {
    try { await logout() } catch {}
    router.push('/login')
  }

  const initials = getInitials(subject.name)
  const roleLabel = formatRole(subject.role)

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-950/5 bg-white/95 px-4 backdrop-blur">
        {/* Breadcrumb + title */}
        <div className="flex min-w-0 items-center gap-2">
          {meta.section && (
            <>
              <span className="text-[11px] font-medium text-steel-400">{meta.section}</span>
              <ChevronRight className="h-3 w-3 text-steel-300" />
            </>
          )}
          <h1 className="truncate font-heading text-sm font-semibold text-steel-900">{meta.title}</h1>
        </div>

        {/* Command palette trigger */}
        <div className="mx-auto hidden max-w-md flex-1 md:block">
          <button
            onClick={() => setPaletteOpen(true)}
            className="group flex w-full items-center gap-2 rounded-md border border-zinc-950/10 bg-steel-50/60 px-3 py-1.5 text-left text-xs text-steel-400 transition hover:border-zinc-950/20 hover:bg-white"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 truncate">Search or jump to… people, notices, unit 402…</span>
            <kbd className="hidden items-center gap-0.5 rounded border border-zinc-950/10 bg-white px-1.5 py-0.5 font-mono text-[10px] text-steel-500 sm:inline-flex">
              <CommandIcon className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1">
          {/* Env pill */}
          <span className="hidden items-center gap-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 lg:inline-flex">
            <CircleDot className="h-2.5 w-2.5" /> Staging
          </span>

          {/* AI assistant */}
          <button
            title="Ask AI (⌘J)"
            onClick={() => window.dispatchEvent(new CustomEvent('quantumai:open'))}
            className="hidden h-8 items-center gap-1.5 rounded-md px-2 text-xs text-steel-500 hover:bg-steel-50 hover:text-steel-900 md:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            AI
            <kbd className="rounded border border-zinc-950/10 bg-white px-1 py-0.5 font-mono text-[9px] text-steel-500">⌘J</kbd>
          </button>

          {/* Help */}
          <div className="relative" ref={helpRef}>
            <button
              onClick={() => setHelpOpen((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-md text-steel-500 hover:bg-steel-50 hover:text-steel-900"
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            {helpOpen && (
              <div className="absolute right-0 top-10 w-80 rounded-lg border border-zinc-950/10 bg-white p-1.5 shadow-xl z-40">
                <MenuHeader label="Help" />
                <MenuItem icon={BookOpen} label="Documentation" hint="↗" />
                <MenuItem icon={Keyboard} label="Keyboard shortcuts" hint="⌘/" />
                <MenuItem icon={MessageSquare} label="Send feedback" />
                <MenuItem icon={LifeBuoy} label="Contact support" href="mailto:admin@greatwallgardens.estate" />
                <div className="my-1 h-px bg-zinc-950/5" />
                <MenuHeader label="Resources" />
                <MenuItem icon={ScrollText} label="Changelog" />
                <MenuItem icon={Gauge} label="Status page" hint="All systems ok" />
                <MenuItem icon={FileText} label="What's new" />
                <div className="my-1 h-px bg-zinc-950/5" />
                <MenuHeader label="Legal" />
                <MenuItem icon={Scale} label="Terms of Service" />
                <MenuItem icon={ShieldCheck} label="Privacy Policy" />
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative grid h-8 w-8 place-items-center rounded-md text-steel-500 hover:bg-steel-50 hover:text-steel-900"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-10 w-96 overflow-hidden rounded-lg border border-zinc-950/10 bg-white shadow-xl z-40">
                <div className="flex items-center justify-between border-b border-zinc-950/5 px-4 py-2.5">
                  <p className="font-heading text-sm font-semibold text-steel-900">Notifications</p>
                  <button onClick={markAllRead} className="text-[11px] font-medium text-emerald-700 hover:underline">
                    Mark all read
                  </button>
                </div>
                <ul className="max-h-96 overflow-y-auto">
                  {notifs.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => {
                          setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))
                          if (n.href) { router.push(n.href); setNotifOpen(false) }
                        }}
                        className="flex w-full items-start gap-2.5 border-b border-zinc-950/5 px-4 py-2.5 text-left transition hover:bg-steel-50"
                      >
                        <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + NOTIF_TONE[n.tone]} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={'truncate text-xs ' + (n.unread ? 'font-semibold text-steel-900' : 'text-steel-600')}>
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-steel-400">{n.time}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-steel-500">{n.body}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-zinc-950/5 bg-steel-50/40 px-4 py-2 text-center">
                  <Link href="/audit" className="text-[11px] font-semibold text-steel-600 hover:text-steel-900">
                    View all activity
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserOpen((v) => !v)}
              className="ml-1 flex items-center gap-2 rounded-md py-1 pl-1 pr-2 text-left hover:bg-steel-50"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600 font-heading text-[11px] font-bold text-white">
                {initials}
              </span>
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-xs font-semibold text-steel-900">{subject.name}</span>
                <span className="block text-[10px] text-steel-400">{roleLabel}</span>
              </span>
              <ChevronDown className="h-3 w-3 text-steel-400" />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-lg border border-zinc-950/10 bg-white shadow-xl z-40">
                {/* Identity */}
                <div className="flex items-center gap-3 border-b border-zinc-950/5 bg-gradient-to-br from-emerald-50 to-white px-4 py-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-600 font-heading text-sm font-bold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-steel-900">{subject.name}</p>
                    <p className="truncate text-[11px] text-steel-500">{subject.email ?? ''}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-600/20">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      {roleLabel}
                    </div>
                  </div>
                </div>

                {/* Account actions */}
                <div className="px-1.5 py-1.5">
                  <MenuHeader label="Account" />
                  <MenuItem icon={User} label="Profile" onClick={() => { router.push('/settings'); setUserOpen(false) }} />
                  <MenuItem icon={Settings} label="Preferences" onClick={() => { router.push('/settings'); setUserOpen(false) }} />
                  <MenuItem icon={Bell} label="Notification settings" />
                  <MenuItem icon={Activity} label="My activity" onClick={() => { router.push('/audit'); setUserOpen(false) }} />
                  <MenuItem icon={KeyRound} label="API keys & sessions" />
                </div>

                <div className="h-px bg-zinc-950/5" />

                {/* Session */}
                <div className="px-1.5 py-1.5">
                  <MenuItem icon={Lock} label="Lock screen" hint="⌘." onClick={() => { setLocked(true); setUserOpen(false) }} />
                  <MenuItem icon={LogOut} label="Sign out" onClick={handleSignOut} />
                </div>

                <div className="border-t border-zinc-950/5 bg-steel-50/40 px-4 py-1.5 text-[10px] text-steel-400">
                  <div className="flex items-center justify-between">
                    <span>Great Wall Gardens</span>
                    <div className="flex items-center gap-1">
                      <a className="hover:text-steel-700" href="#">Terms</a>
                      <span>·</span>
                      <a className="hover:text-steel-700" href="#">Privacy</a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
    </>
  )
}

/* ---- Internal helpers ---- */

function MenuHeader({ label }: { label: string }) {
  return (
    <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-steel-400">{label}</p>
  )
}

function MenuItem({
  icon: Icon, label, hint, onClick, tone, href,
}: {
  icon: typeof User; label: string; hint?: string; onClick?: () => void; tone?: 'danger'; href?: string
}) {
  const cls =
    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs transition hover:bg-steel-50 ' +
    (tone === 'danger' ? 'text-rose-600 hover:bg-rose-50' : 'text-steel-700')
  const iconCls = 'h-3.5 w-3.5 ' + (tone === 'danger' ? 'text-rose-500' : 'text-steel-400')
  const inner = (
    <>
      <Icon className={iconCls} />
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="font-mono text-[10px] text-steel-400">{hint}</span>}
    </>
  )
  if (href) return <a href={href} className={cls}>{inner}</a>
  return <button onClick={onClick} className={cls}>{inner}</button>
}

/* ---- Command Palette ---- */

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const items = useMemo(() => {
    const routes = NAV.flatMap(g =>
      g.items.map(item => ({ group: 'Navigate', label: item.label, hint: g.group, to: item.href }))
    )
    const actions = [
      { group: 'Actions', label: 'Create new notice', hint: 'Compliance', to: '/notices' },
      { group: 'Actions', label: 'Upload documents', hint: 'Compliance', to: '/documents' },
      { group: 'Actions', label: 'Start reading run', hint: 'Utilities', to: '/utilities' },
      { group: 'Actions', label: 'Add resident', hint: 'People', to: '/people' },
      { group: 'Actions', label: 'Register vehicle', hint: 'Premium', to: '/vehicles' },
    ]
    const all = [...routes, ...actions]
    if (!q.trim()) return all
    const needle = q.toLowerCase()
    return all.filter((i) => i.label.toLowerCase().includes(needle) || i.hint.toLowerCase().includes(needle))
  }, [q])

  const groups = useMemo(() => {
    const map = new Map<string, typeof items>()
    items.forEach((i) => { const g = map.get(i.group) ?? []; g.push(i); map.set(i.group, g) })
    return Array.from(map.entries())
  }, [items])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-steel-900/40 px-4 pt-24 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-950/10 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-zinc-950/5 px-4 py-3">
          <Search className="h-4 w-4 text-steel-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && items[0]) { router.push(items[0].to); onClose() }
              if (e.key === 'Escape') onClose()
            }}
            placeholder="Search pages, actions, people, documents…"
            className="flex-1 bg-transparent text-sm text-steel-900 placeholder:text-steel-400 focus:outline-none"
          />
          <kbd className="rounded border border-zinc-950/10 bg-steel-50 px-1.5 py-0.5 font-mono text-[10px] text-steel-500">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {groups.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-steel-400">No matches for &ldquo;{q}&rdquo;</p>
          )}
          {groups.map(([group, gItems]) => (
            <div key={group} className="mb-2">
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-steel-400">{group}</p>
              {gItems.slice(0, 8).map((i) => (
                <button
                  key={group + i.label}
                  onClick={() => { router.push(i.to); onClose() }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-steel-700 hover:bg-emerald-50"
                >
                  <ChevronRight className="h-3 w-3 text-steel-400" />
                  <span className="flex-1 truncate font-medium">{i.label}</span>
                  <span className="text-[10px] text-steel-400">{i.hint}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-zinc-950/5 bg-steel-50/40 px-4 py-2 text-[10px] text-steel-400">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span>Great Wall Gardens · FacilityOS</span>
        </div>
      </div>
    </div>
  )
}

/* ---- Lock Screen ---- */

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { subject } = useAbac()
  const initials = getInitials(subject.name)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const submit = () => {
    if (pin.length >= 4) onUnlock()
    else { setError(true); setTimeout(() => setError(false), 400) }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-steel-900/80 backdrop-blur-md">
      <div className={'w-full max-w-sm rounded-2xl border border-white/10 bg-white/95 p-6 shadow-2xl ' + (error ? 'animate-pulse' : '')}>
        <div className="flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 font-heading text-sm font-bold text-white">{initials}</span>
          <h2 className="mt-3 font-heading text-base font-semibold text-steel-900">Screen locked</h2>
          <p className="mt-1 text-xs text-steel-500">Enter your PIN to resume · {subject.name}</p>
          <input
            type="password"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="••••"
            className="mt-4 w-40 rounded-md border border-zinc-950/10 bg-white px-3 py-2 text-center font-mono text-lg tracking-[0.4em] text-steel-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={submit}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-steel-900 px-4 py-2 text-xs font-semibold text-white hover:bg-steel-800"
          >
            <LogIn className="h-3.5 w-3.5" /> Unlock
          </button>
          <p className="mt-3 text-[10px] text-steel-400">Any PIN with 4+ digits unlocks the screen</p>
        </div>
      </div>
    </div>
  )
}
