'use client'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { useSidebar } from '@/lib/sidebar-context'
import { useAbac } from '@/lib/abac/context'
import { ALERT_NOTIFICATIONS } from '@/lib/mock-data'
import { logout, toggleTwoFactor, updatePhone } from '@/lib/api/auth'
import { Drawer } from '@/components/ui/Drawer'
import type { AlertNotification, AlertSeverity } from '@/lib/types'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

const SEVERITY_STYLE: Record<AlertSeverity, { dot: string; bg: string; border: string }> = {
  critical: { dot: 'bg-red-500',   bg: 'bg-red-50',   border: 'border-red-100'   },
  warning:  { dot: 'bg-amber-400', bg: 'bg-amber-50', border: 'border-amber-100' },
  info:     { dot: 'bg-blue-400',  bg: 'bg-blue-50',  border: 'border-blue-100'  },
}

const CATEGORY_ICON: Record<AlertNotification['category'], string> = {
  payment_overdue:     '💸',
  lease_expiry:        '📑',
  disconnection_due:   '⚡',
  maintenance_overdue: '🔧',
  low_stock:           '📦',
  water_loss:          '💧',
  inspection_due:      '🔍',
  document_expiry:     '📁',
  breach_escalation:   '⚖',
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(ALERT_NOTIFICATIONS)

  const unread = notifications.filter(n => !n.read)
  const criticalCount = unread.filter(n => n.severity === 'critical').length

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }
  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread.length > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white',
            criticalCount > 0 ? 'bg-red-500' : 'bg-amber-400'
          )}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Notification dropdown — full width on mobile, fixed width on desktop */}
          <div className="absolute right-0 top-10 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-xl border border-surface-border dark:border-dark-border bg-white dark:bg-dark-surface shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text">Alerts</h3>
                {unread.length > 0 && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                    {unread.length} unread
                  </span>
                )}
              </div>
              {unread.length > 0 && (
                <button onClick={markAllRead} className="text-xs text-teal-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[60vh] divide-y divide-surface-border dark:divide-dark-border">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-text-muted">
                  <p className="text-2xl mb-2">🔔</p>No alerts
                </div>
              ) : notifications.map(n => {
                const style = SEVERITY_STYLE[n.severity]
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors cursor-pointer',
                      !n.read ? `${style.bg} ${style.border}` : 'hover:bg-surface-muted dark:hover:bg-dark-hover'
                    )}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      <span className="text-base">{CATEGORY_ICON[n.category]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-xs font-semibold truncate', !n.read ? 'text-text' : 'text-text-muted')}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn('h-2 w-2 rounded-full flex-shrink-0', style.dot)} />
                          {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-text-muted">
                          {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <a href={n.link_href} onClick={e => e.stopPropagation()} className="text-[11px] font-medium text-teal-600 hover:underline">
                          {n.link_label} →
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-4 py-2.5 border-t border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card">
              <a href="/audit" className="block text-center text-xs text-teal-600 hover:underline">
                View full audit trail →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function formatRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const ROLE_COLORS: Record<string, string> = {
  facility_manager:       'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  finance_officer:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  maintenance_supervisor: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300',
  security_officer:       'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300',
  receptionist:           'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  owner:                  'bg-sky-100    text-sky-700    dark:bg-sky-900/30    dark:text-sky-300',
}

// ── Profile Drawer ────────────────────────────────────────────────────────────

function ProfileDrawer({ open, onClose, name, role, email, phone: initialPhone, twoFactorEnabled: initialTfa }: {
  open: boolean; onClose: () => void; name: string; role: string; email?: string; phone?: string; twoFactorEnabled?: boolean
}) {
  const [fullName, setFullName]       = useState(name)
  const [phone, setPhone]             = useState(initialPhone ?? '')
  const [currentPwd, setCurrentPwd]   = useState('')
  const [newPwd, setNewPwd]           = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')
  const [tfa, setTfa]                 = useState(!!initialTfa)
  const [tfaLoading, setTfaLoading]   = useState(false)

  async function handleTfaToggle() {
    setTfaLoading(true)
    try {
      const next = !tfa
      await toggleTwoFactor(next)
      setTfa(next)
    } catch {
      // silent — toggle reverts to current state
    } finally {
      setTfaLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPwd && newPwd !== confirmPwd) { setError('New passwords do not match.'); return }
    if (newPwd && newPwd.length < 8)     { setError('Password must be at least 8 characters.'); return }
    setSaving(true)
    try {
      await updatePhone(phone)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const initials = getInitials(fullName || name)

  return (
    <Drawer open={open} onClose={onClose} title="Edit Profile" width="w-[400px]">
      <form onSubmit={handleSave} className="p-5 space-y-6">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {initials}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-text">{name}</p>
            <span className={cn('mt-1 inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full', ROLE_COLORS[role] ?? ROLE_COLORS.facility_manager)}>
              {formatRole(role)}
            </span>
          </div>
        </div>

        <div className="h-px bg-surface-border dark:bg-dark-border" />

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>

        {/* Email — read only */}
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">Email address</label>
          <input
            type="email"
            value={email ?? ''}
            readOnly
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-hover text-sm text-text-muted cursor-not-allowed"
          />
          <p className="mt-1 text-[11px] text-text-muted">Email cannot be changed here.</p>
        </div>

        {/* Phone number */}
        <div>
          <label className="block text-xs font-semibold text-text-muted mb-1.5">Phone number (for SMS 2FA)</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+254700000000"
            className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
          <p className="mt-1 text-[11px] text-text-muted">Used to receive OTP codes via SMS when 2FA is enabled.</p>
        </div>

        <div className="h-px bg-surface-border dark:bg-dark-border" />

        {/* 2FA toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">Two-factor authentication</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {tfa ? 'OTP required after password login.' : 'Enable for extra security.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleTfaToggle}
            disabled={tfaLoading}
            className={cn(
              'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50',
              tfa ? 'bg-primary-600' : 'bg-surface-border dark:bg-dark-border'
            )}
            role="switch" aria-checked={tfa}
          >
            <span className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
              tfa ? 'translate-x-4' : 'translate-x-0'
            )} />
          </button>
        </div>

        <div className="h-px bg-surface-border dark:bg-dark-border" />

        {/* Change password */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Change Password</p>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">Current password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
              <button type="button" onClick={() => setShowPwd(s => !s)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text">
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">New password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">Confirm new password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {error && <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}
        {saved && <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">✓ Profile updated successfully.</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          {saving
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
            : 'Save Changes'}
        </button>
      </form>
    </Drawer>
  )
}

// ── Dark mode toggle ──────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const enabled = stored === 'dark' || (!stored && prefersDark)
    setDark(enabled)
    document.documentElement.classList.toggle('dark', enabled)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return { dark, toggle }
}

// ── User Menu ─────────────────────────────────────────────────────────────────

function UserMenu() {
  const { subject }               = useAbac()
  const [open, setOpen]           = useState(false)
  const [profileOpen, setProfile] = useState(false)
  const [signingOut, setSignOut]  = useState(false)
  const { dark, toggle }          = useDarkMode()
  const menuRef                   = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    setSignOut(true)
    await logout()
    window.location.href = '/login'
  }

  const initials = getInitials(subject.name)

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Avatar button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
          aria-label="User menu"
        >
          <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <span className="hidden sm:block text-sm font-medium text-text max-w-[120px] truncate">
            {subject.name}
          </span>
          <svg className={cn('hidden sm:block w-3.5 h-3.5 text-text-muted transition-transform', open && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-surface-border dark:border-dark-border bg-white dark:bg-dark-surface shadow-xl overflow-hidden">

            {/* Identity */}
            <div className="px-4 py-3.5 border-b border-surface-border dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{subject.name}</p>
                  <span className={cn('mt-0.5 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full', ROLE_COLORS[subject.role] ?? ROLE_COLORS.facility_manager)}>
                    {formatRole(subject.role)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); setProfile(true) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors text-left"
              >
                <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Edit Profile
              </button>

              <div className="h-px bg-surface-border dark:bg-dark-border mx-3 my-1" />

              {/* Dark mode toggle */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                  <span className="text-sm text-text">Dark mode</span>
                </div>
                <button
                  onClick={toggle}
                  className={cn(
                    'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
                    dark ? 'bg-primary-600' : 'bg-surface-border dark:bg-dark-border'
                  )}
                  role="switch" aria-checked={dark}
                >
                  <span className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
                    dark ? 'translate-x-4' : 'translate-x-0'
                  )} />
                </button>
              </div>

              <div className="h-px bg-surface-border dark:bg-dark-border mx-3 my-1" />

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left disabled:opacity-50"
              >
                {signingOut
                  ? <span className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                }
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        )}
      </div>

      <ProfileDrawer
        open={profileOpen}
        onClose={() => setProfile(false)}
        name={subject.name}
        role={subject.role}
        email={subject.email}
        phone={subject.phone}
        twoFactorEnabled={subject.twoFactorEnabled}
      />
    </>
  )
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { toggleMobile } = useSidebar()

  return (
    <header className="h-14 bg-white dark:bg-dark-surface border-b border-surface-border dark:border-dark-border flex items-center px-4 gap-3 flex-shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggleMobile}
        className="lg:hidden flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-text truncate">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted truncate">{subtitle}</p>}
      </div>

      {/* Actions + bell */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
