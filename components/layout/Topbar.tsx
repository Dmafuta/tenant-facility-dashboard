'use client'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { ALERT_NOTIFICATIONS } from '@/lib/mock-data'
import type { AlertNotification, AlertSeverity } from '@/lib/types'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

const SEVERITY_STYLE: Record<AlertSeverity, { dot: string; bg: string; border: string }> = {
  critical: { dot: 'bg-red-500',    bg: 'bg-red-50',    border: 'border-red-100' },
  warning:  { dot: 'bg-amber-400',  bg: 'bg-amber-50',  border: 'border-amber-100' },
  info:     { dot: 'bg-blue-400',   bg: 'bg-blue-50',   border: 'border-blue-100' },
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
      {/* Bell button */}
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

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-10 z-50 w-96 rounded-xl border border-surface-border dark:border-dark-border bg-white dark:bg-dark-surface shadow-xl overflow-hidden">
            {/* Header */}
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
                <button
                  onClick={markAllRead}
                  className="text-xs text-teal-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-[420px] divide-y divide-surface-border dark:divide-dark-border">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-text-muted">
                  <p className="text-2xl mb-2">🔔</p>
                  No alerts
                </div>
              ) : notifications.map(n => {
                const style = SEVERITY_STYLE[n.severity]
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors cursor-pointer',
                      !n.read ? `${style.bg} ${style.border}` : 'hover:bg-surface-muted dark:hover:bg-dark-hover'
                    )}
                    onClick={() => markRead(n.id)}
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
                        <a
                          href={n.link_href}
                          onClick={e => e.stopPropagation()}
                          className="text-[11px] font-medium text-teal-600 hover:underline"
                        >
                          {n.link_label} →
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
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

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="h-14 bg-white dark:bg-dark-surface border-b border-surface-border dark:border-dark-border flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-text truncate">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        <NotificationBell />
      </div>
    </header>
  )
}
