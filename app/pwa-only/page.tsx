'use client'
import { useEffect } from 'react'
import { Smartphone, ArrowLeft } from 'lucide-react'
import { logout } from '@/lib/api/auth'

export default function PwaOnlyPage() {
  // Auto-clear the session so they don't stay logged in to the dashboard
  useEffect(() => {
    logout().catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
          <Smartphone className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-text">PWA Access Only</h1>
          <p className="text-sm text-text-muted leading-relaxed">
            Your account is set up for the <strong>Meter Reading PWA</strong>.
            Please use the mobile app to submit readings — this dashboard is not
            available for your role.
          </p>
        </div>

        <div className="rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card p-4 text-sm text-text-muted text-left space-y-1">
          <p className="font-medium text-text text-xs uppercase tracking-wide">How to access</p>
          <p>Open the meter reading app on your mobile device and sign in with your credentials.</p>
        </div>

        <a
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </a>
      </div>
    </div>
  )
}
