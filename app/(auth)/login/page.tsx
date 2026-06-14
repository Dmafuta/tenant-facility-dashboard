'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const [mode, setMode]           = useState<Mode>('password')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    if (mode === 'magic') {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
      setLoading(false)
      if (err) { setError(err.message); return }
      setMagicSent(true)
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) { setError(err.message); return }
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-xl">G</div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Green Valley Estate</p>
            <p className="text-primary-200 text-xs">Facility Management Portal</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <div className="space-y-3">
            {[
              { icon: '🏠', title: 'Property Management',   desc: 'Manage units, leases, and residents from one place' },
              { icon: '💰', title: 'Automated Billing',      desc: 'Charges, utilities, and M-Pesa payments built in'   },
              { icon: '🔐', title: 'Access Control',         desc: 'Gate management and visitor logs in real time'      },
              { icon: '📊', title: 'Reports & Analytics',    desc: 'Occupancy, revenue, and maintenance insights'       },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 bg-white/10 backdrop-blur rounded-xl p-3.5">
                <span className="text-xl">{f.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{f.title}</p>
                  <p className="text-primary-200 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-primary-200 text-xs">
            © {new Date().getFullYear()} Green Valley Estate. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow">G</div>
            <span className="text-base font-semibold text-text">Green Valley Estate</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text mb-1">Welcome back</h1>
            <p className="text-sm text-text-muted">Sign in to your facility portal</p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-hover p-1 mb-6">
            <button
              onClick={() => { setMode('password'); setMagicSent(false); setError('') }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'password' ? 'bg-surface dark:bg-dark-card text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
            >
              🔑 Password
            </button>
            <button
              onClick={() => { setMode('magic'); setMagicSent(false); setError('') }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'magic' ? 'bg-surface dark:bg-dark-card text-text shadow-sm' : 'text-text-muted hover:text-text'}`}
            >
              ✨ Magic Link
            </button>
          </div>

          {magicSent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-3xl mx-auto mb-4">📬</div>
              <h2 className="text-base font-semibold text-text mb-2">Check your inbox</h2>
              <p className="text-sm text-text-muted mb-6 leading-relaxed">
                We sent a sign-in link to <strong className="text-text">{email}</strong>. Click it to sign in instantly — or enter the 6-digit code below.
              </p>
              <Link
                href={`/verify?email=${encodeURIComponent(email)}`}
                className="inline-block px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm mb-4"
              >
                Enter code instead →
              </Link>
              <br />
              <button
                onClick={() => { setMagicSent(false); setEmail('') }}
                className="text-sm text-primary-600 hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@greenvalley.co.ke"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>

              {mode === 'password' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-text-muted">Password</label>
                    <Link href="#" className="text-xs text-primary-600 hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-sm"
                      tabIndex={-1}
                    >
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {mode === 'magic' ? 'Sending link…' : 'Signing in…'}</>
                ) : (
                  mode === 'magic' ? '✨ Send Magic Link' : '→ Sign In'
                )}
              </button>

              {mode === 'password' && (
                <p className="text-center text-xs text-text-muted pt-1">
                  Secured with 256-bit encryption. Authorised personnel only.
                </p>
              )}
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-surface-border dark:border-dark-border">
            <p className="text-center text-xs text-text-muted leading-relaxed">
              🔒 Secured with 256-bit encryption · Access is restricted to authorised personnel only.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
